import { BenefitSlabData } from '@/app/benefit-actions'

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
 * Calculates the Total Benefit Amount according to current institutional protocol.
 */
export function calculateTotalBenefit(
    currentReferrals: ReferralData[],
    user: UserContext,
    slabs: BenefitSlabData[]
): {
    totalAmount: number,
    breakdown: string[],
    isLongActive: boolean,
    longTermBaseAmount: number,
    currentYearAmount: number,
    tierPercent: number
} {
    const referralCount = currentReferrals.length
    const isFiveStar = user.isFiveStarLastYear || false
    // ACTIVATION LAW: Long Term benefits trigger ONLY if 1+ current referral exists
    const isActive = referralCount >= 1

    let breakdown: string[] = []
    let currentYearAmount = 0
    let longTermBaseAmount = 0
    let finalTierPercent = 0

    // 1. Calculate Historic Base Value (Fixed Cash Sum derived from Top 5 Previous Year Referrals)
    // Formula: SUM(3% x Actual Fee)
    if (isFiveStar && isActive && user.previousYearReferrals && user.previousYearReferrals.length > 0) {
        const relevantReferrals = user.previousYearReferrals.slice(0, 5)
        longTermBaseAmount = relevantReferrals.reduce((sum, r) => {
            const feeBase = r.actualFee || 60000
            const amount = Math.floor(feeBase * 0.03)
            breakdown.push(`🏛️ HISTORIC BASE: 3% of ₹${feeBase.toLocaleString()} = ₹${amount.toLocaleString()}`)
            return sum + amount
        }, 0)
    }

    // 2. Calculate Current Year Benefit (Linear for 5-Star, Aggressive for Standard)
    if (referralCount > 0 && slabs.length > 0) {
        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)

        const getPercent = (count: number) => {
            // For 5-Star (Long Term), strictly follow 5% per referral (1=5, 2=10, 3=15...)
            if (isFiveStar) return Math.min(count, 5) * 5

            // For Standard, use database slabs
            const slab = sorted.find(s => s.referralCount === Math.min(count, 5)) || sorted[sorted.length - 1]
            return slab?.yearFeeBenefitPercent || 0
        }

        const tierPercent = getPercent(referralCount)
        finalTierPercent = tierPercent
        const slabName = isFiveStar ? '5-Star Precision Slab (Linear)' : 'Standard Growth Slab'

        // A. WING A: Fee Discount TRACK (Parent, Staff with Child)
        const isGroupAWaiver = user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)

        if (isGroupAWaiver) {
            const myChildFee = user.studentFee || 60000
            currentYearAmount = (myChildFee * tierPercent) / 100
            breakdown.push(`⚡ WAIVER GROUP A: ${tierPercent}% of Child Fee ₹${myChildFee.toLocaleString()} = ₹${currentYearAmount.toLocaleString()}`)

            // App Enrollment Bonus (Dynamic targeting from global governance)
            // Note: 5% Bonus is NOT for long term
            if (!isFiveStar) {
                const globalSlab = slabs[0]
                const eligibility = globalSlab?.appBonusEligibility?.split(',') || []
                const isEligible =
                    (user.role === 'Parent' && eligibility.includes('PARENT')) ||
                    (user.role === 'Staff' && eligibility.includes('STAFF_CHILD'))

                if (isEligible) {
                    const bonusPercent = globalSlab.appBonusPercent || 5
                    const bonusAmount = (myChildFee * bonusPercent) / 100
                    currentYearAmount += bonusAmount
                    breakdown.push(`📱 APP BONUS: +${bonusPercent}% extra = ₹${bonusAmount.toLocaleString()}`)
                }
            }
        }

        // B. WING B: Cash Payout TRACK (Alumni, Others, Staff without Child)
        else {
            breakdown.push(`💧 PAYOUT GROUP B: Current Year Yield`)

            currentReferrals.forEach((ref, index) => {
                const count = index + 1
                if (count > 5) return // Yield caps at 5 referrals per policy

                let slicePercent = 0
                if (isFiveStar) {
                    slicePercent = 5 // Flat 5% marginal shift
                } else {
                    const currentTotal = getPercent(count)
                    const prevTotal = count === 1 ? 0 : getPercent(count - 1)
                    slicePercent = currentTotal - prevTotal
                }

                const g1Fee = ref.campusGrade1Fee || 60000
                const amount = (g1Fee * slicePercent) / 100
                currentYearAmount += amount
                breakdown.push(`🔥 REF-${count}: ${slicePercent}% yield of ₹${g1Fee.toLocaleString()} (G1) = ₹${amount.toLocaleString()}`)
            })

            // App Enrollment Bonus for Payout Wing
            if (!isFiveStar) {
                const globalSlab = slabs[0]
                const eligibility = globalSlab?.appBonusEligibility?.split(',') || []
                const isEligible =
                    (user.role === 'Staff' && eligibility.includes('STAFF_PAYOUT')) ||
                    ((user.role === 'Alumni' || user.role === 'Others') && eligibility.includes('ALUMNI_OTHERS'))

                if (isEligible) {
                    const bonusPercent = globalSlab.appBonusPercent || 5
                    // For payout, we apply bonus on avg Grade 1 fee or sum? 
                    // Protocol: 5% flat of Grade 1 base fee per referral
                    const bonusPerRef = (60000 * bonusPercent) / 100 // Estimate base if per ref
                    const totalBonus = bonusPerRef * Math.min(referralCount, 5)
                    currentYearAmount += totalBonus
                    breakdown.push(`📱 APP BONUS: ₹${totalBonus.toLocaleString()} (Projected)`)
                }
            }
        }
    }

    return {
        totalAmount: currentYearAmount + longTermBaseAmount,
        breakdown,
        isLongActive: isActive && isFiveStar,
        longTermBaseAmount,
        currentYearAmount,
        tierPercent: finalTierPercent
    }
}
