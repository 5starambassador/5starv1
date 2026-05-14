
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSyncUrls() {
    try {
        const programs = await prisma.externalProgram.findMany({
            where: { isActive: true }
        });
        console.log(JSON.stringify(programs, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

listSyncUrls();
