const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findExperts() {
    const names = ['Saravanan', 'Thirumoorthi', 'Jayalakshmi']
    const results = []
    for (const name of names) {
        const users = await prisma.user.findMany({
            where: { fullName: { contains: name, mode: 'insensitive' } },
            select: { userId: true, fullName: true, mobileNumber: true, confirmedReferralCount: true }
        })
        results.push(...users)
    }
    console.log('RESULTS_START')
    console.log(JSON.stringify(results, null, 2))
    console.log('RESULTS_END')
}

findExperts().catch(console.error).finally(() => prisma.$disconnect())
