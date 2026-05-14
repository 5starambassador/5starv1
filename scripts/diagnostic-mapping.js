
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMapping() {
    const lastCampaign = await prisma.campaign.findFirst({
        orderBy: { createdAt: 'desc' }
    })
    
    console.log('--- LATEST CAMPAIGN ---')
    console.log('ID:', lastCampaign.id)
    console.log('Template:', lastCampaign.waTemplateName)
    console.log('Mapping:', JSON.stringify(lastCampaign.waVariableMapping, null, 2))
    
    const lastLog = await prisma.whatsAppLog.findFirst({
        orderBy: { createdAt: 'desc' }
    })
    
    console.log('\n--- LATEST LOG ---')
    console.log('Recipient:', lastLog.recipient)
    console.log('Variables:', lastLog.variables)
    
    await prisma.$disconnect()
}

checkMapping()
