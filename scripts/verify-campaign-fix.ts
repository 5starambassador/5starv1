import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const r = await prisma.campaignRecipient.findFirst({
        where: {
            campaignId: 28,
            status: 'FAILED'
        }
    });
    console.log(JSON.stringify(r, null, 2));
}
check().finally(() => prisma.$disconnect());
