const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function scan() {
    console.log('--- Exhaustive Database Scan ---')

    // 1. All ReferralLeads
    const allLeads = await prisma.referralLead.findMany({
        select: { leadId: true, parentName: true, userId: true, leadStatus: true, studentName: true, confirmedDate: true }
    })
    console.log(`Total ReferralLeads in system: ${allLeads.length}`)
    if (allLeads.length > 0) {
        console.log('Sample Leads:', JSON.stringify(allLeads, null, 2))
    }

    // 2. All Students
    const allStudents = await prisma.student.findMany({
        select: { studentId: true, fullName: true, ambassadorId: true, parentId: true, referralLeadId: true }
    })
    console.log(`Total Students in system: ${allStudents.length}`)
    const studentsWithLinks = allStudents.filter(s => s.ambassadorId !== null || s.referralLeadId !== null)
    console.log(`Students with Ambassador or Lead links: ${studentsWithLinks.length}`)
    if (studentsWithLinks.length > 0) {
        console.log('Sample Linked Students:', JSON.stringify(studentsWithLinks, null, 2))
    }

    // 3. User counts check
    const topAmbassadors = await prisma.user.findMany({
        where: { confirmedReferralCount: { gt: 0 } },
        select: { userId: true, fullName: true, confirmedReferralCount: true }
    })
    console.log('Users with confirmedReferralCount > 0:', JSON.stringify(topAmbassadors, null, 2))
}

scan().catch(console.error).finally(() => prisma.$disconnect())
