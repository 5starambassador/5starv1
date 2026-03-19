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
 * @param grade - The grade string to normalize.
 * @returns Normalized grade string.
 */
export function normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return ''

    let normalized = grade
        .toUpperCase()                    // Convert to uppercase
        .replace(/\s+/g, ' ')             // Normalize multiple spaces to single space
        .replace(/\s*-\s*/g, '-')         // Remove spaces around hyphens
        .trim()

    // Convert Roman numerals to Arabic numbers
    const romanMap: { [key: string]: string } = {
        'I': '1',
        'II': '2',
        'III': '3',
        'IV': '4',
        'V': '5',
        'VI': '6',
        'VII': '7',
        'VIII': '8',
        'IX': '9',
        'X': '10',
        'XI': '11',
        'XII': '12'
    }

    // Replace roman numerals at the end of grade names
    // e.g., "MONT-II" -> "MONT-2", "GRADE-XII" -> "GRADE-12"
    Object.keys(romanMap).forEach(roman => {
        const regex = new RegExp(`-${roman}$`, 'g')
        normalized = normalized.replace(regex, `-${romanMap[roman]}`)
        // Also handle space separator
        const spaceRegex = new RegExp(` ${roman}$`, 'g')
        normalized = normalized.replace(spaceRegex, `-${romanMap[roman]}`)
    })

    return normalized
}
