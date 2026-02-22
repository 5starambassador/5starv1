'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { EmailService } from "@/lib/email-service"
import { smsService } from "@/lib/sms-service"
import { logAction } from "@/lib/audit-logger"
import { revalidatePath } from 'next/cache'

/**
 * Schedules a broadcast to users with missing campus information.
 */
export async function triggerCampusEnforcementBroadcast() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized: Super Admin access required' }
    }

    try {
        // 1. Check for existing pending job
        const existingJob = await prisma.job.findFirst({
            where: {
                type: 'SYSTEM_ENFORCEMENT',
                status: 'PENDING'
            }
        })

        if (existingJob) {
            return { success: false, error: 'Campus enforcement is already scheduled and awaiting processing.' }
        }

        // 2. Create Background Job
        await prisma.job.create({
            data: {
                type: 'SYSTEM_ENFORCEMENT',
                status: 'PENDING',
                payload: {}
            }
        })

        await logAction('Schedule Campus Enforcement', 'system', `Scheduled campus enforcement broadcast`, admin.userId.toString())

        return {
            success: true,
            message: 'Enforcement broadcast scheduled successfully.'
        }

    } catch (error: any) {
        console.error('Campus Enforcement Schedule Error:', error)
        return { success: false, error: error.message || 'Failed to schedule broadcast' }
    }
}

/**
 * Internal logic for executing campus enforcement (moved from public action)
 */
export async function executeCampusEnforcementLogic() {
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
        return { success: true, sentCount: 0 }
    }

    const { notifyCampusUpdateRequired } = await import('@/lib/notification-helper')

    let sentCount = 0
    let smsCount = 0
    let emailCount = 0

    // Process notifications
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

    return { sentCount, smsCount, emailCount }
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
