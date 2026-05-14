
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditSugumar() {
    try {
        const leads = await prisma.programLead.findMany({
            where: {
                visitorMobile: '9003616827'
            },
            include: {
                program: true
            }
        });
        console.log(JSON.stringify(leads, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

auditSugumar();
