const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fullList() {
    const templates = await prisma.whatsAppConfig.findMany({
        orderBy: { templateName: 'asc' }
    })
    
    console.log('--- FULL TEMPLATE LIST ---')
    templates.forEach(t => {
        console.log(`[${t.templateName}] | ID: ${t.id} | Vars: ${t.requiredVariablesCount}`)
    })
    
    await prisma.$disconnect()
}

fullList()
