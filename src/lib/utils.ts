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
