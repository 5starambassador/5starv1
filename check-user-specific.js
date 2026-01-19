const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking Thirumoorthi R ---')
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: 'Thirumoorthi' } },
        include: { referrals: true }
    })

    if (user) {
        console.log('User Found:', user.fullName)
        console.log('isFiveStarMember:', user.isFiveStarMember)
        console.log('confirmedReferralCount:', user.confirmedReferralCount)
        console.log('Total Referrals:', user.referrals.length)
        const confirmed = user.referrals.filter(r => r.leadStatus === 'Confirmed').length
        console.log('Actual Confirmed in DB:', confirmed)
    } else {
        console.log('User Thirumoorthi not found')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
