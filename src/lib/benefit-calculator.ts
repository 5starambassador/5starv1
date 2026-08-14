import type { BenefitSlabData } from '@/types/benefit'
import { REWARD_RATES } from './reward-constants'

export const DEBUG_LOGS: string[] = []

export interface ReferralData {
    id: number
    studentName?: string
    parentName?: string
    admissionNumber?: string
    campusId: number
    campusName?: string
    grade: string
    actualFee?: number
    campusGrade1Fee?: number
    admissionFeeCollected?: number
    donationFeeCollected?: number
    specialBonusRate?: number
    createdAt?: Date | string
    confirmedDate?: Date | string | null
    studentCreatedAt?: Date | string | null
    feeDataMissing?: boolean
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
    slabs: BenefitSlabData[],
    forceActivateLongTerm: boolean = false
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
    
    if (referralCount > 0) {
        DEBUG_LOGS.push(`[DEBUG] Calculating benefit for role: ${user.role}, referrals: ${referralCount}`);
    }

    // ACTIVATION LAW: Long Term benefits trigger ONLY if 1+ current referral exists
    const isActive = referralCount >= 1 || forceActivateLongTerm

    let breakdown: string[] = []
    let currentYearAmount = 0
    let longTermBaseAmount = 0
    let finalTierPercent = 0

    let admissionShare = 0
    let donationShare = 0
    let slabShare = 0
    let specialBonusShare = 0
    let appBonusPercentResult = 0

    // SAFETY: Use the dynamic student fee provided in context (Campus + Grade specific)
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
            const cappedCount = Math.min(count, 5)
            const slab = sorted.find(s => s.referralCount === cappedCount) || sorted[sorted.length - 1]
            const basePercent = slab?.yearFeeBenefitPercent || 0
            
            // If count exceeds 5, add 5% for each additional referral
            if (count > 5) {
                return basePercent + ((count - 5) * 5)
            }
            return basePercent
        }

        const tierPercent = getPercent(stdCount)
        finalTierPercent = tierPercent
        const slabName = isFiveStar ? '5-Star Protocol + Growth Slab' : 'Standard Growth Slab'

        // B.1 WING A: Fee Discount TRACK (Parent, Staff with Child)
        const isGroupAWaiver = (user.role === 'Parent' || user.role === 'Staff') && !!user.childInAchariya

        if (isGroupAWaiver) {
            const amount = Math.round((safeStudentFee * tierPercent) / 100)
            slabShare += amount
            breakdown.push(`⚡ FEE WAIVER: ${tierPercent}% Slab Reward (₹${amount.toLocaleString('en-IN')})`)

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
                
                let slicePercent = 0
                const currentTotal = getPercent(count)
                const prevTotal = count === 1 ? 0 : getPercent(count - 1)
                slicePercent = currentTotal - prevTotal

                const g1Fee = ref.campusGrade1Fee || 0  // 0 when fee not seeded; UI shows N/A
                const amount = Math.round((g1Fee * slicePercent) / 100)
                slabShare += amount
                breakdown.push(`🔥 REF-${count}: ${slicePercent}% Slab Reward (₹${amount.toLocaleString('en-IN')})`)
            })
        }
    }

    // 3. New Incentive Integration: 80% Admission + 50% Donation (Normal Logic Only)
    currentReferrals.forEach(ref => {
        if (!ref.specialBonusRate) {
            const admFee = (ref as any).admissionFeeCollected || 0
            const donFee = (ref as any).donationFeeCollected || 0

            if (admFee > 0 || donFee > 0) {
                const admBonus = Math.round(admFee * REWARD_RATES.ADMISSION_PROFIT_SHARE)
                const donBonus = Math.round(donFee * REWARD_RATES.DONATION_PROFIT_SHARE)
                
                if (referralCount > 0) {
                    DEBUG_LOGS.push(`[DEBUG] Ref ID: ${ref.id}, AdmFee: ${admFee}, AdmBonus: ${admBonus}`);
                }

                admissionShare += admBonus
                donationShare += donBonus

                if (admBonus > 0) {
                    breakdown.push(`💰 ADMISSION FEE SHARE: 80% of ₹${admFee.toLocaleString('en-IN')} = ₹${admBonus.toLocaleString('en-IN')}`)
                }
                if (donBonus > 0) {
                    breakdown.push(`💰 DONATION FEE SHARE: 50% of ₹${donFee.toLocaleString('en-IN')} = ₹${donBonus.toLocaleString('en-IN')}`)
                }
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
