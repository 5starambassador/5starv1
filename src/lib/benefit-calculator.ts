// Source: "ACHARIYA PARTNERSHIP PROGRAM (APP) - 25th Year Pongal Special Offer"
// Table: "HEAVY GAIN BENEFITS – REFERRAL BASED"
// Matches the "Aggressive" marketing promise.
export const SHORT_TERM_TIERS = [
    { count: 1, percent: 5 },
    { count: 2, percent: 10 },
    { count: 3, percent: 25 },
    { count: 4, percent: 30 },
    { count: 5, percent: 50 },
]

export interface BenefitTier {
    count: number
    percent: number
}

export function calculateBenefitPercent(count: number, customTiers?: BenefitTier[]): number {
    const tiers = customTiers && customTiers.length > 0 ? customTiers : SHORT_TERM_TIERS
    // Sort logic just in case customTiers is unsorted
    const sorted = [...tiers].sort((a, b) => a.count - b.count)

    // Logic: Find highest tier where count >= t.count
    // Example: Count 5. Tiers: 1,2,3,4,5. 
    // .reverse changes to 5,4,3,2,1. 
    // find 5 >= 5 (True) -> Returns 50%. Correct.
    const tier = sorted.reverse().find(t => count >= t.count)
    return tier ? tier.percent : 0
}

// Source: Implied Long Term Logic
// Base 15% + Bonus
export function calculateLongTermBenefit(count: number): { base: number, bonus: number, total: number } {
    if (count < 1) return { base: 0, bonus: 0, total: 0 }

    // Hardcoded per UI "15% Base" + "5% per Ref" implication? 
    // Or Seed logic? 
    // We will align with the UI's "15% Base" text and Seed's "Bonus" structure (placeholder).
    // For now, let's map Seed Logic (0,0,2,3,5) relative to count?
    // Actually, user wants "check".
    // I'll implement a clean structure: 15% Base for everyone > 0.
    const base = 15
    // Bonus: 5% per referral? or fixed? using 5% * count for 'Per Ref' text accuracy.
    const bonus = count * 5

    return { base, bonus, total: base + bonus }
}

export function calculateBenefitAmount(volume: number, percent: number): number {
    if (!volume || !percent) return 0
    return (volume * percent) / 100
}
