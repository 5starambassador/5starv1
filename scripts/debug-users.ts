import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const userIds = [2561, 2562, 3147, 3315, 3385]
    console.log('--- FETCHING LOGS FOR SAMPLE USERS ---')

    const logs = await prisma.activityLog.findMany({
        where: {
            OR: [
                { userId: { in: userIds } },
                { targetId: { in: userIds.map(id => id.toString()) } }
            ]
        },
        orderBy: { createdAt: 'desc' }
    })

    console.log(JSON.stringify(logs, null, 2))

    const users = await prisma.user.findMany({
        where: { userId: { in: userIds } },
        select: {
            userId: true,
            fullName: true,
            role: true,
            academicYear: true,
            createdAt: true,
            status: true
        }
    })
    console.log('--- USER DETAILS ---')
    console.log(JSON.stringify(users, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
