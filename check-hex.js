const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkHex() {
    const mobile = '9442266704'
    const log = await prisma.whatsAppLog.findFirst({
        where: { mobile: { contains: mobile } },
        orderBy: { createdAt: 'desc' }
    })
    
    if (log) {
        console.log('LOG TEMPLATE:', log.template)
        console.log('LOG TEMPLATE HEX:', Buffer.from(log.template || '').toString('hex'))
    }
    
    const config = await prisma.whatsAppConfig.findFirst({
        where: { id: 14 }
    })
    if (config) {
        console.log('CONFIG TEMPLATE:', config.templateName)
        console.log('CONFIG TEMPLATE HEX:', Buffer.from(config.templateName || '').toString('hex'))
    }
    
    await prisma.$disconnect()
}

checkHex()
