import { calculateTotalBenefit } from '../src/lib/benefit-calculator'

// Mock Data
const currentYear = '2026-2027'
const prevYear = '2025-2026'

const campusFeeMap = {
    '2026-2027': {
        1: { otp: 60000, wotp: 70000 }
    },
    '2025-2026': {
        1: { otp: 50000, wotp: 60000 }
    }
}

const slabs = [
    { slabId: 1, referralCount: 1, yearFeeBenefitPercent: 5, appBonusPercent: 0, appBonusEligibility: 'None', tierName: 'Tier 1' },
    { slabId: 2, referralCount: 2, yearFeeBenefitPercent: 10, appBonusPercent: 0, appBonusEligibility: 'None', tierName: 'Tier 2' },
    { slabId: 3, referralCount: 3, yearFeeBenefitPercent: 20, appBonusPercent: 0, appBonusEligibility: 'None', tierName: 'Tier 3' }
]

const referrals = [
    { leadId: 101, campusId: 1, leadStatus: 'Confirmed', admittedYear: '2026-2027', selectedFeeType: 'OTP' },
    { leadId: 102, campusId: 1, leadStatus: 'New', admittedYear: '2026-2027', selectedFeeType: 'OTP' },
    { leadId: 103, campusId: 1, leadStatus: 'Interested', admittedYear: '2026-2027', selectedFeeType: 'OTP' }
]

const userContext = {
    role: 'Others', // Group B
    childInAchariya: 'No',
    studentFee: 60000,
    isFiveStarLastYear: false,
    previousYearReferrals: []
}

// Simulation logic from DashboardClient.tsx
function formatForCalculator(refs: any[]) {
    return refs.map(r => {
        const feeType = r.selectedFeeType || 'OTP'
        const year = r.admittedYear || currentYear
        const yearFees = (campusFeeMap as any)[year] || (campusFeeMap as any)[currentYear]
        const fees = yearFees ? (yearFees as any)[r.campusId] : null
        const g1Fee = (feeType === 'WOTP') ? (fees?.wotp || 60000) : (fees?.otp || 60000)
        return {
            id: r.leadId,
            campusId: r.campusId || 0,
            campusGrade1Fee: g1Fee,
            actualFee: 60000,
            grade: r.gradeInterested || 'Grade 1'
        }
    })
}

const confirmedSet = referrals.filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')
const allProspectsSet = referrals.filter((r: any) => !['Rejected', 'Closed'].includes(r.leadStatus))

const earnedBenefits = calculateTotalBenefit(formatForCalculator(confirmedSet), userContext as any, slabs as any)
const potentialBenefits = calculateTotalBenefit(formatForCalculator(allProspectsSet), userContext as any, slabs as any)

console.log('--- DASHBOARD METRICS SIMULATION ---')
console.log('Confirmed Refs:', confirmedSet.length)
console.log('Total Prospects:', allProspectsSet.length)
console.log('--- RESULTS ---')
console.log('Earned (Secured Balance):', earnedBenefits.totalAmount)
console.log('Potential (Projected Potential):', potentialBenefits.totalAmount)
console.log('Earned Tier %:', earnedBenefits.tierPercent)
console.log('Potential Tier %:', potentialBenefits.tierPercent)

if (earnedBenefits.totalAmount === 3000 && potentialBenefits.totalAmount === 12000) {
    console.log('\n✅ VERIFICATION SUCCESSFUL')
    console.log('Note: 1st ref (5% of 60k) = 3000. 3 refs total (20% of 60k) = 12000.')
} else {
    console.log('\n❌ VERIFICATION FAILED')
}
