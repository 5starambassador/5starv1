import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.whatsAppConfig.update({
        where: { eventKey: 'REFEERAL_FOLLOWUP_01' },
        data: { requiredVariablesCount: 2 }
    });
    console.log('Successfully set REFEERAL_FOLLOWUP_01 requiredVariablesCount back to 2');
    console.log(JSON.stringify(updated, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
