const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCampaigns() {
    const deliveredCount = await prisma.campaignRecipient.count({
        where: { status: 'DELIVERED', channel: 'WHATSAPP' }
    })
    console.log('Total WHATSAPP Delivered Recipients:', deliveredCount)
    
    if (deliveredCount > 0) {
        const lastDelivered = await prisma.campaignRecipient.findFirst({
            where: { status: 'DELIVERED', channel: 'WHATSAPP' },
            orderBy: { deliveredAt: 'desc' }
        })
        console.log('Last Delivered Recipient:', JSON.stringify(lastDelivered, null, 2))
    }
    
    await prisma.$disconnect()
}

checkCampaigns()
