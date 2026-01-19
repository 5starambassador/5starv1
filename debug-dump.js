const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function debugReferrals() {
    const output = { user: null, years: [], referrals: [] };

    const searchTerm = 'Thirumoorthi';
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (user) {
        output.user = { id: user.userId, name: user.fullName, isFiveStar: user.isFiveStarMember };

        const refs = await prisma.referralLead.findMany({
            where: { userId: user.userId }
        });
        output.referrals = refs.map(r => ({
            id: r.leadId,
            status: r.leadStatus,
            admittedYear: r.admittedYear,
            createdAt: r.createdAt
        }));
    }

    const years = await prisma.academicYear.findMany({ where: { isActive: true } });
    output.years = years;

    fs.writeFileSync('debug_output.json', JSON.stringify(output, null, 2));
}

debugReferrals()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
