// Benefit Constants
// Short Term Slab (Aggressive)
export const SHORT_TERM_TIERS = {
    1: 5,
    2: 10,
    3: 20,
    4: 30,
    5: 50
}

// Long Term Slab (Linear)
export const LONG_TERM_TIERS = {
    1: 5,
    2: 10,
    3: 15,
    4: 20,
    5: 25
}

export interface ReferralData {
    id: number
    campusId: number
    grade: string
    actualFee?: number
    campusGrade1Fee?: number
}

export interface UserContext {
    role: 'Parent' | 'Staff' | 'Alumni' | 'Others'
    childInAchariya?: boolean
    studentFee?: number
    isFiveStarLastYear?: boolean
    previousYearReferrals?: ReferralData[]
}

/**
 * Calculates the Total Benefit Amount.
 */
export function calculateTotalBenefit(
    currentReferrals: ReferralData[],
    user: UserContext
): {
    totalAmount: number,
    breakdown: string[],
    isLongActive: boolean,
    longTermBaseAmount: number,
    currentYearAmount: number
} {
    const referralCount = currentReferrals.length
    const isFiveStar = user.isFiveStarLastYear || false
    const isActive = referralCount >= 1

    let breakdown: string[] = []
    let currentYearAmount = 0
    let longTermBaseAmount = 0

    // 1. Calculate Long Term Base Value (Fixed Cash calculated from Previous Year)
    if (isFiveStar && isActive && user.previousYearReferrals) {
        // Sum 3% of Actual Fee for top 5 previous referrals
        const relevantReferrals = user.previousYearReferrals.slice(0, 5)
        longTermBaseAmount = relevantReferrals.reduce((sum, r) => {
            const feeBase = r.actualFee || 60000
            const amount = feeBase * 0.03
            breakdown.push(`Long Term Base: 3% of ${feeBase} = ${amount}`)
            return sum + amount
        }, 0)
    }

    // 2. Calculate Current Year Benefit
    if (referralCount > 0) {
        // Determine Slab
        // If 5-Star Partner (Active) -> Use Long Term Slab (Linear)
        // Else -> Use Short Term Slab (Aggressive)
        const currentSlab = (isFiveStar) ? LONG_TERM_TIERS : SHORT_TERM_TIERS
        const slabName = isFiveStar ? 'Long Term Slab' : 'Standard Slab'

        // A. Fee Discount Logic (Staff+Child, Parent)
        if (user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)) {
            const myChildFee = user.studentFee || 60000
            const tierPercent = (currentSlab as any)[Math.min(referralCount, 5)] || 0

            const currentDiscount = (myChildFee * tierPercent) / 100
            currentYearAmount = currentDiscount
            breakdown.push(`Current Year (${slabName} - ${tierPercent}%): ${tierPercent}% of ${myChildFee} = ${currentDiscount}`)

            // App Enrollment Bonus (Flat 5%) - Only for Short Term (Standard) Partners
            // "if (!isFiveStar)" -> Assumes 5-Star partners DON'T get this. 
            // User Correction: "(5% App Bonus) is not for long term".
            if (!isFiveStar) {
                const appBonus = (myChildFee * 0.05)
                currentYearAmount += appBonus
                breakdown.push(`App Enrollment Bonus: 5% of ${myChildFee} = ${appBonus}`)
            }

        } else {
            // B. Cash Benefit Logic (Alumni, Others, Staff-NoChild)
            // Step-wise Marginal Calculation based on selected slab

            const getMarginalPercent = (n: number, slab: any) => {
                if (n > 5) return 0 // Cap at 5?
                const currentTotal = slab[n] || 0
                const prevTotal = slab[n - 1] || 0
                return currentTotal - prevTotal
            }

            currentReferrals.forEach((ref, index) => {
                const count = index + 1
                const slicePercent = getMarginalPercent(count, currentSlab)

                const g1Fee = ref.campusGrade1Fee || 60000
                const amount = (g1Fee * slicePercent) / 100
                currentYearAmount += amount
                breakdown.push(`Ref #${count} (${slabName}): ${slicePercent}% of ${g1Fee} (G1) = ${amount}`)
            })
        }
    }

    return {
        totalAmount: currentYearAmount + longTermBaseAmount,
        breakdown,
        isLongActive: isActive && isFiveStar,
        longTermBaseAmount,
        currentYearAmount
    }
}
