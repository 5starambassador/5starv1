import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const c = await prisma.campaign.findUnique({ where: { id: 34 } });
    if (!c) {
        console.log('Campaign 34 not found');
    } else {
        console.log('--- Campaign 34 Audit ---');
        console.log('Name:', c.name);
        console.log('TargetAudience:', JSON.stringify(c.targetAudience, null, 2));
        console.log('WA Mapping:', JSON.stringify(c.waVariableMapping, null, 2));
        console.log('WA Template:', c.waTemplateName);
    }
    await prisma.$disconnect();
}

check();
