import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixFinalSix() {
    console.log('--- FIXING FINAL 6 USERS ---');
    const userIds = [1824, 3799, 11209, 5160, 1579, 4170];
    const result = await prisma.user.updateMany({
        where: { userId: { in: userIds } },
        data: { childInAchariya: true }
    });
    console.log(`Successfully updated ${result.count} users.`);
    await prisma.$disconnect();
}
fixFinalSix().catch(console.error);
