const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const effectiveAdminCampusId = 136;
    let mode = undefined;

    const campuses = await prisma.campus.findMany({
        select: { id: true, campusName: true }
    });
    
    const campusNameMap = new Map();
    campuses.forEach(c => campusNameMap.set(c.id, c.campusName));

    const [refUsers] = await Promise.all([
        prisma.referralLead.findMany({
            where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
            select: { userId: true },
            distinct: ['userId']
        })
    ]);

    let eligibleUserIds = Array.from(new Set(refUsers.map(r => r.userId)));

    const usersWithSettlements = await prisma.settlement.findMany({
        where: { amount: { gt: 25 } },
        select: { userId: true },
        distinct: ['userId']
    });
    eligibleUserIds = Array.from(new Set([...eligibleUserIds, ...usersWithSettlements.map(s => s.userId)]));

    const campusAmbassadors = await prisma.user.findMany({
        where: {
            userId: { in: eligibleUserIds },
            OR: [
                { campusId: effectiveAdminCampusId },
                { assignedCampus: campusNameMap.get(effectiveAdminCampusId) },
                { referrals: { some: { campusId: effectiveAdminCampusId } } }
            ]
        },
        select: { userId: true }
    });
    eligibleUserIds = campusAmbassadors.map(u => u.userId);

    const allLeads = await prisma.referralLead.findMany({
        where: { 
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            ...(eligibleUserIds.length > 0 ? { userId: { in: eligibleUserIds } } : { userId: -1 })
        },
        select: { userId: true },
        take: 50000,
        orderBy: { createdAt: 'desc' }
    });

    const ambassadorsWithLeads = Array.from(new Set(allLeads.map(l => l.userId)));
    const finalPool = ambassadorsWithLeads;
    const uniqueUserIds = finalPool;
    const userIds = uniqueUserIds;

    const allReferrals = await prisma.referralLead.findMany({
        where: {
            userId: { in: userIds },
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            campusId: effectiveAdminCampusId
        }
    });

    console.log('Final referrals count:', allReferrals.length);

    const now = new Date();
    const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyReferrals = allReferrals.filter((ref) => {
        const date = ref.confirmedDate ? new Date(ref.confirmedDate) : new Date(ref.createdAt);
        const isRecent = date >= weeklyStart && date <= now;
        return isRecent;
    });

    console.log('Weekly Referrals:', weeklyReferrals.length);
}

run().catch(console.error).finally(() => process.exit());
