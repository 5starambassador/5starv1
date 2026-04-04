import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.whatsAppConfig.findUnique({
        where: { eventKey: 'REFEERAL_FOLLOWUP_01' }
    });
    console.log('--- Current Template Config ---');
    console.log(JSON.stringify(config, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
