import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const campaignId = 28;
    const logs = await prisma.campaignLog.findMany({
        where: { campaignId },
        orderBy: { runAt: 'desc' }
    });
    console.log('All Campaign Logs for #28:', JSON.stringify(logs, null, 2));

    const allRecipients = await prisma.campaignRecipient.groupBy({
        by: ['status', 'errorCode'],
        where: { campaignId },
        _count: { _all: true }
    });
    console.log('Grouped Recipient Statuses:', JSON.stringify(allRecipients, null, 2));
}

run().finally(() => prisma.$disconnect());
