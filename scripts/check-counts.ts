import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const logs = await prisma.campaignLog.findMany({
        take: 5,
        orderBy: { runAt: 'desc' }
    });

    console.log('--- RECENT CAMPAIGN LOGS ---');
    logs.forEach(l => {
        console.log(`ID: ${l.id} | Campaign: ${l.campaignId} | Sent: ${l.sentCount} | Delivered: ${l.whatsappDelivered} | Read: ${l.whatsappRead} | Status: ${l.status}`);
    });
}

main().finally(() => prisma.$disconnect());
