import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTemplate() {
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'summer_camp_followup_01' }
    });
    console.log('--- Template Config ---');
    console.log(JSON.stringify(config, null, 2));
    
    const c34 = await prisma.campaign.findUnique({ where: { id: 34 } });
    console.log('--- Campaign 34 Mapping ---');
    console.log(JSON.stringify(c34?.waVariableMapping, null, 2));

    await prisma.$disconnect();
}

checkTemplate();
