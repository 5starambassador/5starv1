import { BenefitSlabData } from '@/app/benefit-actions'
import { REWARD_RATES } from './reward-constants'

export interface ReferralData {
    id: number
    campusId: number
    campusName?: string
    grade: string
    actualFee?: number
    campusGrade1Fee?: number
    admissionFeeCollected?: number
    donationFeeCollected?: number
    specialBonusRate?: number
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
    tierPercent: number,
    admissionShare: number,
    donationShare: number,
    slabShare: number,
    specialBonusShare: number,
    appBonusPercent?: number
} {
    const referralCount = currentReferrals.length
    const isFiveStar = user.isFiveStarLastYear || false
    // ACTIVATION LAW: Long Term benefits trigger ONLY if 1+ current referral exists
    const isActive = referralCount >= 1

    let breakdown: string[] = []
    let currentYearAmount = 0
    let longTermBaseAmount = 0
    let finalTierPercent = 0

    let admissionShare = 0
    let donationShare = 0
    let slabShare = 0
    let specialBonusShare = 0
    let appBonusPercentResult = 0

    // SAFETY: If student fee is missing or invalidly low, don't use a default; let result be 0 for admin visibility
    const safeStudentFee = (!user.studentFee || user.studentFee < 1000) ? 0 : user.studentFee

    // 1. Calculate Historic Base Value (Fixed Cash Sum derived from Top 5 Previous Year Referrals)
    // Formula: SUM(3% x Actual Fee)
    if (isFiveStar && isActive && user.previousYearReferrals && user.previousYearReferrals.length > 0) {
        const relevantReferrals = user.previousYearReferrals.slice(0, 5)
        longTermBaseAmount = relevantReferrals.reduce((sum, r) => {
            const feeBase = r.actualFee || 0
            const amount = Math.floor(feeBase * REWARD_RATES.HISTORIC_BASE_YIELD)
            breakdown.push(`🏛️ HISTORIC BASE: ${REWARD_RATES.HISTORIC_BASE_YIELD * 100}% of ₹${feeBase.toLocaleString()} = ₹${amount.toLocaleString()}`)
            return sum + amount
        }, 0)
    }

    // 2. Calculate Current Year Benefit (Linear for 5-Star, Aggressive for Standard)
    // A. Calculate Special Benefits (Flat Additive)
    currentReferrals.forEach((ref) => {
        if (ref.specialBonusRate && ref.specialBonusRate > 0) {
            specialBonusShare += ref.specialBonusRate
            breakdown.push(`⭐ SPECIAL BONUS (${ref.campusName || 'Selected Campus'}): Flat Benefit = ₹${ref.specialBonusRate.toLocaleString()}`)
        }
    })

    // B. Calculate Standard Benefits (Existing Logic)
    // For standard logic, we filter out referrals that ALREADY took a special bonus? 
    // Usually institutional policy says "either/or" or "additive". 
    // In original code, SPECIAL_RATES referrals were filtered OUT of standardReferrals.
    const standardReferrals = currentReferrals.filter(r => !r.specialBonusRate)
    const stdCount = standardReferrals.length

    if (stdCount > 0 && slabs.length > 0) {
        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)

        const getPercent = (count: number) => {
            // For 5-Star (Long Term), strictly follow 5% per referral (1=5, 2=10, 3=15...)
            if (isFiveStar) return Math.min(count, 5) * 5

            // For Standard, use database slabs
            const slab = sorted.find(s => s.referralCount === Math.min(count, 5)) || sorted[sorted.length - 1]
            return slab?.yearFeeBenefitPercent || 0
        }

        const tierPercent = getPercent(stdCount)
        finalTierPercent = tierPercent
        const slabName = isFiveStar ? '5-Star Precision Slab (Linear)' : 'Standard Growth Slab'

        // B.1 WING A: Fee Discount TRACK (Parent, Staff with Child)
        const isGroupAWaiver = user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)

        if (isGroupAWaiver) {
            const amount = (safeStudentFee * tierPercent) / 100
            slabShare += amount
            breakdown.push(`⚡ WAIVER GROUP A: ${tierPercent}% of Child Fee ₹${safeStudentFee.toLocaleString()} = ₹${amount.toLocaleString()}`)

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
                    appBonusPercentResult = bonusPercent
                    breakdown.push(`📱 APP ENROLLMENT BONUS: ${bonusPercent}% Eligible (Informational Only)`)
                }
            }
        }

        // B.2 WING B: Cash Payout TRACK (Alumni, Others, Staff without Child)
        else {
            breakdown.push(`💧 PAYOUT GROUP B: Current Year Yield`)

            standardReferrals.forEach((ref, index) => {
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

                const g1Fee = ref.campusGrade1Fee || 0  // 0 when fee not seeded; UI shows N/A
                const amount = (g1Fee * slicePercent) / 100
                slabShare += amount
                breakdown.push(`🔥 REF-${count}: ${slicePercent}% yield of ₹${g1Fee.toLocaleString()} (G1) = ₹${amount.toLocaleString()}`)
            })
        }
    }

    // 3. New Incentive Integration: 80% Admission + 50% Donation (Normal Logic Only)
    currentReferrals.forEach(ref => {
        if (!ref.specialBonusRate) {
            const admFee = (ref as any).admissionFeeCollected || 0
            const donFee = (ref as any).donationFeeCollected || 0

            if (admFee > 0 || donFee > 0) {
                const admBonus = admFee * REWARD_RATES.ADMISSION_PROFIT_SHARE
                const donBonus = donFee * REWARD_RATES.DONATION_PROFIT_SHARE
                admissionShare += admBonus
                donationShare += donBonus
                breakdown.push(`💰 PROFIT SHARE (${ref.campusName || 'Normal'}): ${REWARD_RATES.ADMISSION_PROFIT_SHARE * 100}% Adm (₹${admBonus.toLocaleString()}) + ${REWARD_RATES.DONATION_PROFIT_SHARE * 100}% Don (₹${donBonus.toLocaleString()}) = ₹${(admBonus + donBonus).toLocaleString()}`)
            }
        }
    })

    currentYearAmount = slabShare + specialBonusShare + admissionShare + donationShare

    return {
        totalAmount: currentYearAmount + longTermBaseAmount,
        breakdown,
        isLongActive: isActive && isFiveStar,
        longTermBaseAmount,
        currentYearAmount,
        tierPercent: finalTierPercent,
        admissionShare,
        donationShare,
        slabShare,
        specialBonusShare,
        appBonusPercent: appBonusPercentResult
    }
}
