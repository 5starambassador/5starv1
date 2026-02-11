
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // IDs from previous audit
    const targetLeadIds = [
        627, // Lakshmi
        744, // Dilakshi.G
        745, // Test
        755, // Aric Jeffrin Paul
        754, // Faaz
        743, // Harshita Jain
        742, // Ridhi Jain
        676  // K S Heman
    ]

    const leads = await prisma.referralLead.findMany({
        where: { leadId: { in: targetLeadIds } },
        include: { user: true } // Include ambassador info
    })

    console.log('--- RECREATING MISSING STUDENT RECORDS ---')

    for (const lead of leads) {
        console.log(`\nProcessing Lead #${lead.leadId}: ${lead.studentName}`)

        // 1. Double check existence
        const existing = await prisma.student.findFirst({
            where: { referralLeadId: lead.leadId }
        })

        if (existing) {
            console.log(`Skipping: Student record already exists (ID: ${existing.studentId})`)
            continue
        }

        // 2. Resolve Campus ID
        let campusId = lead.campusId
        if (!campusId && lead.campus) {
            const c = await prisma.campus.findUnique({ where: { campusName: lead.campus } })
            if (c) campusId = c.id
        }

        if (!campusId) {
            console.log(`❌ FAILED: Could not resolve Campus ID for '${lead.campus}'`)
            continue
        }

        // 3. Resolve Parent User
        let parent = await prisma.user.findUnique({
            where: { mobileNumber: lead.parentMobile }
        })

        if (!parent) {
            console.log(`Creating Parent User for mobile ${lead.parentMobile}...`)
            // Generate simple referral code if needed
            parent = await prisma.user.create({
                data: {
                    fullName: lead.parentName,
                    mobileNumber: lead.parentMobile,
                    role: 'Parent',
                    referralCode: `P${Math.floor(1000 + Math.random() * 9000)}${lead.parentMobile.slice(-4)}`,
                    childInAchariya: true,
                    status: 'Active',
                    confirmedReferralCount: 0,
                    yearFeeBenefitPercent: 0,
                    longTermBenefitPercent: 0
                }
            })
        }

        // 4. Create Student
        try {
            const student = await prisma.student.create({
                data: {
                    fullName: lead.studentName || 'Unknown',
                    parentId: parent.userId,
                    campusId: campusId,
                    grade: lead.gradeInterested || 'Unknown',
                    status: 'Active',
                    baseFee: 0, // Admin can fix later
                    discountPercent: parent.yearFeeBenefitPercent || 0,
                    referralLeadId: lead.leadId,
                    ambassadorId: lead.userId,
                    academicYear: lead.admittedYear || '2025-2026',
                    createdAt: lead.createdAt // Keep original timestamp if possible, or new
                }
            })
            console.log(`✅ SUCCESS: Created Student #${student.studentId} (${student.fullName})`)
        } catch (e) {
            console.error(`❌ ERROR creating student for lead #${lead.leadId}:`, e.message)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
