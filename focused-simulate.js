const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFilteredUsers(audience) {
    const where = {
        status: 'Active',
        email: { not: null, not: '' }
    }

    if (audience.role !== 'All') {
        where.role = audience.role
    }

    if (audience.campus !== 'All') {
        where.assignedCampus = audience.campus
    }

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const users = await prisma.user.findMany({
        where,
        select: {
            userId: true,
            referrals: {
                take: 1,
                orderBy: { createdAt: 'desc' }
            },
            createdAt: true
        }
    })

    if (audience.activityStatus === 'All') return users

    return users.filter(u => {
        const lastActivity = u.referrals[0]?.createdAt || u.createdAt
        const isDormant = new Date(lastActivity) < fourteenDaysAgo
        return audience.activityStatus === 'Dormant' ? isDormant : !isDormant
    })
}

async function main() {
    const audience = { role: 'All', campus: 'All', activityStatus: 'All' };
    const users = await getFilteredUsers(audience);
    console.log(`Audience: ROLE=${audience.role}, CAMPUS=${audience.campus}, STATUS=${audience.activityStatus}`);
    console.log(`Count: ${users.length} Profiles`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
