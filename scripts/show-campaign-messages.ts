import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- RECENT CAMPAIGN MESSAGES (TOP 5) ---\n');

    const logs = await prisma.whatsAppLog.findMany({
        where: {
            refId: { startsWith: 'camp_' }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    if (logs.length === 0) {
        console.log('No recent campaign messages found.');
        return;
    }

    logs.forEach((log, index) => {
        const metadata = (log.metadata as any) || {};
        console.log(`${index + 1}. RECIPIENT: ${log.mobile}`);
        console.log(`   STATUS: ${log.status}`);
        console.log(`   TIME: ${log.createdAt.toLocaleString()}`);
        console.log(`   TEMPLATE: ${log.template}`);
        if (metadata.deliveredAt) console.log(`   DELIVERED AT: ${new Date(metadata.deliveredAt).toLocaleString()}`);
        if (metadata.readAt) console.log(`   READ AT: ${new Date(metadata.readAt).toLocaleString()}`);
        console.log(`   CONTENT: ${log.content.substring(0, 100)}${log.content.length > 100 ? '...' : ''}`);
        console.log('-------------------------------------------\n');
    });
}

main().finally(() => prisma.$disconnect());
