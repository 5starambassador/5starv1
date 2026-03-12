const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listTemplates() {
    const configs = await prisma.whatsAppConfig.findMany({
        select: { id: true, templateName: true }
    })
    
    configs.forEach(c => {
        console.log(`ID: ${c.id} | NAME: [${c.templateName}]`)
    })
    
    await prisma.$disconnect()
}

listTemplates()
