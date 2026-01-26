import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    const users = await prisma.user.findMany({
        where: { fullName: { contains: 'Sangeetha', mode: 'insensitive' } },
        select: { userId: true, fullName: true, role: true, isFiveStarMember: true, referralCode: true }
    })
    console.log('Users:', JSON.stringify(users, null, 2))

    if (users.length > 0) {
        const userId = users[0].userId
        const referrals = await prisma.referralLead.findMany({
            where: { userId },
            include: { student: true }
        })
        console.log('Referrals for Sangeetha:', JSON.stringify(referrals, null, 2))
    }
}

check().catch(console.error).finally(() => prisma.$disconnect())
