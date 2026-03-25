
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const log = await prisma.whatsAppLog.findFirst({
            where: {
                refId: { contains: 'camp_18_verified_test' }
            }
        })

        if (!log) {
            console.log('No verified test log found.')
        } else {
            console.log('--- Verified Test Log ---')
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
