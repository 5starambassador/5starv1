const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFix() {
    try {
        const user = await prisma.user.findFirst({
            where: { fullName: 'Thirumoorthi R' }
        });

        if (!user) {
            console.log("User not found");
            return;
        }

        const referrals = await prisma.referralLead.findMany({
            where: { userId: user.userId },
            include: {
                student: true
            }
        });

        const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } });
        const activeYearStrings = activeYears.map(y => y.year);

        console.log(`Active Years: ${activeYearStrings.join(', ')}`);

        const currentReferrals = referrals.filter((r) => {
            if (r.admittedYear) return activeYearStrings.includes(r.admittedYear);
            if (r.student?.academicYear) return activeYearStrings.includes(r.student.academicYear);
            return new Date(r.createdAt) > new Date('2025-01-01');
        });

        const realConfirmedCount = currentReferrals.filter((r) => r.leadStatus === 'Confirmed').length;
        const pendingCount = currentReferrals.filter((r) => r.leadStatus !== 'Confirmed' && r.leadStatus !== 'Rejected').length;

        console.log(`\nResults for ${user.fullName}:`);
        console.log(`Total Referrals in DB: ${referrals.length}`);
        console.log(`Filtered Referrals (Active Years): ${currentReferrals.length}`);
        console.log(`Confirmed Count (Dashboard Units): ${realConfirmedCount}`);
        console.log(`Pending Count: ${pendingCount}`);

        if (realConfirmedCount === 5) {
            console.log("\n✅ FIX VERIFIED: All 5 confirmed referrals are now included.");
        } else {
            console.log(`\n❌ FIX FAILED: Only ${realConfirmedCount} confirmed referrals found.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFix();
