import { PrismaClient } from '@prisma/client'
import { calculateTotalBenefit } from '../src/lib/benefit-calculator'
import { getSpecialBonusRate } from '../src/lib/reward-constants'

const prisma = new PrismaClient()

async function main() {
    const referralCode = 'ACH25-S00006';
    const user = await prisma.user.findFirst({
        where: { referralCode },
    });

    if (!user) return console.log('User not found');

    const referrals = await prisma.referralLead.findMany({
        where: { userId: user.userId },
        include: { student: true }
    });

    const activeYears = await prisma.academicYear.findMany();
    const currentYearRecord = activeYears.find(y => y.isCurrent) || activeYears[0];
    const prevYear = '2025-2026'; // Based on DB records
    const currentYearStr = currentYearRecord.year;

    // Fetch Grade-1 fees
    const gradeFees = await prisma.gradeFee.findMany({
        where: { grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] } }
    });

    const grade1FeeMap = new Map();
    gradeFees.forEach(gf => {
        if (!grade1FeeMap.has(gf.academicYear)) grade1FeeMap.set(gf.academicYear, new Map());
        grade1FeeMap.get(gf.academicYear).set(gf.campusId, gf.annualFee_wotp || gf.annualFee_otp || 60000);
    });

    // 1. Current Referrals (2026-2027)
    const currentSet = referrals.filter(r => r.admittedYear === '2026-2027' || (!r.admittedYear && r.createdAt >= currentYearRecord.startDate));

    // 2. Historical Referrals (confirmed/admitted only)
    const historicalSet = referrals.filter(r => (r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted') && !currentSet.some(c => c.leadId === r.leadId));

    console.log(`Current Leads: ${currentSet.length}`);
    console.log(`Historical Leads: ${historicalSet.length}`);

    const historicalFormatted = historicalSet.map(r => ({
        id: r.leadId,
        campusId: r.campusId || 0,
        campusName: r.campus || '',
        grade: r.gradeInterested || '',
        actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
    }));

    const currentFormatted = currentSet.map(r => ({
        id: r.leadId,
        campusId: r.campusId || 0,
        campusName: r.campus || '',
        grade: r.gradeInterested || '',
        campusGrade1Fee: grade1FeeMap.get(r.admittedYear || currentYearStr)?.get(r.campusId) || 60000,
        actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000,
        admissionFeeCollected: r.student?.admissionFeeCollected || r.admissionFeeCollected || 0,
        donationFeeCollected: r.student?.donationFeeCollected || r.donationFeeCollected || 0,
        specialBonusRate: getSpecialBonusRate(r.campus)
    }));

    const context = {
        role: user.role as any,
        childInAchariya: user.childInAchariya,
        studentFee: user.studentFee || 60000,
        isFiveStarLastYear: user.isFiveStarMember,
        previousYearReferrals: historicalFormatted
    };

    const slabs = await prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } });

    // Force activate to see PROJECTION
    const calc = calculateTotalBenefit(currentFormatted, context, slabs as any, true);

    console.log('\n--- CALCULATION RESULT ---');
    console.log(`Total Amount: ₹${calc.totalAmount}`);
    console.log(`Long Term Base (3%): ₹${calc.longTermBaseAmount}`);
    console.log(`Current Year Amount: ₹${calc.currentYearAmount}`);
    console.log(`Tier Percent: ${calc.tierPercent}%`);
    console.log(`Breakdown:\n- ${calc.breakdown.join('\n- ')}`);
}

main().finally(() => prisma.$disconnect());
