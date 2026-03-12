const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkRecentLogs() {
    const logs = await prisma.whatsAppLog.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }, // Last 30 mins
        orderBy: { createdAt: 'desc' },
        take: 10
    })
    console.log(JSON.stringify(logs, null, 2))
    await prisma.$disconnect()
}

checkRecentLogs()
