import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Campaign Data (ID 29) ---');
    const campaign = await prisma.campaign.findUnique({
        where: { id: 29 }
    });
    console.log(JSON.stringify(campaign, null, 2));

    console.log('\n--- Template Config (referral_followup01) ---');
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'referral_followup01' }
    });
    console.log(JSON.stringify(config, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
