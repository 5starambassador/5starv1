import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- LATEST WHATSAPP LOGS (FULL CONTENT) ---')
    const logs = await prisma.whatsAppLog.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
    })

    logs.forEach(l => {
        console.log(`\n[ID: ${l.id}] Time: ${l.createdAt.toLocaleTimeString()}`)
        console.log(`Mobile: ${l.mobile}`)
        console.log(`Content: ${l.content}`)
        console.log(`Type: ${l.type}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
