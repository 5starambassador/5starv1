const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function auditCampaigns() {
    const campaigns = await prisma.campaign.findMany({
        orderBy: { lastRunAt: 'desc' }
    })
    
    console.log(`--- CAMPAIGN AUDIT ---`)
    campaigns.forEach(c => {
        console.log(`Campaign: [${c.name}] | ID: ${c.id} | Status: ${c.status} | Last Run: ${c.lastRunAt}`)
    })

    const logs = await prisma.campaignLog.findMany({
        take: 5,
        orderBy: { runAt: 'desc' }
    })
    console.log(`\n--- RECENT CAMPAIGN LOGS ---`)
    logs.forEach(l => {
        console.log(`Log ID: ${l.id} | Campaign: ${l.campaignId} | Status: ${l.status} | Sent: ${l.sentCount} | WHATSAPP Sent: ${l.whatsappSent}`)
    })
    
    await prisma.$disconnect()
}

auditCampaigns()
