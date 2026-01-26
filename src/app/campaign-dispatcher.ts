'use server'

import prisma from '@/lib/prisma'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'

/**
 * Dispatches a campaign to a large audience using Batching.
 * - Emails: Sent via EmailService (Consider internal batching if API supports it, here we loop or use bulk API)
 * - Push: Sent via Firebase Multicast (500 limit)
 * - In-App: Bulk create in DB
 */
export async function dispatchCampaignBatch(campaignId: number) {
    const adminFn = await getFirebaseAdmin() // Initialize Firebase
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return { success: false, error: 'Campaign not found' }

    // 1. Fetch Audience (This query needs to be scalable for millions, but for thousands `findMany` is ok)
    // For 100k+, we would use cursor-based pagination. For now, let's fetch IDs first.

    // Parse Audience
    const audience = (campaign.targetAudience as any) || { role: 'All', campus: 'All', activityStatus: 'All' }

    const where: any = { status: 'Active' }
    if (audience.role !== 'All') where.role = audience.role
    if (audience.campus !== 'All') where.assignedCampus = audience.campus

    // Select minimal fields
    const users = await (prisma.user as any).findMany({
        where,
        select: {
            userId: true,
            fullName: true,
            email: true,
            referralCode: true,
            DeviceToken: {
                select: { token: true }
            }
        }
    })

    if (users.length === 0) return { success: false, error: 'No users match criteria' }

    const isEmail = (campaign as any).channels?.includes('EMAIL')
    const isPush = (campaign as any).channels?.includes('PUSH')
    const isInApp = (campaign as any).channels?.includes('IN_APP')

    const stats = {
        total: users.length,
        emailSent: 0,
        emailFailed: 0,
        pushSent: 0,
        pushFailed: 0
    }

    // 2. Prepare Chunks for Push (Max 500 per chunk for FCM)
    const pushChunks: string[][] = []
    let currentChunk: string[] = []

    // 3. Process Users
    // This part can be slow. In a real background job, we'd use a queue (BullMQ).
    // Here we run it in the Server Action buffer time.

    const notificationsToCreate: any[] = []

    for (const userObj of users) {
        const user = userObj as any
        // Universal Token Aliasing
        const aliasTokens = (text: string) => {
            if (!text) return ''
            return text
                .replace(/{userName}/gi, user.fullName)
                .replace(/{Ambassador}/gi, user.fullName)
                .replace(/{referralCode}/gi, user.referralCode || '')
                .replace(/{code}/gi, user.referralCode || '')
        }

        // A. Email
        if (isEmail && user.email) {
            const subject = aliasTokens(campaign.subject)
            const body = aliasTokens(campaign.templateBody)

            try {
                await EmailService.sendCampaignEmail(user.email, subject, body)
                stats.emailSent++
            } catch (e) {
                stats.emailFailed++
            }
        }

        // B. Push Collection
        if (isPush && user.DeviceToken && user.DeviceToken.length > 0) {
            for (const dtObj of user.DeviceToken) {
                const dt = dtObj as any
                if (dt.token) {
                    currentChunk.push(dt.token)
                    if (currentChunk.length >= 500) {
                        pushChunks.push(currentChunk)
                        currentChunk = []
                    }
                }
            }
        }

        // C. In-App Collection
        if (isInApp) {
            notificationsToCreate.push({
                userId: user.userId,
                title: aliasTokens(campaign.subject),
                // Fix: Merge variables in in-app message too, then strip HTML and truncate
                message: aliasTokens(campaign.templateBody).replace(/<[^>]*>?/gm, '').substring(0, 500),
                type: 'info',
                isRead: false
            })
        }
    }

    // Add remaining push tokens
    if (currentChunk.length > 0) pushChunks.push(currentChunk)

    // 4. Batch Execute Push
    if (isPush && adminFn) {
        for (const chunk of pushChunks) {
            try {
                const response = await adminFn.messaging().sendEachForMulticast({
                    tokens: chunk,
                    notification: {
                        title: campaign.subject,
                        body: 'Tap to view details'
                    },
                    data: {
                        campaignId: campaign.id.toString(),
                        click_action: 'FLUTTER_NOTIFICATION_CLICK' // or URL
                    }
                })

                stats.pushSent += response.successCount
                stats.pushFailed += response.failureCount

                // Cleanup Invalid Tokens
                if (response.failureCount > 0) {
                    const invalidTokens: string[] = []
                    response.responses.forEach((resp: any, idx: number) => {
                        if (!resp.success && (resp.error.code === 'messaging/registration-token-not-registered')) {
                            invalidTokens.push(chunk[idx])
                        }
                    })

                    if (invalidTokens.length > 0) {
                        await (prisma as any).deviceToken.deleteMany({
                            where: { token: { in: invalidTokens } }
                        })
                        console.log(`Cleaned up ${invalidTokens.length} dead tokens`)
                    }
                }

            } catch (e) {
                console.error('Batch Push Error:', e)
            }
        }
    }

    // 5. Bulk Insert In-App Notifications
    if (isInApp && notificationsToCreate.length > 0) {
        // Prisma createMany is fast
        await prisma.notification.createMany({
            data: notificationsToCreate
        })

        // 6. Retention Policy Cleanup
        // Delete notifications older than 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        await prisma.notification.deleteMany({
            where: { createdAt: { lt: thirtyDaysAgo } }
        })
    }

    // 7. Update Campaign Log
    await prisma.campaignLog.create({
        data: {
            campaignId: campaign.id,
            status: 'COMPLETED',
            recipientCount: stats.total,
            sentCount: stats.emailSent + stats.pushSent, // Aggregate
            failedCount: stats.emailFailed + stats.pushFailed
        }
    })

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE', lastRunAt: new Date() }
    })

    return { success: true, stats }
}
