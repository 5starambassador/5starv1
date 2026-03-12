const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function auditTemplates() {
    const templates = await prisma.whatsAppConfig.findMany({
        orderBy: { templateName: 'asc' }
    })
    
    console.log('--- WhatsApp Template Audit ---')
    templates.forEach(t => {
        console.log(`ID: ${t.id} | Name: ${t.templateName} | Vars: ${t.requiredVariablesCount} | Event: ${t.eventKey}`)
    })
    
    await prisma.$disconnect()
}

auditTemplates()
