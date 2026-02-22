import { createNotification } from '@/app/notification-actions'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { whatsappService } from '@/lib/whatsapp-service'

/**
 * Centralized notification helper for the 5-Star Ambassador program
 * All notification templates and logic in one place
 */

interface ReferralDetails {
    parentName: string
    leadId: number
    status?: string
}

interface AmbassadorDetails {
    fullName: string
    userId: number
}

/**
 * Notify ambassador when they submit a new referral
 */
export async function notifyReferralSubmitted(userId: number, referralDetails: ReferralDetails) {
    return createNotification({
        userId,
        title: '🎉 Referral Submitted Successfully',
        message: `Your referral for ${referralDetails.parentName} has been submitted. We'll review the application soon.`,
        type: 'success',
        link: '/referrals'
    })
}

/**
 * Notify admin when a new referral is submitted
 */
export async function notifyAdminNewReferral(adminId: number, referralDetails: ReferralDetails, ambassadorDetails: AmbassadorDetails) {
    return createNotification({
        adminId,
        title: '🔔 New Referral Submitted',
        message: `${ambassadorDetails.fullName} submitted a referral for ${referralDetails.parentName}`,
        type: 'info',
        link: `/admin/referrals/${referralDetails.leadId}`
    })
}

/**
 * Notify ambassador when referral status changes
 */
export async function notifyReferralStatusChanged(
    userId: number,
    referralDetails: ReferralDetails,
    oldStatus: string,
    newStatus: string
) {
    const statusEmojis: Record<string, string> = {
        'Contacted': '📞',
        'Follow-up': '📋',
        'Interested': '👍',
        'Confirmed': '✅',
        'Rejected': '❌',
        'Admitted': '🎓'
    }

    return createNotification({
        userId,
        title: `${statusEmojis[newStatus] || '📋'} Referral Status Updated`,
        message: `${referralDetails.parentName}'s referral changed from ${oldStatus} to ${newStatus}`,
        type: newStatus === 'Confirmed' || newStatus === 'Admitted' ? 'success' : 'info',
        link: '/referrals'
    })
}

/**
 * Notify ambassador when referral is confirmed (special celebration!)
 */
export async function notifyReferralConfirmed(userId: number, referralDetails: ReferralDetails, currentCount: number) {
    const message = currentCount >= 5
        ? `🌟 Congratulations! ${referralDetails.parentName} has been confirmed. You've achieved 5-Star status!`
        : `Great news! ${referralDetails.parentName} has been confirmed. You now have ${currentCount} confirmed referral${currentCount > 1 ? 's' : ''}!`

    const notifResult = await createNotification({
        userId,
        title: '✅ Referral Confirmed!',
        message,
        type: 'success',
        link: '/dashboard'
    })

    // WhatsApp Alert: Referral Confirmed
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { mobileNumber: true }
        })
        if (user?.mobileNumber) {
            // Template: "Great news! {{1}}'s referral has been confirmed. You now have {{2}} confirmed referrals!"
            await whatsappService.sendByEvent(
                user.mobileNumber,
                "REFERRAL_CONFIRMED",
                [referralDetails.parentName, currentCount.toString()],
                'ALERT'
            )
        }
    } catch (waError) {
        console.error('WhatsApp Confirmation Alert Failed:', waError)
    }

    return notifResult
}

/**
 * Notify ambassador when referral is rejected
 */
export async function notifyReferralRejected(userId: number, referralDetails: ReferralDetails, reason?: string) {
    return createNotification({
        userId,
        title: 'Referral Status Update',
        message: `${referralDetails.parentName}'s referral was not confirmed${reason ? `: ${reason}` : ''}. Keep referring - you're doing great!`,
        type: 'warning',
        link: '/referrals'
    })
}

/**
 * Special notification when ambassador achieves 5-Star status! 🌟
 */
export async function notifyFiveStarAchievement(userId: number, userName: string) {
    const notifResult = await createNotification({
        userId,
        title: '🌟⭐ PRESTIGIOUS PARTNER STATUS ACHIEVED!',
        message: `Congratulations ${userName}! You've unlocked Prestigious Partner status! Your exclusive badge is now displayed on your dashboard. Thank you for your amazing contribution!`,
        type: 'success',
        link: '/dashboard'
    })

    // WhatsApp Alert: 5-Star Achievement
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { mobileNumber: true }
        })
        if (user?.mobileNumber) {
            // Template: "🌟 Congratulations {{1}}! You've achieved 5-Star status!"
            await whatsappService.sendByEvent(user.mobileNumber, "FIVE_STAR_ACHIEVEMENT", [userName], 'ALERT')
        }
    } catch (waError) {
        console.error('WhatsApp 5-Star Alert Failed:', waError)
    }

    return notifResult
}

/**
 * Notify ambassador when settlement is approved
 */
export async function notifySettlementApproved(userId: number, amount: number, settlementId: number) {
    return createNotification({
        userId,
        title: '💰 Settlement Approved',
        message: `Your settlement of ₹${amount.toLocaleString('en-IN')} has been approved and will be processed shortly.`,
        type: 'success',
        link: '/analytics#settlements'
    })
}

/**
 * Notify ambassador when settlement is processed
 */
export async function notifySettlementProcessed(userId: number, amount: number, paymentMethod: string) {
    const notifResult = await createNotification({
        userId,
        title: '✅ Settlement Processed',
        message: `Your settlement of ₹${amount.toLocaleString('en-IN')} has been successfully processed via ${paymentMethod}.`,
        type: 'success',
        link: '/analytics#settlements'
    })

    // WhatsApp Alert: Settlement Processed
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { mobileNumber: true }
        })
        if (user?.mobileNumber) {
            // Template: "Your settlement of ₹{{1}} has been processed successfully. Thank you!"
            await whatsappService.sendByEvent(
                user.mobileNumber,
                "SETTLEMENT_PROCESSED",
                [amount.toLocaleString('en-IN')],
                'ALERT'
            )
        }
    } catch (waError) {
        console.error('WhatsApp Settlement Alert Failed:', waError)
    }

    return notifResult
}

/**
 * Notify admin about account deletion request
 */
export async function notifyAdminDeletionRequest(adminId: number, userDetails: { fullName: string, userId: number, role: string }) {
    return createNotification({
        adminId,
        title: '⚠️ Account Deletion Requested',
        message: `${userDetails.fullName} (${userDetails.role}) has requested account deletion`,
        type: 'warning',
        link: `/admin/users/${userDetails.userId}`
    })
}

/**
 * Notify admin about new support ticket
 */
export async function notifyAdminNewTicket(adminId: number, ticketDetails: { subject: string, userId: number, userName: string, ticketId: number }) {
    return createNotification({
        adminId,
        title: '🎫 New Support Ticket',
        message: `${ticketDetails.userName} opened: "${ticketDetails.subject}"`,
        type: 'info',
        link: `/admin/support/${ticketDetails.ticketId}`
    })
}

/**
 * Notify user when their support ticket receives a response
 */
export async function notifyTicketResponse(userId: number, ticketDetails: { subject: string, ticketId: number }) {
    const notifResult = await createNotification({
        userId,
        title: '💬 Support Ticket Update',
        message: `New response on your ticket: "${ticketDetails.subject}"`,
        type: 'info',
        link: `/support/${ticketDetails.ticketId}`
    })

    // WhatsApp Alert: Ticket Response
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { mobileNumber: true }
        })
        if (user?.mobileNumber) {
            // Template: "Hi! There is a new response on your support ticket: {{1}}. Please log in to view."
            await whatsappService.sendByEvent(user.mobileNumber, "TICKET_RESPONSE", [ticketDetails.subject], 'ALERT')
        }
    } catch (waError) {
        console.error('WhatsApp Ticket Alert Failed:', waError)
    }

    return notifResult
}

/**
 * Notify ambassador when their verification is approved
 */
export async function notifyVerificationApproved(userId: number) {
    const notifResult = await createNotification({
        userId,
        title: '✅ Verification Approved',
        message: 'Congratulations! Your ambassador verification has been approved. You are now eligible to earn referral benefits and track your performance.',
        type: 'success',
        link: '/dashboard'
    })

    // WhatsApp Alert: Verification Approved
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { mobileNumber: true, fullName: true }
        })
        if (user?.mobileNumber) {
            // Template: kyc_approved (Name, Link)
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambassador.achariya.in'
            await whatsappService.sendByEvent(
                user.mobileNumber,
                "KYC_APPROVED",
                [user.fullName || 'Ambassador', `${baseUrl}/dashboard`],
                'ALERT'
            )
        }
    } catch (waError) {
        console.error('WhatsApp Verification Approval Alert Failed:', waError)
    }

    return notifResult
}

/**
 * Notify ambassador when their verification is rejected
 */
export async function notifyVerificationRejected(userId: number, reason?: string) {
    const notifResult = await createNotification({
        userId,
        title: '❌ Verification Update',
        message: `Your ambassador verification was not successful${reason ? `: ${reason}` : ''}. Please review your profile details and contact support if you have questions.`,
        type: 'error',
        link: '/profile'
    })

    // WhatsApp Alert: Verification Rejected
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { mobileNumber: true, fullName: true }
        })
        if (user?.mobileNumber) {
            // Template: kyc_rejected (Name, Reason)
            await whatsappService.sendByEvent(
                user.mobileNumber,
                "KYC_REJECTED",
                [user.fullName || 'Ambassador', reason || 'Details provided are incomplete/incorrect'],
                'ALERT'
            )
        }
    } catch (waError) {
        console.error('WhatsApp Verification Rejection Alert Failed:', waError)
    }

    return notifResult
}

/**
 * Notify ambassador when a refund is processed (including historical syncs)
 */
export async function notifyRefundProcessed(userId: number, studentName?: string) {
    return createNotification({
        userId,
        title: '💰 Refund Processed',
        message: `Great news! The registration fee refund for ${studentName || 'your referral'} has been successfully processed.`,
        type: 'success',
        link: '/finance'
    })
}

/**
 * Notify ambassador when a lead is successfully admitted (converted to student)
 */
export async function notifyReferralAdmitted(userId: number, studentName: string) {
    return createNotification({
        userId,
        title: '🎓 Student Admitted!',
        message: `Excellent work! ${studentName} has been officially admitted. This referral is now active in your student list.`,
        type: 'success',
        link: '/referrals'
    })
}

/**
 * Notify all users (Broadcast) about a new external program/campaign
 */
export async function notifyProgramLaunch(programTitle: string, slug: string) {
    const { createNotification } = await import('@/app/notification-actions')

    // We fetch all active users
    const activeUsers = await prisma.user.findMany({
        where: { status: 'Active' },
        select: { userId: true, mobileNumber: true }
    })

    if (activeUsers.length === 0) return

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambassador.achariya.in'
    const programUrl = `${baseUrl}/dashboard/gallery/${slug}`

    // NEW: WhatsApp Broadcast to Active Users
    const { whatsappService } = await import('@/lib/whatsapp-service');

    // We run this in background (no await) to not block the UI response
    // In production, this should be a Queue Job (BullMQ)
    (async () => {
        console.log(`[Broadcast] Starting WhatsApp dispatch for: ${programTitle}`)
        let sentCount = 0
        for (const user of activeUsers) {
            if (user.mobileNumber) {
                // Use generic template or specific if created
                // Template: program_launch_v1
                // Vars: [Title, Link]
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'PROGRAM_LAUNCH',
                    [programTitle, programUrl],
                    'CAMPAIGN'
                )
                sentCount++
                // Simple throttle to avoid hitting rate limits instantly
                await new Promise(r => setTimeout(r, 100))
            }
        }
        console.log(`[Broadcast] Completed. Sent approx ${sentCount} messages.`)
    })()

    // Batch create notifications for all active users
    await prisma.notification.createMany({
        data: activeUsers.map((user: { userId: number }) => ({
            userId: user.userId,
            title: '🚀 New Program Launched!',
            message: `A new program "${programTitle}" is now live in the gallery. Start referring and earn rewards! Check it out here: ${programUrl}`,
            type: 'success',
            link: `/dashboard/gallery/${slug}`
        }))
    })

    const { logAction } = await import('@/lib/audit-logger')
    return logAction('Broadcast Program Launch', 'Marketing', `Launched program: ${programTitle} to ${activeUsers.length} active users`, undefined)
}

/**
 * Notify new user with a Welcome Message
 */
export async function notifyWelcome(userId: number, userName: string) {
    return createNotification({
        userId,
        title: '🎉 Welcome to Achariya Partnership Program (APP)!',
        message: `Welcome ${userName}! We're thrilled to have you. Complete your profile and start referring to earn rewards!`,
        type: 'success',
        link: '/marketing'
    })
}

/**
 * Notify user that campus update is required to activate benefits
 */
export async function notifyCampusUpdateRequired(userId: number, userName: string) {
    const { createNotification } = await import('@/app/notification-actions')

    return createNotification({
        userId,
        title: '⚠️ Campus Information Required',
        message: `Dear ${userName}, please update your child's campus in Profile Settings to activate your referral benefits.`,
        type: 'warning',
        link: '/profile'
    })
}
