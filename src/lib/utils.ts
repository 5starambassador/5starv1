import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility for merging tailwind classes.
 * Relies on clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Basic input sanitization to prevent XSS in free-text fields.
 * Escapes common HTML characters.
 * @param str - The input string to sanitize.
 * @returns Sanitized string.
 */
export function sanitizeInput(str: string): string {
    if (!str || typeof str !== 'string') return str
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/**
 * Formats a currency value to Indian Rupees (INR).
 * @param amount - Number to format.
 * @returns Formatted currency string.
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount)
}
/**
 * Converts a string that might be in scientific notation (e.g. "6.02E+11")
 * back to a plain numeric string. If the input is not in scientific notation
 * or is not a valid number, it returns the original string.
 * @param value - The string to normalize.
 * @returns Normalized numeric string or original string.
 */
export function normalizeScientificNotation(value: string | null | undefined): string {
    if (!value) return ''
    let str = String(value).trim()

    // 1. Remove Excel formula artifacts if present (e.g. ="\t8227..." or ="8227...")
    if (str.startsWith('="') && str.endsWith('"')) {
        str = str.slice(2, -1)
    }

    // 2. Remove any remaining tabs or non-digit characters that might be used for formatting
    // But keep 'e' or 'E' and '+' and '.' if it's potentially scientific notation
    str = str.replace(/\t/g, '')

    // 3. Check for scientific notation: contains 'E+' or 'e+'
    if (/[eE]\+/.test(str)) {
        const num = Number(str)
        if (!isNaN(num) && isFinite(num)) {
            // Use Intl.NumberFormat to avoid scientific notation in the output
            // and remove any fractional parts (UTRs/Mobiles are integers)
            return num.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 })
        }
    }

    // For plain numbers, also ensure we don't have scientific-looking strings that are actually valid but long
    // If it STILL looks like scientific notation but didn't have E+ (unlikely but safe check)
    if (str.includes('.') && !isNaN(Number(str))) {
        // If it's a whole number disguised as float (e.g. 123.0), clean it
        const num = Number(str)
        if (Number.isInteger(num)) {
            return num.toFixed(0)
        }
    }

    return str
}

/**
 * Normalizes an academic year string from YYYY-YY format to YYYY-YYYY format.
 * Defaults to "2025-2026" if input is invalid.
 * @param year - The year string to normalize.
 * @returns Normalized academic year string.
 */
export function normalizeAcademicYear(year: string | null | undefined): string {
    if (!year) return '2025-2026'
    const trimmed = year.trim()

    // Match YYYY-YY format (e.g., 2026-27)
    const shortFormatRegex = /^(\d{4})-(\d{2})$/
    const match = trimmed.match(shortFormatRegex)

    if (match) {
        const startYear = match[1]
        const shortEndYear = match[2]
        // Assuming we are in the 2000s, convert YY to 20YY
        const fullEndYear = `20${shortEndYear}`
        return `${startYear}-${fullEndYear}`
    }

    return trimmed
}

/**
 * Normalizes grade names for consistent matching (e.g., Roman to Arabic).
 * Handles: "Grade - 8" -> "GRADE-8", "Grade 8" -> "GRADE-8", "Mont I" -> "MONT-1"
 * @param grade - The grade string to normalize.
 * @returns Normalized grade string.
 */
export function normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return ''

    let normalized = grade
        .toUpperCase()                    // Convert to uppercase
        .replace(/\s+/g, ' ')             // Normalize multiple spaces to single space
        .trim()

    // 1. Standardize common prefixes: "PRE MONT" -> "PRE-MONT", "MONT I" -> "MONT-I"
    // This adds a hyphen if missing between the name and the level/number
    normalized = normalized.replace(/^(GRADE|MONT|LKG|UKG|PREMONT|NURSERY|PRE)\s*(\d+|I+V*X*)/, '$1-$2')
    
    // Special case for "PRE-MONT" vs "PRE MONT"
    normalized = normalized.replace(/^PRE\s+MONT/, 'PRE-MONT')

    // Clean up spaces around hyphens (e.g., "GRADE - 1" -> "GRADE-1")
    normalized = normalized.replace(/\s*-\s*/g, '-')

    // 2. Convert Roman numerals to Arabic numbers
    const romanMap: { [key: string]: string } = {
        'XII': '12', 'XI': '11', 'X': '10', 'IX': '9', 'VIII': '8',
        'VII': '7', 'VI': '6', 'V': '5', 'IV': '4', 'III': '3', 'II': '2', 'I': '1'
    }

    // Replace roman numerals (order matters: longest first to avoid partial matches)
    Object.keys(romanMap).forEach(roman => {
        // Match at the end after a hyphen: "GRADE-IV" -> "GRADE-4"
        const hyphenRegex = new RegExp(`-${roman}$`, 'g')
        normalized = normalized.replace(hyphenRegex, `-${romanMap[roman]}`)
        
        // Match at the end after a space: "GRADE IV" -> "GRADE-4"
        const spaceRegex = new RegExp(` ${roman}$`, 'g')
        normalized = normalized.replace(spaceRegex, `-${romanMap[roman]}`)

        // Standalone Roman numerals: "IV" -> "GRADE-4" (Assuming standalone means Grade)
        if (normalized === roman) {
            normalized = `GRADE-${romanMap[roman]}`
        }
    })

    // 3. Final cleanup: If it's just a number "1", assume "GRADE-1"
    if (/^\d+$/.test(normalized)) {
        normalized = `GRADE-${normalized}`
    }

    return normalized
}
