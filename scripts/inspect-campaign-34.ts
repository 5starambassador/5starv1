import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- CAMPAIGN 34 DETAILS ---');
    const campaign = await prisma.campaign.findUnique({
        where: { id: 34 }
    });
    console.log(JSON.stringify(campaign, null, 2));
    await prisma.$disconnect();
}

main().catch(console.error);
