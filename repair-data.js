const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function repair() {
    const userId = 1161 // Sangeetha

    console.log('--- Correcting confirmedReferralCount for Sangeetha (1161) ---')

    // Total should be 5 (historic) + 1 (current) = 6
    await prisma.user.update({
        where: { userId },
        data: {
            confirmedReferralCount: 6,
            isFiveStarMember: true
        }
    })
    console.log('✅ Updated confirmedReferralCount to 6.')
}

repair().catch(console.error).finally(() => prisma.$disconnect())
