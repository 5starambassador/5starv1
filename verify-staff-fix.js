const { calculateTotalBenefit, SHORT_TERM_TIERS } = require('./src/lib/benefit-calculator');

// Mock data
const mockReferrals = [
    {
        id: 1,
        campusId: 1,
        grade: '1',
        campusGrade1Fee: 100000, // Alumni should use this (higher)
        actualFee: 50000         // Staff without child should use this (lower)
    }
];

// Test 1: Alumni User (Should use Campus Grade-1 Fee)
const alumniUser = {
    role: 'Alumni',
    childInAchariya: false,
    studentFee: 60000,
    isFiveStarLastYear: false,
    previousYearReferrals: []
};

// Test 2: Staff User WITHOUT Child (Should use Actual Fee)
const staffNoChildUser = {
    role: 'Staff',
    childInAchariya: false,
    studentFee: 60000, // Should be ignored
    isFiveStarLastYear: false,
    previousYearReferrals: []
};

// Test 3: Staff User WITH Child (Should use Student Fee Discount)
const staffWithChildUser = {
    role: 'Staff',
    childInAchariya: true,
    studentFee: 40000, // Should use this for discount
    isFiveStarLastYear: false,
    previousYearReferrals: []
};

console.log('=== Benefit Calculation Verification ===\n');

// Run Test 1
const alumniResult = calculateTotalBenefit(mockReferrals, alumniUser);
console.log('TEST 1: Alumni (1 Ref)');
console.log(`Expected Base: ₹100,000 (Grade-1)`);
console.log(`Calculation: ${alumniResult.breakdown[0]}`);
console.log(`Total Amount: ₹${alumniResult.totalAmount}`);
console.log(alumniResult.totalAmount === 5000 ? '✅ CORRECT (5% of 100k)' : '❌ FAILED');

console.log('\n----------------------------------------\n');

// Run Test 2
const staffNoChildResult = calculateTotalBenefit(mockReferrals, staffNoChildUser);
console.log('TEST 2: Staff Without Child (1 Ref)');
console.log(`Expected Base: ₹50,000 (Actual Fee)`);
console.log(`Calculation: ${staffNoChildResult.breakdown[0]}`);
console.log(`Total Amount: ₹${staffNoChildResult.totalAmount}`);
console.log(staffNoChildResult.totalAmount === 2500 ? '✅ CORRECT (5% of 50k)' : '❌ FAILED');

console.log('\n----------------------------------------\n');

// Run Test 3
const staffWithChildResult = calculateTotalBenefit(mockReferrals, staffWithChildUser);
console.log('TEST 3: Staff With Child (1 Ref)');
console.log(`Expected Base: ₹40,000 (Own Child Fee)`);
console.log(`Calculation: ${staffWithChildResult.breakdown[0]}`);
console.log(`Total Amount: ₹${staffWithChildResult.totalAmount}`);
// 5% slab + 5% bonus = 10% of 40k = 4000
console.log(staffWithChildResult.totalAmount === 4000 ? '✅ CORRECT (5% Slab + 5% Bonus of 40k)' : '❌ FAILED');
