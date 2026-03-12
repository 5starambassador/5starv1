const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkConfig() {
    const configs = await prisma.whatsAppConfig.findMany()
    console.log('WhatsApp Configs:', JSON.stringify(configs, null, 2))
    await prisma.$disconnect()
}

checkConfig()
