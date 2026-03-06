
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const slabs = await prisma.benefitSlab.findMany({
        orderBy: { referralCount: 'asc' }
    });
    console.log('--- BENEFIT SLABS ---');
    console.log(JSON.stringify(slabs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
