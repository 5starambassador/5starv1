import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const refId = 'camp_28_1774921776848';
    
    const logs = await prisma.whatsAppLog.findMany({
        where: { refId, status: 'FAILED' },
        select: { mobile: true, metadata: true },
        take: 20
    });
    
    console.log('Examples of FAILED WhatsAppLogs:');
    logs.forEach(l => {
        const error = (l.metadata as any)?.moEngageErrorCode || (l.metadata as any)?.reason || 'Unknown';
        console.log(`Mobile: ${l.mobile}, Error: ${error}`);
    });

    const campaignId = 28;
    const recipients = await prisma.campaignRecipient.findMany({
        where: { campaignId },
        take: 10
    });
    console.log('Example Recipients:', JSON.stringify(recipients.map(r => r.mobile), null, 2));

}

run().finally(() => prisma.$disconnect());
