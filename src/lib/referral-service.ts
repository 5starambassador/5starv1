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
export async function generateSmartReferralCode(role: string): Promise<string> {
    const normalizedRole = role.toUpperCase()
    let rolePrefix = 'M' // Default for general members

    if (normalizedRole.includes('PARENT')) rolePrefix = 'P'
    else if (normalizedRole.includes('STAFF')) rolePrefix = 'S'
    else if (normalizedRole.includes('ALUMNI')) rolePrefix = 'A'

    // Count existing users with this role to determine the next number
    // We use a transaction or optimistic locking in a real strict env, 
    // but for this scale, a direct count + 1 is acceptable.
    const roleCount = await prisma.user.count({
        where: { role: role }
    })

    // Format: ACH25-P00001 (Start from 1, pad with 5 zeros)
    // We add 1 to the count to get the next sequence number
    const sequenceNumber = (roleCount + 1).toString().padStart(5, '0')

    const yearSuffix = new Date().getFullYear().toString().slice(-2)

    return `ACH${yearSuffix}-${rolePrefix}${sequenceNumber}`
}
