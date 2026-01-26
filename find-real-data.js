const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findSangeetha() {
    console.log('--- Searching for Sangeetha ---')
    const sangeethas = await prisma.user.findMany({
        where: { fullName: { contains: 'Sangeetha', mode: 'insensitive' } },
        select: { userId: true, fullName: true, confirmedReferralCount: true, referralCode: true, role: true }
    })
    console.log('Found Sangeethas:', JSON.stringify(sangeethas, null, 2))

    if (sangeethas.length > 0) {
        for (const s of sangeethas) {
            const leads = await prisma.referralLead.findMany({
                where: { userId: s.userId },
                include: { student: true }
            })
            console.log(`Leads for ${s.fullName} (ID: ${s.userId}): ${leads.length}`, JSON.stringify(leads, null, 2))
        }
    }

    console.log('--- Searching for top real ambassadors ---')
    const tops = await prisma.user.findMany({
        where: { confirmedReferralCount: { gt: 0 } },
        orderBy: { confirmedReferralCount: 'desc' },
        take: 5
    })
    console.log('Top Ambassadors by count:', JSON.stringify(tops, null, 2))
}

findSangeetha().catch(console.error).finally(() => prisma.$disconnect())
