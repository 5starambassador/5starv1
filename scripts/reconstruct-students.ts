import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🏗️ Starting Student Reconstruction from Referral Leads...')

    // 1. Fetch all Confirmed Referral Leads
    const leads = await prisma.referralLead.findMany({
        where: {
            leadStatus: 'Confirmed',
            student: { is: null } // Only those without a linked student
        },
        include: {
            user: true // The Ambassador
        }
    })

    console.log(`found ${leads.length} confirmed leads without student records.`)

    if (leads.length === 0) {
        console.log('✅ No missing student records found.')
        return
    }

    // 2. Pre-fetch Campuses for resolution
    const campuses = await prisma.campus.findMany()
    const campusMap = new Map<string, number>()
    campuses.forEach(c => campusMap.set(c.campusName.toLowerCase(), c.id))

    let createdCount = 0
    let skippedCount = 0

    // 3. Process each lead
    for (const lead of leads) {
        try {
            // A. Resolve Campus
            // Try exact match or loose match
            let campusId: number | undefined
            if (lead.campusId) {
                campusId = lead.campusId
            } else if (lead.campus) {
                campusId = campusMap.get(lead.campus.toLowerCase())
                // Fallback: Try partial match if not found
                if (!campusId) {
                    const match = campuses.find(c => lead.campus && c.campusName.toLowerCase().includes(lead.campus.toLowerCase()))
                    if (match) campusId = match.id
                }
            }

            if (!campusId) {
                console.warn(`⚠️ Skipping Lead ID ${lead.leadId}: Campus '${lead.campus}' not found.`)
                skippedCount++
                continue
            }

            // B. Find or Create Parent User
            // We need a parent user to attach the student to.
            let parentUser = await prisma.user.findUnique({
                where: { mobileNumber: lead.parentMobile }
            })

            if (!parentUser) {
                // Create minimal parent user
                parentUser = await prisma.user.create({
                    data: {
                        fullName: lead.parentName,
                        mobileNumber: lead.parentMobile,
                        role: 'Parent',
                        password: '$2b$10$dummyhash', // Placeholder, they should reset
                        childInAchariya: true,
                        status: 'Active',
                        isFiveStarMember: false
                    }
                })
                console.log(`   Created new Parent User: ${lead.parentName} (${lead.parentMobile})`)
            }

            // C. Create Student Record
            const studentName = lead.studentName || lead.parentName + "'s Child"

            await prisma.student.create({
                data: {
                    fullName: studentName,
                    parentId: parentUser.userId,
                    campusId: campusId,
                    grade: lead.gradeInterested || 'Grade 1',
                    ambassadorId: lead.userId, // The referrer
                    referralLeadId: lead.leadId,
                    status: 'Active',
                    admissionNumber: `ADM-${Date.now()}-${lead.leadId}`, // Temp admission number
                    // Timestamps: preserve lead creation if possible, but prisma defaults to now()
                    createdAt: lead.createdAt // Backdate to lead creation
                }
            })

            createdCount++
            // process.stdout.write('.')

        } catch (error) {
            console.error(`❌ Error processing Lead ID ${lead.leadId}:`, error)
        }
    }

    console.log(`\n\n🎉 Reconstruction Complete!`)
    console.log(`Processed: ${leads.length}`)
    console.log(`Created: ${createdCount}`)
    console.log(`Skipped: ${skippedCount}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
