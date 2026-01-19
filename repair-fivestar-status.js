const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Repairing isFiveStarMember Status ---')

    // Find all users who have at least 5 confirmed referrals but are NOT marked as 5-star members
    const eligibleUsers = await prisma.user.findMany({
        where: {
            isFiveStarMember: false,
            confirmedReferralCount: { gte: 5 }
        },
        select: { userId: true, fullName: true, confirmedReferralCount: true }
    })

    console.log(`Found ${eligibleUsers.length} users to update.`)

    for (const user of eligibleUsers) {
        console.log(`Updating ${user.fullName} (${user.confirmedReferralCount} referrals)...`)
        await prisma.user.update({
            where: { userId: user.userId },
            data: { isFiveStarMember: true }
        })
    }

    console.log('--- Repair Complete ---')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
