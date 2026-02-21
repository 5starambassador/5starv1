
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Listing all ActivityLogs for module: WEBHOOK or action: WEBHOOK');

    const logs = await prisma.activityLog.findMany({
        where: {
            OR: [
                { module: { contains: 'WEBHOOK' } },
                { action: { contains: 'WEBHOOK' } },
                { description: { contains: 'Webhook' } }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    console.log(`Found ${logs.length} logs.`);
    logs.forEach(l => {
        console.log(`[${l.createdAt}] ${l.module} - ${l.action}: ${l.description}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
