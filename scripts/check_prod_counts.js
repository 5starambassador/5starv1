
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Connecting...');

    // 1. Count Users
    const userCount = await prisma.user.count({ where: {} });
    console.log(`User Count: ${userCount}`);

    // 2. Count Leads
    const leadCount = await prisma.referralLead.count({ where: {} });
    console.log(`Lead Count: ${leadCount}`);

    // 3. Count Confirmed
    const confirmedCount = await prisma.referralLead.count({ where: { leadStatus: 'Confirmed' } });
    console.log(`Confirmed Leads: ${confirmedCount}`);

    // 4. Latest 5 Users (Timestamps)
    const latestUsers = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { userId: true, createdAt: true, role: true, mobileNumber: true }
    });
    console.log('Latest 5 Users:', JSON.stringify(latestUsers, null, 2));

    // 5. Test queryRaw for Benefits
    try {
        const result = await prisma.$queryRaw`
      SELECT SUM("studentFee" * ("yearFeeBenefitPercent" / 100.0) * "confirmedReferralCount") as total
      FROM "User"
      WHERE "confirmedReferralCount" > 0
    `;
        const total = result[0]?.total ? Number(result[0].total) : 0;
        console.log(`System Benefits: ${total}`);
    } catch (e) {
        console.error('QueryRaw Failed:', e.message);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
