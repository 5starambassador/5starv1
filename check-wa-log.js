const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkLog() {
    const mobile = '9442266704'
    const logs = await prisma.whatsAppLog.findMany({
        where: { mobile: { contains: mobile } },
        orderBy: { createdAt: 'desc' },
        take: 5
    })
    console.log(JSON.stringify(logs, null, 2))
    await prisma.$disconnect()
}

checkLog()
