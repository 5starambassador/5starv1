
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const count = await prisma.whatsAppLog.count({
            where: {
                refId: '18',
                status: 'SENT'
            }
        })
        console.log(`Total 'SENT' messages for Campaign #18: ${count}`)
        
        const latest = await prisma.whatsAppLog.findFirst({
            where: { refId: '18' },
            orderBy: { createdAt: 'desc' }
        })
        if (latest) {
            console.log(`Latest log timestamp: ${latest.createdAt}`)
        }
    } catch (e) {
        console.error('Error:', e)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
