const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFilteredUsers(audience) {
    const where = {
        status: 'Active',
        email: { not: null }
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
        include: {
            referrals: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
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
    console.log('--- AUDIENCE COUNT SIMULATION ---');

    const scenarios = [
        { role: 'All', campus: 'All', activityStatus: 'All' },
        { role: 'Staff', campus: 'All', activityStatus: 'All' },
        { role: 'Parent', campus: 'All', activityStatus: 'All' },
        { role: 'Alumni', campus: 'All', activityStatus: 'All' },
        { role: 'Others', campus: 'All', activityStatus: 'All' },
        { role: 'All', campus: 'All', activityStatus: 'Dormant' },
        { role: 'All', campus: 'All', activityStatus: 'Active' }
    ];

    for (const s of scenarios) {
        const users = await getFilteredUsers(s);
        console.log(`${s.role} | ${s.campus} | ${s.activityStatus} => ${users.length} Profiles`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
