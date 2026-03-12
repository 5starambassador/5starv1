const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDetail() {
    const mobile = '9442266704'
    const log = await prisma.whatsAppLog.findFirst({
        where: { mobile: { contains: mobile } },
        orderBy: { createdAt: 'desc' }
    })
    console.log('Detailed Log:', JSON.stringify(log, null, 2))
    await prisma.$disconnect()
}

checkDetail()
