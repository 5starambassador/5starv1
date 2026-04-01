import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const refId = 'camp_28_1774921776848';
    const logs = await prisma.whatsAppLog.groupBy({
        by: ['status'],
        where: { refId },
        _count: { _all: true }
    });
    console.log('WhatsAppLog Statuses for RefId:', JSON.stringify(logs, null, 2));

    const failedLogs = await prisma.whatsAppLog.findMany({
        where: { refId, status: 'FAILED' },
        take: 5
    });
    console.log('FAILED WhatsAppLog Examples:', JSON.stringify(failedLogs, null, 2));
}

run().finally(() => prisma.$disconnect());
