import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const campaignId = 28;
    const example = await prisma.campaignRecipient.findFirst({ where: { campaignId } });
    console.log('Example recipient mobile:', example?.mobile);
    const with91 = await prisma.campaignRecipient.count({ where: { campaignId, mobile: { startsWith: '91' } } });
    console.log('Count with 91:', with91);
    const total = await prisma.campaignRecipient.count({ where: { campaignId } });
    console.log('Total:', total);
    
    // Check some WhatsAppLog ones too
    const waLog = await prisma.whatsAppLog.findFirst({ where: { refId: 'camp_28_1774921776848' } });
    console.log('Example WhatsAppLog mobile:', waLog?.mobile);
}

run().finally(() => prisma.$disconnect());
