const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findDelivered() {
    const delivered = await prisma.whatsAppLog.findFirst({
        where: { status: 'DELIVERED' },
        orderBy: { createdAt: 'desc' }
    })
    console.log('Last Delivered log:', JSON.stringify(delivered, null, 2))
    
    const count = await prisma.whatsAppLog.count({
        where: { status: 'DELIVERED' }
    })
    console.log('Total Delivered count:', count)
    
    await prisma.$disconnect()
}

findDelivered()
