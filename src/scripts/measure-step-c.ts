import prisma from '../lib/prisma'

async function runDiagnostic() {
    console.log('--- Step C Profiler ---')

    try {
        const refUsers = await prisma.referralLead.findMany({
            where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
            select: { userId: true },
            distinct: ['userId']
        })
        const eligibleUserIds = Array.from(new Set(refUsers.map(r => r.userId)))
        const allLeads = await prisma.referralLead.findMany({
            where: { 
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                userId: { in: eligibleUserIds }
            },
            select: { userId: true },
            take: 50000
        })
        const uniqueUserIds = Array.from(new Set(allLeads.map(l => l.userId)))
        console.log(`Number of unique user IDs: ${uniqueUserIds.length}`)

        // 1. prisma.user.findMany
        let start = Date.now()
        const users = await prisma.user.findMany({ where: { userId: { in: uniqueUserIds } } })
        console.log(`1. prisma.user.findMany: ${Date.now() - start}ms (fetched ${users.length} users)`)

        // 2. prisma.benefitSlab.findMany
        start = Date.now()
        const slabs = await prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } })
        console.log(`2. prisma.benefitSlab.findMany: ${Date.now() - start}ms (fetched ${slabs.length} slabs)`)

        // 3. prisma.gradeFee.findMany
        start = Date.now()
        const gradeFees = await prisma.gradeFee.findMany({ where: { academicYear: '2026-2027' } })
        console.log(`3. prisma.gradeFee.findMany: ${Date.now() - start}ms (fetched ${gradeFees.length} grade fees)`)

        // 4. prisma.campus.findMany
        start = Date.now()
        const campuses = await prisma.campus.findMany({ select: { id: true, campusName: true } })
        console.log(`4. prisma.campus.findMany: ${Date.now() - start}ms (fetched ${campuses.length} campuses)`)

    } catch (error: any) {
        console.error('Error in Step C profiling:', error)
    } finally {
        await prisma.$disconnect()
        console.log('--- Step C Profiler Finished ---')
    }
}

runDiagnostic()
