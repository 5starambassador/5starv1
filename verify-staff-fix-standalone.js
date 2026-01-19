// Minimal standalone version of the calculator for testing logic
const SHORT_TERM_TIERS = { 1: 5, 2: 10, 3: 20, 4: 30, 5: 50 };
const LONG_TERM_TIERS = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };

function calculateTotalBenefit(currentReferrals, user) {
    const referralCount = currentReferrals.length;
    const isFiveStar = user.isFiveStarLastYear || false;
    let breakdown = [];
    let currentYearAmount = 0;
    let longTermBaseAmount = 0;

    const currentSlab = (isFiveStar) ? LONG_TERM_TIERS : SHORT_TERM_TIERS;
    const slabName = isFiveStar ? 'Long Term Slab' : 'Standard Slab';

    // A. Fee Discount Logic
    if (user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)) {
        const myChildFee = user.studentFee || 60000;
        const tierPercent = currentSlab[Math.min(referralCount, 5)] || 0;
        currentYearAmount = (myChildFee * tierPercent) / 100;
        breakdown.push(`Current Year (${slabName} - ${tierPercent}%): ${tierPercent}% of ${myChildFee}`);

        if (!isFiveStar) {
            currentYearAmount += (myChildFee * 0.05);
            breakdown.push(`App Bonus: 5% of ${myChildFee}`);
        }
    } else {
        // B. Cash Benefit Logic - THIS IS WHAT WE CHANGED
        const getMarginalPercent = (n, slab) => {
            if (n > 5) return 0;
            return (slab[n] || 0) - (slab[n - 1] || 0);
        };

        currentReferrals.forEach((ref, index) => {
            const count = index + 1;
            const slicePercent = getMarginalPercent(count, currentSlab);

            // LOGIC UNDER TEST
            const isStaffNoChild = user.role === 'Staff' && !user.childInAchariya;
            const feeBase = (isStaffNoChild)
                ? (ref.actualFee || 60000)
                : (ref.campusGrade1Fee || 60000);

            const amount = (feeBase * slicePercent) / 100;
            currentYearAmount += amount;

            const feeLabel = isStaffNoChild ? 'Actual Fee' : 'G1 Fee';
            breakdown.push(`Ref #${count}: ${slicePercent}% of ${feeBase} (${feeLabel}) = ${amount}`);
        });
    }

    return { totalAmount: currentYearAmount, breakdown };
}

// Test Data
const mockReferrals = [{
    id: 1,
    campusGrade1Fee: 100000,
    actualFee: 50000
}];

console.log('=== Logic Verification ===\n');

// Test 1: Alumni (Should use G1 Fee)
const result1 = calculateTotalBenefit(mockReferrals, { role: 'Alumni', childInAchariya: false });
console.log('1. Alumni (Uses G1 Fee: 100k):');
console.log(result1.breakdown[0]);
console.log(result1.totalAmount === 5000 ? '✅ PASS' : '❌ FAIL'); // 5% of 100k

// Test 2: Staff Without Child (Should use Actual Fee)
const result2 = calculateTotalBenefit(mockReferrals, { role: 'Staff', childInAchariya: false });
console.log('\n2. Staff No Child (Uses Actual Fee: 50k):');
console.log(result2.breakdown[0]);
console.log(result2.totalAmount === 2500 ? '✅ PASS' : '❌ FAIL'); // 5% of 50k

// Test 3: Staff With Child (Should use Child Fee Discount)
const result3 = calculateTotalBenefit(mockReferrals, { role: 'Staff', childInAchariya: true, studentFee: 40000 });
console.log('\n3. Staff With Child (Uses Own Fee: 40k):');
console.log(result3.breakdown[0]);
console.log(result3.totalAmount === 4000 ? '✅ PASS' : '❌ FAIL'); // 10% of 40k (5% slab + 5% bonus)
