
import { calculateTotalBenefit } from '../src/lib/benefit-calculator'

async function simulate() {
    console.log('--- SIMULATING SLAB REWARD LOGIC ---')

    const gomathyReferral = {
        id: 1,
        campusId: 101,
        campusName: 'ABSM - THENGAITHITTU',
        grade: 'Grade-1',
        actualFee: 59850,
        campusGrade1Fee: 59850, // This is what we now pass dynamically
        admissionFeeCollected: 15000,
        donationFeeCollected: 0
    }

    const slabs = [
        { referralCount: 1, yearFeeBenefitPercent: 5 },
        { referralCount: 2, yearFeeBenefitPercent: 10 },
        { referralCount: 3, yearFeeBenefitPercent: 20 },
        { referralCount: 4, yearFeeBenefitPercent: 30 },
        { referralCount: 5, yearFeeBenefitPercent: 50 }
    ]

    const result = calculateTotalBenefit([gomathyReferral], {
        role: 'Alumni', // Group B
        childInAchariya: false
    }, slabs as any)

    console.log('Calculation Result for Gomathy T (Alumni):')
    console.log(`- Total Yield: ₹${result.totalAmount.toLocaleString()}`)
    console.log(`- Slab Share: ₹${result.slabShare.toLocaleString()}`)
    console.log(`- Admission Share: ₹${result.admissionShare.toLocaleString()}`)
    console.log('\nBreakdown:')
    result.breakdown.forEach(b => console.log(`  ${b}`))

    if (result.slabShare === 2992.5) {
        console.log('\n✅ SUCCESS: Slab reward is precisely 5% of ₹59,850 (₹2,992.5)')
    } else {
        console.log(`\n❌ FAILED: Slab reward is ${result.slabShare}`)
    }
}

simulate().catch(console.error)
