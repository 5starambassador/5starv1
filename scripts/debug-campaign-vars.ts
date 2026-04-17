import prisma from '../src/lib/prisma';

async function main() {
    console.log('--- 🔍 LATEST CAMPAIGN MAPPINGS ---');
    const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, waVariableMapping: true, waTemplateName: true }
    });

    campaigns.forEach(c => {
        console.log(`Campaign: ${c.name} (#${c.id})`);
        console.log(`Template: ${c.waTemplateName}`);
        console.log(`Mapping:`, JSON.stringify(c.waVariableMapping, null, 2));
        console.log('---');
    });

    console.log('\n--- 🔍 LATEST WHATSAPP LOG ENTRIES ---');
    const logs = await prisma.whatsAppLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, mobile: true, template: true, content: true, metadata: true }
    });

    logs.forEach(l => {
        console.log(`Log #${l.id} | To: ${l.mobile} | Template: ${l.template}`);
        console.log(`Content: ${l.content}`);
        console.log('---');
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
