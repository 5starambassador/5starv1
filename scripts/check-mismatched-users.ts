import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkUsers() {
    const mobiles = ['9962038560', '7904422421', '9500651571', '9787311499']
    const users = await prisma.user.findMany({
        where: { mobileNumber: { in: mobiles } },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            childInAchariya: true,
            benefitStatus: true,
            childName: true,
            childEprNo: true,
            status: true,
            role: true
        }
    })

    console.log('User Data Check:')
    console.table(users)

    // Check counts using the filters in getPendingVerifications
    const pendingCount = await prisma.user.count({
        where: {
            OR: [
                { benefitStatus: 'PendingVerification' },
                { AND: [{ benefitStatus: 'Pending' }, { childEprNo: { not: null } }] }
            ]
        }
    })
    console.log('Total Pending in DB (Current Filter):', pendingCount)

    const verifiedInAchariyaCount = await prisma.user.count({
        where: { childInAchariya: true }
    })
    console.log('Total childInAchariya: true in DB:', verifiedInAchariyaCount)

    const activeBenefitCount = await prisma.user.count({
        where: { benefitStatus: 'Active' }
    })
    console.log('Total benefitStatus: Active in DB:', activeBenefitCount)
}

checkUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
