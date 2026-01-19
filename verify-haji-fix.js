const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyHajiFix() {
    try {
        const user = await prisma.user.findFirst({
            where: { fullName: 'Haji Ali A R' }
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

        const confirmedCount = currentReferrals.filter((r) => r.leadStatus === 'Confirmed').length;

        console.log(`\nResults for ${user.fullName}:`);
        console.log(`Total Referrals in DB: ${referrals.length}`);
        console.log(`Filtered Referrals (Active Years): ${currentReferrals.length}`);
        console.log(`Confirmed Count (Profile Units): ${confirmedCount}`);

        if (confirmedCount === 3) {
            console.log("\n✅ FIX VERIFIED: All 3 confirmed referrals for Haji Ali are now included.");
        } else {
            console.log(`\n❌ FIX FAILED: Only ${confirmedCount} confirmed referrals found.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyHajiFix();
