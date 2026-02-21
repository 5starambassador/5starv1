/**
 * Centralize all reward rates and business logic percentages here.
 */
export const SPECIAL_CAMPUS_RATES: Record<string, number> = {
    'ACET': 5000,
    'AASC': 2000,
    'ACCHM': 2000
};

export const REWARD_RATES = {
    ADMISSION_PROFIT_SHARE: 0.8, // 80%
    DONATION_PROFIT_SHARE: 0.5,  // 50%
    HISTORIC_BASE_YIELD: 0.03,   // 3% (5-Star previous year referrals)
    APP_BONUS_DEFAULT: 0.05      // 5%
};

/**
 * Campuses that offer flat rewards instead of slab-based benefits.
 * Referrals to these campuses are EXCLUDED from the ambassador's slab/star count.
 */
export const EXCLUDED_FROM_SLAB = Object.keys(SPECIAL_CAMPUS_RATES);

/**
 * Helper to check if a campus is eligible for special flat rewards.
 */
export function getSpecialBonusRate(campusName: string | null | undefined): number {
    if (!campusName) return 0;

    // Normalize campus name (handle case-insensitive matches if needed)
    const normalized = campusName.trim().toUpperCase();

    // Exact matches
    if (SPECIAL_CAMPUS_RATES[normalized]) {
        return SPECIAL_CAMPUS_RATES[normalized];
    }

    // Substring matches for common variations
    for (const [key, value] of Object.entries(SPECIAL_CAMPUS_RATES)) {
        if (normalized.includes(key)) {
            return value;
        }
    }

    return 0;
}
