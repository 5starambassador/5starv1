import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- WHATSAPP CONFIGURATIONS ---');
    const configs = await prisma.whatsAppConfig.findMany();
    configs.forEach(c => {
        console.log(`Event Key: ${c.eventKey}`);
        console.log(`Template Name: ${c.templateName}`);
        console.log(`Required Variables: ${c.requiredVariablesCount}`);
        console.log(`Enabled: ${c.isEnabled}`);
        console.log(`Description: ${c.description}`);
        console.log('---');
    });
    await prisma.$disconnect();
}

main().catch(console.error);
