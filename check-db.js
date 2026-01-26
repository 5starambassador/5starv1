const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    const users = await prisma.user.findMany({
        where: {
            isFiveStarMember: true,
            confirmedReferralCount: { lt: 5 }
        },
        select: { userId: true, fullName: true, confirmedReferralCount: true, isFiveStarMember: true }
    })
    console.log('Users with 5-Star flag but < 5 confirmed referrals:', JSON.stringify(users, null, 2))
}

check().catch(console.error).finally(() => prisma.$disconnect())
