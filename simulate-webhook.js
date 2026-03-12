const fetch = require('node-fetch')

async function simulateWebhook() {
    const baseUrl = 'http://localhost:3001' // Dev port
    
    // 1. Get a recent SENT WhatsAppLog entry to use as reference
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    const recentSent = await prisma.whatsAppLog.findFirst({
        where: { status: 'SENT' },
        orderBy: { createdAt: 'desc' }
    })
    
    if (!recentSent) {
        console.log('No SENT messages found to simulate on.')
        return
    }
    
    console.log(`Simulating delivery for RefId: ${recentSent.refId}, Mobile: ${recentSent.mobile}`)

    const payload = [
        {
            "CRQID": recentSent.refId,
            "status": "DELIVERED",
            "mobile": `91${recentSent.mobile}`,
            "custom_ref": recentSent.refId,
            "externalId": recentSent.refId
        }
    ]

    const response = await fetch(`${baseUrl}/api/webhooks/msg91`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    console.log('Webhook Response:', result)
    
    // Verify Update
    const updated = await prisma.whatsAppLog.findUnique({
        where: { id: recentSent.id }
    })
    console.log('Updated Status in DB:', updated.status)
    
    await prisma.$disconnect()
}

simulateWebhook()
