const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Benefit Constants (Duplicated from src/lib/benefit-calculator.ts for standalone testing)
const SHORT_TERM_TIERS = { 1: 5, 2: 10, 3: 20, 4: 30, 5: 50 };
const LONG_TERM_TIERS = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };

function calculateTotalBenefit(currentReferrals, user) {
    const referralCount = currentReferrals.length;
    const isFiveStar = user.isFiveStarLastYear || false;
    const isActive = referralCount >= 1;

    let breakdown = [];
    let currentYearAmount = 0;
    let longTermBaseAmount = 0;

    // 1. Calculate Long Term Base Value
    if (isFiveStar && isActive && user.previousYearReferrals) {
        const relevantReferrals = user.previousYearReferrals.slice(0, 5);
        longTermBaseAmount = relevantReferrals.reduce((sum, r) => {
            const feeBase = r.actualFee || 60000;
            const amount = feeBase * 0.03;
            breakdown.push(`Long Term Base: 3% of ${feeBase} = ${amount}`);
            return sum + amount;
        }, 0);
    }

    // 2. Calculate Current Year Benefit
    if (referralCount > 0) {
        const currentSlab = (isFiveStar) ? LONG_TERM_TIERS : SHORT_TERM_TIERS;
        const slabName = isFiveStar ? 'Long Term Slab' : 'Standard Slab';

        if (user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)) {
            const myChildFee = user.studentFee || 60000;
            const tierPercent = currentSlab[Math.min(referralCount, 5)] || 0;
            const currentDiscount = (myChildFee * tierPercent) / 100;
            currentYearAmount = currentDiscount;
            breakdown.push(`Current Year (${slabName} - ${tierPercent}%): ${tierPercent}% of ${myChildFee} = ${currentDiscount}`);

            if (!isFiveStar) {
                const appBonus = (myChildFee * 0.05);
                currentYearAmount += appBonus;
                breakdown.push(`App Enrollment Bonus: 5% of ${myChildFee} = ${appBonus}`);
            }
        } else {
            const getMarginalPercent = (n, slab) => {
                if (n > 5) return 0;
                const currentTotal = slab[n] || 0;
                const prevTotal = slab[n - 1] || 0;
                return currentTotal - prevTotal;
            };

            currentReferrals.forEach((ref, index) => {
                const count = index + 1;
                const slicePercent = getMarginalPercent(count, currentSlab);
                const g1Fee = ref.campusGrade1Fee || 60000;
                const amount = (g1Fee * slicePercent) / 100;
                currentYearAmount += amount;
                breakdown.push(`Ref #${count} (${slabName}): ${slicePercent}% of ${g1Fee} (G1) = ${amount}`);
            });
        }
    }

    return {
        totalAmount: currentYearAmount + longTermBaseAmount,
        breakdown,
        isLongActive: isActive && isFiveStar,
        longTermBaseAmount,
        currentYearAmount
    };
}

async function verify() {
    console.log('--- Verifying Benefit Logic for Thirumoorthi R ---');
    const searchTerm = 'Thirumoorthi'; // Adjust if needed

    // 1. Fetch User
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: searchTerm, mode: 'insensitive' } }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }
    console.log(`User: ${user.fullName} (${user.role}) | isFiveStarMember: ${user.isFiveStarMember}`);

    // 2. Fetch Active Years
    const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } });
    const currentYearRecord = activeYears.find(y => y.isCurrent) || activeYears[0];
    const previousYearRecord = activeYears
        .filter(y => y.endDate < currentYearRecord.startDate)
        .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];

    const CURRENT_ACADEMIC_YEAR = currentYearRecord?.year || '2025-2026';
    const PREVIOUS_ACADEMIC_YEAR = previousYearRecord?.year || '2024-2025';
    console.log(`Current Year: ${CURRENT_ACADEMIC_YEAR}`);
    console.log(`Previous Year: ${PREVIOUS_ACADEMIC_YEAR}`);

    // 3. Fetch Referrals
    const allReferrals = await prisma.referralLead.findMany({
        where: { userId: user.userId },
        include: { student: true }
    });
    console.log(`Total Referrals Found: ${allReferrals.length}`);

    // 4. Split Logic (Same as Page)
    const currentReferrals = allReferrals.filter(r => {
        if (r.admittedYear) return r.admittedYear === CURRENT_ACADEMIC_YEAR || r.admittedYear === '2026-2027';
        const s = r.student;
        if (s?.academicYear) return s.academicYear === CURRENT_ACADEMIC_YEAR || s.academicYear === '2026-2027';
        return new Date(r.createdAt) > new Date('2025-01-01');
    });

    const previousReferrals = allReferrals.filter(r => {
        if (r.admittedYear) return r.admittedYear === PREVIOUS_ACADEMIC_YEAR;
        const s = r.student;
        if (s?.academicYear) return s.academicYear === PREVIOUS_ACADEMIC_YEAR;
        return false;
    }).filter(r => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted');

    console.log(`Current Cycle Referrals: ${currentReferrals.length}`);
    console.log(`Previous Cycle Referrals (Eligible for Base): ${previousReferrals.length}`);

    // 5. Calculate
    // Format data slightly to match Calculator input
    const currentRefsData = currentReferrals.map((r, i) => ({
        id: r.leadId,
        campusId: r.campusId || 0,
        grade: r.gradeInterested || '',
        campusGrade1Fee: 60000 // Mocking Grade 1 Fee for test
    }));

    const prevRefsData = previousReferrals.map(r => ({
        id: r.leadId,
        campusId: r.campusId || 0,
        grade: r.gradeInterested || '',
        actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
    }));

    const userContext = {
        role: user.role,
        childInAchariya: user.childInAchariya,
        studentFee: user.studentFee || 60000,
        isFiveStarLastYear: user.isFiveStarMember,
        previousYearReferrals: prevRefsData
    };

    const result = calculateTotalBenefit(currentRefsData, userContext);

    // Write full output to file for verification
    const fs = require('fs');
    const output = {
        user: { name: user.fullName, isFiveStar: user.isFiveStarMember },
        referralCounts: { current: currentReferrals.length, previous: previousReferrals.length },
        result: result
    };
    fs.writeFileSync('verification-results.json', JSON.stringify(output, null, 2));

    console.log('Verification Complete. Results written to verification-results.json');
}

verify()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
