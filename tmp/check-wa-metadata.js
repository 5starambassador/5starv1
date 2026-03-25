
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const log = await prisma.whatsAppLog.findFirst({
            where: {
                refId: '18',
                status: 'SENT'
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!log) {
            console.log('No recent SENT logs for Campaign #18.')
        } else {
            console.log('--- WhatsAppLog Sample ---')
            console.log(`ID: ${log.id}`)
            console.log(`Mobile: ${log.mobile}`)
            console.log(`Status: ${log.status}`)
            console.log('Metadata:', JSON.stringify(log.metadata, null, 2))
        }
    } catch (e) {
        console.error('Error:', e)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
