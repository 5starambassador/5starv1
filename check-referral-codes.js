const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const total = await prisma.user.count()
    const withCode = await prisma.user.count({ where: { referralCode: { not: null } } })
    const nullCode = await prisma.user.count({ where: { referralCode: null } })

    console.log(`Total Users: ${total}`)
    console.log(`With Referral Code: ${withCode}`)
    console.log(`Null Referral Code: ${nullCode}`)

    if (nullCode > 0) {
        const roles = await prisma.user.groupBy({
            by: ['role'],
            _count: { _all: true },
            where: { referralCode: null }
        })
        console.log('\nRoles of users with NULL referral codes:')
        console.log(roles)

        const statuses = await prisma.user.groupBy({
            by: ['status'],
            _count: { _all: true },
            where: { referralCode: null }
        })
        console.log('\nStatuses of users with NULL referral codes:')
        console.log(statuses)

        const samples = await prisma.user.findMany({
            where: { referralCode: null },
            take: 5,
            select: { userId: true, fullName: true, createdAt: true, status: true, mobileNumber: true }
        })
        console.log('\nSample Users with NULL referral codes:')
        console.log(samples)
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
