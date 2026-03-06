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
    const str = String(value).trim()

    // Quick check for scientific notation: contains 'E+' or 'e+'
    if (/[eE]\+/.test(str)) {
        const num = Number(str)
        if (!isNaN(num) && isFinite(num)) {
            // Use Intl.NumberFormat to avoid scientific notation in the output
            // and remove any fractional parts (UTRs/Mobiles are integers)
            return num.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 })
        }
    }
    return str
}
