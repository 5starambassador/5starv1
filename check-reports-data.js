const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Database Check for Reports ---')

    const totalUsers = await prisma.user.count()
    console.log('Total Users:', totalUsers)

    const fiveStarUsers = await prisma.user.count({
        where: { isFiveStarMember: true }
    })
    console.log('Users with isFiveStarMember: true ->', fiveStarUsers)

    const referrals = await prisma.referralLead.count()
    console.log('Total Referrals:', referrals)

    const confirmedReferrals = await prisma.referralLead.count({
        where: { leadStatus: 'Confirmed' }
    })
    console.log('Confirmed Referrals:', confirmedReferrals)

    if (fiveStarUsers > 0) {
        const sample = await prisma.user.findFirst({
            where: { isFiveStarMember: true },
            select: { fullName: true, assignedCampus: true }
        })
        console.log('Sample Five Star User:', sample)
    } else {
        console.log('NO FIVE STAR USERS FOUND!')
        const firstUser = await prisma.user.findFirst({
            select: { fullName: true, isFiveStarMember: true }
        })
        console.log('First User in DB:', firstUser)
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
