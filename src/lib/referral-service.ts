import prisma from '@/lib/prisma'

/**
 * Generates a structured referral code based on the user's role.
 * Format: ACH25-[ROLE_PREFIX][SEQUENCE_NUMBER]
 * 
 * Prefixes:
 * - Parent: P
 * - Staff: S
 * - Alumni: A
 * - Default: M (Member)
 * 
 * @param role - The user's role (e.g., 'Parent', 'Staff', 'Alumni')
 * @returns A string like 'ACH25-P00042'
 */
export async function generateSmartReferralCode(role: string, academicYear?: string, offset: number = 0): Promise<string> {
    const normalizedRole = role.toUpperCase()
    let rolePrefix = 'M' // Default for general members

    if (normalizedRole.includes('PARENT')) rolePrefix = 'P'
    else if (normalizedRole.includes('STAFF')) rolePrefix = 'S'
    else if (normalizedRole.includes('ALUMNI')) rolePrefix = 'A'
    else if (normalizedRole.includes('OTHERS')) rolePrefix = 'O'

    // Count existing users with this role to determine the next number
    // We use a transaction or optimistic locking in a real strict env
    const roleCount = await prisma.user.count({
        where: { role: role as any } // Cast to any to bypass strict Enum check if needed, or import UserRole
    })

    // Format: ACH25-P00001
    // Add offset to handle collision retries
    const sequenceNumber = (roleCount + 1 + offset).toString().padStart(5, '0')

    // Determine Year Suffix
    // If academicYear is "2025-2026", we want "25"
    let yearSuffix = new Date().getFullYear().toString().slice(-2)
    if (academicYear) {
        // Extract first 4 digits
        const startYear = academicYear.split('-')[0] // "2025"
        if (startYear && startYear.length === 4) {
            yearSuffix = startYear.slice(-2) // "25"
        }
    }

    return `ACH${yearSuffix}-${rolePrefix}${sequenceNumber}`
}
