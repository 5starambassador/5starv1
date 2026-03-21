import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
    console.log('--- CHECKING USER: Keerthi lingashini T ---');
    const u = await prisma.user.findFirst({
        where: { fullName: { contains: 'Keerthi' } },
        include: { students: true }
    });
    console.log(JSON.stringify(u, null, 2));
    await prisma.$disconnect();
}
checkUser().catch(console.error);
