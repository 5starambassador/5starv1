const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Audit Log Module Distribution ---')

    // Get distinct modules and their counts
    const modules = await prisma.activityLog.groupBy({
        by: ['module'],
        _count: { module: true }
    })

    console.log('Modules in DB:')
    modules.forEach(m => {
        console.log(`- "${m.module}": ${m._count.module} logs`)
    })

    console.log('\n--- Sample Logs ---')
    const samples = await prisma.activityLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { module: true, action: true, description: true }
    })
    samples.forEach(s => {
        console.log(`[${s.module}] ${s.action}: ${s.description}`)
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
