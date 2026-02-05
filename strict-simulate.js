const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFilteredUsers(audience) {
    console.log(`Filtering with: ${JSON.stringify(audience)}`);
    const where = {
        status: 'Active',
        email: { not: null }
    };

    if (audience.role !== 'All') {
        where.role = audience.role;
    }

    if (audience.campus !== 'All') {
        where.assignedCampus = audience.campus;
    }

    console.log(`Prisma WHERE clause: ${JSON.stringify(where)}`);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const users = await prisma.user.findMany({
        where,
        include: {
            referrals: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    console.log(`Raw DB count: ${users.length}`);

    if (audience.activityStatus === 'All') return users;

    const filtered = users.filter(u => {
        const lastActivity = u.referrals[0]?.createdAt || u.createdAt;
        const isDormant = new Date(lastActivity) < fourteenDaysAgo;
        return audience.activityStatus === 'Dormant' ? isDormant : !isDormant;
    });

    console.log(`Activity filtered count: ${filtered.length}`);
    return filtered;
}

async function main() {
    const audience = { role: 'All', campus: 'All', activityStatus: 'All' };
    const users = await getFilteredUsers(audience);
    console.log('Final Count:', users.length);
    process.exit(0);
}

main();
