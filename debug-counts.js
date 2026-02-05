const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- USER COUNTS DEBUG (CLEAR) ---');

    const activeWithEmail = await prisma.user.findMany({
        where: {
            status: 'Active',
            email: { not: null, not: '' }
        },
        select: {
            role: true,
            assignedCampus: true,
            referrals: {
                take: 1,
                orderBy: { createdAt: 'desc' }
            },
            createdAt: true
        }
    });

    console.log(`Total Active with Email: ${activeWithEmail.length}`);

    const countsByCampus = {};
    const countsByRole = {};

    let dormantCount = 0;
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    activeWithEmail.forEach(u => {
        countsByCampus[u.assignedCampus || 'Unassigned'] = (countsByCampus[u.assignedCampus || 'Unassigned'] || 0) + 1;
        countsByRole[u.role] = (countsByRole[u.role] || 0) + 1;

        const lastActivity = u.referrals[0]?.createdAt || u.createdAt;
        if (new Date(lastActivity) < fourteenDaysAgo) {
            dormantCount++;
        }
    });

    console.log('\n--- Counts by Campus ---');
    Object.entries(countsByCampus).forEach(([k, v]) => console.log(`${k}: ${v}`));

    console.log('\n--- Counts by Role ---');
    Object.entries(countsByRole).forEach(([k, v]) => console.log(`${k}: ${v}`));

    console.log(`\nDormant Count: ${dormantCount}`);
    console.log(`Active (Recent) Count: ${activeWithEmail.length - dormantCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
