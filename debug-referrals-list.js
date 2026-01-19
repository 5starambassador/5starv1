const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugReferrals() {
    console.log('--- Debugging Referrals for Thirumoorthi R ---');
    const searchTerm = 'Thirumoorthi';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }
    console.log(`User ID: ${user.userId}`);

    const refs = await prisma.referralLead.findMany({
        where: { userId: user.userId }
    });

    console.log(`Found ${refs.length} referrals.`);
    refs.forEach(r => {
        console.log(`[${r.leadId}] Status: ${r.leadStatus}, AdmittedYear: '${r.admittedYear}', Created: ${r.createdAt}`);
    });
}

debugReferrals()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
