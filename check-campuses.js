const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCampuses() {
    const campuses = await prisma.campus.findMany();
    console.log('--- All Campuses ---');
    campuses.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.campusName}`);
    });
}
checkCampuses().catch(console.error).finally(() => prisma.$disconnect());
