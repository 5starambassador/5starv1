const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkExact() {
    const mobile = '9442266704'
    const log = await prisma.whatsAppLog.findFirst({
        where: { mobile: { contains: mobile } },
        orderBy: { createdAt: 'desc' }
    })
    
    if (log) {
        console.log('LOG TEMPLATE NAME:', `!${log.template}!`)
    }
    
    const config = await prisma.whatsAppConfig.findFirst({
        where: { id: 14 }
    })
    if (config) {
        console.log('CONFIG TEMPLATE NAME:', `!${config.templateName}!`)
    }
    
    await prisma.$disconnect()
}

checkExact()
