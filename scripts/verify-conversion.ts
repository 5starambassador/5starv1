
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Clean up previous attempts if any
async function cleanup() {
    await prisma.student.deleteMany({
        where: { referralLeadId: 601 }
    })
    console.log('Cleanup complete.')
}

async function verifyConversion() {
    const leadId = 601
    const studentDetails = { studentName: 'Mani' }

    try {
        const lead = await prisma.referralLead.findUnique({
            where: { leadId },
            include: { user: true, student: true }
        })

        if (!lead) throw new Error('Lead not found')
        console.log('Found lead:', lead.parentName)

        // 1. Resolve Campus ID
        let campusId = lead.campusId
        if (!campusId && lead.campus) {
            const campus = await prisma.campus.findUnique({
                where: { campusName: lead.campus }
            })
            if (campus) campusId = campus.id
        }
        console.log('Resolved Campus ID:', campusId)

        // 2. Resolve or Create Parent User
        let parentId: number
        const existingParent = await prisma.user.findUnique({
            where: { mobileNumber: lead.parentMobile }
        })

        if (existingParent) {
            parentId = existingParent.userId
            console.log('Found existing parent:', parentId)
        } else {
            console.log('Creating new parent...')
            const newParent = await prisma.user.create({
                data: {
                    fullName: lead.parentName,
                    mobileNumber: lead.parentMobile,
                    role: 'Parent',
                    referralCode: 'TEST-' + Math.random().toString(36).substring(7).toUpperCase(),
                    childInAchariya: true,
                    status: 'Active',
                    yearFeeBenefitPercent: 0,
                    confirmedReferralCount: 0,
                    isFiveStarMember: false
                }
            })
            parentId = newParent.userId
            console.log('Created new parent:', parentId)
        }

        // 3. Create Student
        console.log('Creating student...')
        const student = await prisma.student.create({
            data: {
                fullName: studentDetails.studentName,
                parentId: parentId,
                ambassadorId: lead.userId,
                campusId: campusId!,
                grade: lead.gradeInterested || 'Unknown',
                referralLeadId: lead.leadId,
                baseFee: 60000,
                discountPercent: lead.user.yearFeeBenefitPercent || 0,
                status: 'Active'
            }
        })

        console.log('Successfully created student:', student.studentId)
        console.log('Relationship verification:')
        const finalStudent = await prisma.student.findUnique({
            where: { studentId: student.studentId },
            include: { parent: true, ambassador: true, campus: true }
        })
        console.log('Student:', finalStudent?.fullName)
        console.log('Parent:', finalStudent?.parent.fullName, 'Mobile:', finalStudent?.parent.mobileNumber)
        console.log('Ambassador:', finalStudent?.ambassador?.fullName)
        console.log('Campus:', finalStudent?.campus.campusName)

    } catch (e) {
        console.error('CONVERSION FAILED:', e)
    } finally {
        await prisma.$disconnect()
    }
}

async function run() {
    await cleanup()
    await verifyConversion()
}

run()
