const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function mismatchAudit() {
    const topUsers = await prisma.user.findMany({
        where: { confirmedReferralCount: { gt: 0 } },
        orderBy: { confirmedReferralCount: 'desc' },
        take: 10,
        select: { userId: true, fullName: true, mobileNumber: true, confirmedReferralCount: true }
    })

    console.log('--- Top Users by confirmedReferralCount ---')
    for (const u of topUsers) {
        const leadCount = await prisma.referralLead.count({ where: { userId: u.userId } })
        console.log(`${u.fullName} (ID: ${u.userId}): ConfirmedCount=${u.confirmedReferralCount}, RealLeads=${leadCount}`)
    }
}

mismatchAudit().catch(console.error).finally(() => prisma.$disconnect())
