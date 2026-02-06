'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { EmailService } from "@/lib/email-service"
import { smsService } from "@/lib/sms-service"
import { logAction } from "@/lib/audit-logger"
import { revalidatePath } from 'next/cache'

/**
 * Server action to trigger a broadcast to users with missing campus information.
 * Enforces profile updates for Parent, Staff, and Alumni roles.
 */
export async function triggerCampusEnforcementBroadcast() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized: Super Admin access required' }
    }

    try {
        // 1. Identify users requiring update
        const affectedUsers = await prisma.user.findMany({
            where: {
                role: { in: ['Parent', 'Staff', 'Alumni'] },
                campusId: null,
                assignedCampus: null,
                status: { not: 'Deleted' }
            },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                email: true,
                referralCode: true,
                createdAt: true
            }
        })

        if (affectedUsers.length === 0) {
            return { success: true, sentCount: 0, message: 'No users found requiring campus update.' }
        }

        const { notifyCampusUpdateRequired } = await import('@/lib/notification-helper')

        let sentCount = 0
        let smsCount = 0
        let emailCount = 0

        // 2. Process notifications in serial to avoid overwhelming services (or uses Promise.all if services handle it)
        // Given 309 users, serial is safer for rate limits of mock/dev providers
        for (const user of affectedUsers) {
            const referralCode = user.referralCode || 'N/A'
            const regDate = user.createdAt.toLocaleDateString('en-IN')

            // --- SMS Dispatch ---
            const smsMessage = `Dear Ambassador, Your Achariya Partnership Program profile is incomplete. Please update your child's campus information to activate your benefits. Login: https://achariya-app.com Profile -> Update Campus. Referral code: ${referralCode}. Thank you! Achariya Team`

            await smsService.sendAlert(user.mobileNumber, smsMessage)
            smsCount++

            // --- Email Dispatch ---
            if (user.email && !user.email.includes('N/A')) {
                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <div style="background: #b91c1c; color: white; padding: 24px; text-align: center;">
                            <h2 style="margin: 0;">Complete Your Profile</h2>
                        </div>
                        <div style="padding: 24px; color: #374151;">
                            <p>Dear <strong>${user.fullName}</strong>,</p>
                            <p>We noticed that your Achariya Partnership Program (APP) profile is missing campus information for your child.</p>
                            <p>To activate your referral benefits and rewards, please:</p>
                            <ol>
                                <li>Login to your account at <a href="https://5starambassador.com" style="color: #b91c1c;">5starambassador.com</a></li>
                                <li>Go to Profile Settings</li>
                                <li>Update your child's campus information</li>
                            </ol>
                            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 24px;">
                                <p style="margin: 0; font-size: 14px;"><strong>Your Details:</strong></p>
                                <ul style="margin: 8px 0 0 0; font-size: 14px; list-style: none; padding: 0;">
                                    <li>• Mobile: ${user.mobileNumber}</li>
                                    <li>• Referral Code: ${referralCode}</li>
                                    <li>• Registration Date: ${regDate}</li>
                                </ul>
                            </div>
                            <p style="margin-top: 24px; font-size: 14px;">📞 Need help? Contact support at <strong>9363494745</strong></p>
                            <p style="margin-top: 24px; border-top: 1px solid #e5e7eb; pt: 24px;">Best regards,<br/><strong>ACHARIYA PARTNERSHIP PROGRAM TEAM</strong></p>
                        </div>
                    </div>
                `
                await EmailService.sendCampaignEmail(user.email, 'Complete Your Achariya Partnership Program Profile', emailHtml)
                emailCount++
            }

            // --- In-App Dispatch ---
            await notifyCampusUpdateRequired(user.userId, user.fullName)

            sentCount++
        }

        // 3. Log the action
        await logAction('BROADCAST', 'system', `Triggered Campus Enforcement Broadcast to ${sentCount} users`, admin.userId.toString())

        return {
            success: true,
            sentCount,
            smsCount,
            emailCount,
            message: `Broadcast complete. ${sentCount} users notified via In-App, ${smsCount} via SMS, and ${emailCount} via Email.`
        }

    } catch (error: any) {
        console.error('Campus Enforcement Broadcast Error:', error)
        return { success: false, error: error.message || 'Failed to trigger broadcast' }
    }
}

/**
 * Fetches stats for users requiring campus update
 */
export async function getCampusEnforcementStats() {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const count = await prisma.user.count({
            where: {
                role: { in: ['Parent', 'Staff', 'Alumni'] },
                campusId: null,
                assignedCampus: null,
                status: { not: 'Deleted' }
            }
        })

        return { success: true, count }
    } catch (error) {
        return { success: false, error: 'Failed to fetch stats' }
    }
}
