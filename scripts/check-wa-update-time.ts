import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'summer_camp_followup_01' }
    });
    console.log(JSON.stringify(config, null, 2));
    await prisma.$disconnect();
}

main().catch(console.error);
