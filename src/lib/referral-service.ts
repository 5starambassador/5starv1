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

    const yearSuffix = new Date().getFullYear().toString().slice(-2)
    const basePrefix = `ACH${yearSuffix}-${rolePrefix}`

    // Find the latest user with this prefix to determine the next number
    const lastUser = await prisma.user.findFirst({
        where: {
            referralCode: {
                startsWith: basePrefix
            }
        },
        orderBy: {
            referralCode: 'desc'
        },
        select: {
            referralCode: true
        }
    })

    let nextNumber = 1

    if (lastUser && lastUser.referralCode) {
        // Extract the number part: ACH25-P00042 -> 42
        const parts = lastUser.referralCode.split(rolePrefix)
        const lastNumStr = parts[parts.length - 1] // Get the last part
        const lastNum = parseInt(lastNumStr, 10)

        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1
        }
    }

    // Add offset for retries
    nextNumber += offset

    const sequenceNumber = nextNumber.toString().padStart(5, '0')
    return `${basePrefix}${sequenceNumber}`
}
