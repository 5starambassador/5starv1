const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeLogs() {
    const logs = await prisma.whatsAppLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    })
    
    const stats = logs.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1
        return acc
    }, {})
    
    console.log('Stats for last 100 logs:', stats)
    
    const recentFailures = logs.filter(l => l.status === 'FAILED').slice(0, 5)
    if (recentFailures.length > 0) {
        console.log('Recent Failures:', JSON.stringify(recentFailures, null, 2))
    }

    const recentDelivered = logs.filter(l => l.status === 'DELIVERED').slice(0, 2)
    console.log('Recent Delivered:', JSON.stringify(recentDelivered, null, 2))

    await prisma.$disconnect()
}

analyzeLogs()
