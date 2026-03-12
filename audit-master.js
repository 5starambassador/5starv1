const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function masterAudit() {
    console.log('--- 1. TEMPLATE CONFIG AUDIT ---')
    const templates = await prisma.whatsAppConfig.findMany({
        orderBy: { templateName: 'asc' }
    })
    templates.forEach(t => {
        console.log(`ID: ${t.id} | Name: [${t.templateName}] | Vars: ${t.requiredVariablesCount} | Event: ${t.eventKey}`)
    })

    console.log('\n--- 2. STUCK CAMPAIGN AUDIT ---')
    const stuckRecipients = await prisma.campaignRecipient.count({
        where: { channel: 'WHATSAPP', status: 'SENT' }
    })
    console.log(`Recipients stuck in SENT status (WHATSAPP): ${stuckRecipients}`)

    const processingCampaigns = await prisma.campaignLog.findMany({
        where: { status: 'RUNNING' }
    })
    console.log(`Campaigns currently in RUNNING status: ${processingCampaigns.length}`)
    processingCampaigns.forEach(c => {
        console.log(`- Campaign ID: ${c.campaignId} | Started: ${c.runAt}`)
    })

    console.log('\n--- 3. DELIVERY PATTERN AUDIT (TODAY) ---')
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const logsToday = await prisma.whatsAppLog.findMany({
        where: { createdAt: { gte: today } },
        select: { status: true, template: true }
    })
    
    const statusCounts = {}
    logsToday.forEach(l => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1
    })
    console.log('Statuses recorded today:', JSON.stringify(statusCounts, null, 2))

    console.log('\n--- 4. WEBHOOK NORMALIZATION CHECK ---')
    const deliveredLogs = await prisma.whatsAppLog.findFirst({
        where: { status: 'DELIVERED' },
        orderBy: { createdAt: 'desc' }
    })
    console.log('Last DELIVERED log entry:', JSON.stringify(deliveredLogs, null, 2))

    await prisma.$disconnect()
}

masterAudit()
