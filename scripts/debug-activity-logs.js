
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orderId = 'ORDER_1771047775720_7101';
    console.log(`Checking ActivityLog for order: ${orderId}`);

    const logs = await prisma.activityLog.findMany({
        where: {
            OR: [
                { targetId: orderId },
                { description: { contains: orderId } },
                { module: 'PAYMENT' }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    console.log(`Found ${logs.length} relevant logs.`);
    logs.forEach(l => {
        console.log(`[${l.createdAt}] ${l.module} - ${l.action}: ${l.description}`);
        if (l.metadata) {
            console.log(`  Metadata: ${JSON.stringify(l.metadata).substring(0, 200)}`);
        }
    });

    // Also check for any Webhook errors specifically
    console.log(`\nChecking for Webhook errors...`);
    const webhookLogs = await prisma.activityLog.findMany({
        where: {
            module: 'WEBHOOK',
            action: 'ERROR'
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    webhookLogs.forEach(l => {
        console.log(`[${l.createdAt}] WEBHOOK ERROR: ${l.description}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
