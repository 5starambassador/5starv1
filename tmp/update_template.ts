import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Correcting the filter to use eventKey which is unique
    const updated = await prisma.whatsAppConfig.update({
        where: { eventKey: 'REFEERAL_FOLLOWUP_01' },
        data: { requiredVariablesCount: 5 }
    });
    console.log('Successfully updated REFEERAL_FOLLOWUP_01 requiredVariablesCount to 5');
    console.log(JSON.stringify(updated, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
