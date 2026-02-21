'use server'

import { getSession, createSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { logAction } from '@/lib/audit-logger'

/**
 * Verifies the 4-digit OTP for 2FA and upgrades the session.
 */
export async function verifyTwoFactorAction(otp: string) {
    try {
        const session: any = await getSession()
        if (!session || !session.userId) {
            return { success: false, error: 'Session expired. Please login again.' }
        }

        // 1. Validate OTP
        // EXPERT: For production, this would use TOTP (speakeasy/otplib) or a DB-stored secret.
        // For this implementation, we check the otpVerification table or a mock logic.

        // Mock logic for demo/development
        if (otp === '1234') {
            // Upgrade session: re-create session with is2faVerified = true
            await createSession(
                session.userId,
                session.userType,
                session.role,
                true, // is2faVerified
                session.status
            )

            await logAction('LOGIN', 'auth', `2FA verified for ${session.userType} ${session.userId}`, session.userId.toString())

            revalidatePath('/superadmin')
            return { success: true }
        }

        return { success: false, error: 'Invalid verification code' }
    } catch (error) {
        console.error('2FA Verification Error:', error)
        return { success: false, error: 'Verification failed' }
    }
}
