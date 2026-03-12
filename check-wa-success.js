const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSuccess() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const count = await prisma.whatsAppLog.count({
        where: {
            status: 'DELIVERED',
            createdAt: { gte: today }
        }
    })
    console.log('Delivered today:', count)
    
    const lastLogs = await prisma.whatsAppLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    })
    console.log('Last 10 logs:', JSON.stringify(lastLogs.map(l => ({
        mobile: l.mobile,
        template: l.template,
        status: l.status,
        error: l.errorMessage,
        created: l.createdAt
    })), null, 2))
    
    await prisma.$disconnect()
}

checkSuccess()
