const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function audit() {
    console.log('--- Database Audit ---')

    // 1. Cleanup Dummy Data for Sangeetha
    const deletedLeads = await prisma.referralLead.deleteMany({
        where: {
            userId: 1161,
            parentName: { startsWith: 'Historic Ref' }
        }
    })
    const deletedCurrent = await prisma.referralLead.deleteMany({
        where: {
            userId: 1161,
            parentName: 'New Ref 2025'
        }
    })
    console.log(`✅ Deleted ${deletedLeads.count + deletedCurrent.count} dummy leads for Sangeetha.`)

    // Reset Sangeetha's count (back to real data)
    await prisma.user.update({
        where: { userId: 1161 },
        data: { confirmedReferralCount: 0, isFiveStarMember: false }
    })
    console.log('✅ Reset Sangeetha to 0 (Real state).')

    // 2. Search for Users with real confirmed counts
    const ambassadors = await prisma.user.findMany({
        where: { confirmedReferralCount: { gt: 0 } },
        select: { userId: true, fullName: true, confirmedReferralCount: true, role: true }
    })
    console.log(`Ambassadors with confirmedReferralCount > 0:`, JSON.stringify(ambassadors, null, 2))

    // 3. Search for Students with Ambassador links
    const students = await prisma.student.findMany({
        where: { ambassadorId: { not: null } },
        select: { studentId: true, fullName: true, ambassadorId: true, academicYear: true }
    })
    console.log(`Students with recorded Ambassador links:`, JSON.stringify(students.slice(0, 10), null, 2))
    console.log(`Total Students with Ambassador links: ${students.length}`)

    // 4. Search for ReferralLeads (excluding my dummies which are now gone)
    const leads = await prisma.referralLead.findMany({
        take: 10,
        select: { leadId: true, parentName: true, userId: true, leadStatus: true }
    })
    console.log(`Recent ReferralLeads:`, JSON.stringify(leads, null, 2))
    console.log(`Total ReferralLeads: ${await prisma.referralLead.count()}`)
}

audit().catch(console.error).finally(() => prisma.$disconnect())
