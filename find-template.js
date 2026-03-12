const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findTemplate() {
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'activate_your_account' }
    })
    console.log('Template Config:', JSON.stringify(config, null, 2))
    
    // Also look for other common templates
    const all = await prisma.whatsAppConfig.findMany()
    console.log('All templates:', all.map(t => `${t.templateName} (vars: ${t.requiredVariablesCount})`))
    
    await prisma.$disconnect()
}

findTemplate()
