export interface BenefitSlabData {
    slabId: number
    referralCount: number
    yearFeeBenefitPercent: number
    longTermExtraPercent: number
    appBonusPercent: number
    appBonusEligibility: string
    baseLongTermPercent: number
    tierName?: string | null
    description?: string | null
}
