import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const userId = 'ACH25-S00006'; // We can search by referralCode
    console.log(`🔍 Inspecting User: ${userId}`);

    const user = await prisma.user.findFirst({
        where: { referralCode: userId },
        include: {
            referrals: true,
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log(`✅ Found User: ${user.fullName} (${user.userId})`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Is 5-Star: ${user.isFiveStarMember}`);
    console.log(`- Total Referrals in DB: ${user.referrals.length}`);

    const referralsByYear = user.referrals.reduce((acc: any, r) => {
        const year = r.admittedYear || 'Unknown';
        if (!acc[year]) acc[year] = [];
        acc[year].push(r);
        return acc;
    }, {});

    for (const year in referralsByYear) {
        console.log(`\n📅 Year: ${year}`);
        referralsByYear[year].forEach((r: any) => {
            console.log(`  - ${r.studentName} | Status: ${r.leadStatus} | Campus: ${r.campus}`);
        });
    }

    // Check Grade-1 fees
    const fees = await prisma.gradeFee.findMany({
        where: {
            grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] }
        }
    });

    console.log('\n💰 Grade-1 Fees (first 5):');
    fees.slice(0, 5).forEach(f => {
        console.log(`  - ${f.academicYear} | ${f.campusId} | Fee: ${f.annualFee_wotp || f.annualFee_otp}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
