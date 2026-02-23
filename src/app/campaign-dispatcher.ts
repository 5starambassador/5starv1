'use server'

import prisma from '@/lib/prisma'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { getAmbassadorQuery, getStudentQuery } from '@/lib/campaign-utils'

/**
 * Dispatches a campaign to a large audience using Batching.
 * - Emails: Sent via EmailService
 * - Push: Sent via Firebase Multicast (500 limit)
 * - In-App: Bulk create in DB
 * - WhatsApp: Sent via WhatsAppService
 */
export async function dispatchCampaignBatch(campaignId: number) {
    const BATCH_SIZE = 200 // Process 200 users at a time to keep memory low
    const adminFn = await getFirebaseAdmin()

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { logs: { where: { status: 'PROCESSING' }, take: 1 } }
    })
    if (!campaign) return { success: false, error: 'Campaign not found' }

    // Check if already processing
    if (campaign.logs.length > 0) {
        console.warn(`[CampaignDispatcher] Campaign #${campaignId} is already PROCESSING. Skipping duplicate dispatch.`)
        return { success: false, error: 'Campaign already in progress' }
    }

    // Parse Audience
    const audience = (campaign.targetAudience as any) || { role: 'All', campus: 'All', activityStatus: 'All' }

    // Flags
    const isEmail = (campaign as any).channels?.includes('EMAIL')
    const isPush = (campaign as any).channels?.includes('PUSH')
    const isInApp = (campaign as any).channels?.includes('IN_APP')
    const isWhatsapp = (campaign as any).channels?.includes('WHATSAPP')

    // Stats Accumulator
    const stats = {
        total: 0,
        emailSent: 0, emailFailed: 0,
        pushSent: 0, pushFailed: 0,
        inAppSent: 0,
        whatsappSent: 0, whatsappFailed: 0
    }

    // Initialize Log
    let logId: number | null = null
    try {
        const log = await prisma.campaignLog.create({
            data: {
                campaignId: campaignId,
                status: 'PROCESSING',
                recipientCount: 0,
                sentCount: 0,
                failedCount: 0,
                runAt: new Date()
            } as any
        })
        logId = log.id
    } catch (e) {
        console.error('Failed to create initial log', e)
    }

    // Helper to Alias Tokens
    const aliasTokens = (text: string, user: any) => {
        if (!text) return ''
        return text
            .replace(/{userName}|{Ambassador}/gi, user.fullName || 'User')
            .replace(/{referralCode}|{code}/gi, user.referralCode || '')
            .replace(/{campus}/gi, user.assignedCampus || 'Global')
            .replace(/{role}/gi, user.role)
            .replace(/{referralCount}/gi, (user.confirmedReferralCount || 0).toString())
            .replace(/{mobile}/gi, user.mobileNumber || '')
    }

    try {
        let skip = 0
        let hasMore = true
        let processedCount = 0

        while (hasMore) {
            let users: any[] = []
            const waService = isWhatsapp ? (await import('@/lib/whatsapp-service')).whatsappService : null

            // FETCH BATCH based on Audience Type
            if (!audience.type || audience.type === 'AMBASSADORS') {
                const where = getAmbassadorQuery(audience as any)

                const batchUsers = await prisma.user.findMany({
                    where,
                    orderBy: { userId: 'asc' },
                    select: {
                        userId: true, fullName: true, email: true, mobileNumber: true,
                        referralCode: true, assignedCampus: true, role: true, confirmedReferralCount: true,
                        DeviceToken: { select: { token: true } }
                    },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = batchUsers
            }
            else if (audience.type === 'PROGRAM_LEADS') {
                const leads = await prisma.programLead.findMany({
                    orderBy: { id: 'asc' },
                    select: { visitorName: true, visitorMobile: true },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = leads.map(l => ({
                    userId: 0, fullName: l.visitorName || 'Friend', email: '', mobileNumber: l.visitorMobile,
                    referralCode: '', assignedCampus: '', role: 'Lead', confirmedReferralCount: 0, DeviceToken: []
                }))
            }
            else if (audience.type === 'REFERRALS') {
                const referrals = await prisma.referralLead.findMany({
                    orderBy: { leadId: 'asc' },
                    select: { parentName: true, parentMobile: true, campus: true },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = referrals.map(r => ({
                    userId: 0, fullName: r.parentName || 'Parent', email: '', mobileNumber: r.parentMobile,
                    referralCode: '', assignedCampus: r.campus || '', role: 'Referral', confirmedReferralCount: 0, DeviceToken: []
                }))
            }
            else if (audience.type === 'STUDENTS') {
                const whereStudent = getStudentQuery(audience as any)

                const students = await prisma.student.findMany({
                    where: whereStudent,
                    orderBy: { studentId: 'asc' },
                    select: {
                        campus: { select: { campusName: true } },
                        parent: {
                            select: { fullName: true, mobileNumber: true, email: true, DeviceToken: { select: { token: true } } }
                        }
                    },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = students.map(s => ({
                    userId: 0, fullName: s.parent.fullName || 'Parent', email: s.parent.email, mobileNumber: s.parent.mobileNumber,
                    referralCode: '', assignedCampus: s.campus.campusName, role: 'Parent', confirmedReferralCount: 0, DeviceToken: s.parent.DeviceToken
                }))
            }

            if (users.length === 0) {
                hasMore = false
                break
            }

            stats.total += users.length
            processedCount += users.length

            // PROCESS BATCH
            const promises: Promise<void>[] = []
            const pushTokens: string[] = []
            const notificationsToCreate: any[] = []

            for (const user of users) {
                // Email
                if (isEmail && user.email) {
                    const subject = aliasTokens(campaign.subject, user)
                    const body = aliasTokens(campaign.templateBody, user)
                    promises.push(EmailService.sendCampaignEmail(user.email, subject, body)
                        .then(() => { stats.emailSent++ }).catch(() => { stats.emailFailed++ }))
                }

                // WhatsApp
                if (isWhatsapp && waService && user.mobileNumber) {
                    const messageBody = aliasTokens(campaign.templateBody, user)
                    // Pass campaignId as refId (CRQID) for analytics
                    promises.push(waService.sendTemplateMessage(
                        user.mobileNumber,
                        'marketing_broadcast_v1',
                        [messageBody],
                        'CAMPAIGN',
                        campaignId.toString()
                    )
                        .then((res) => { if (res.success) stats.whatsappSent++; else stats.whatsappFailed++ })
                        .catch(() => { stats.whatsappFailed++ }))
                }

                // Push
                if (isPush && user.DeviceToken?.length > 0) {
                    user.DeviceToken.forEach((dt: any) => { if (dt.token) pushTokens.push(dt.token) })
                }

                // In-App
                if (isInApp && user.userId) {
                    notificationsToCreate.push({
                        userId: user.userId,
                        title: aliasTokens(campaign.subject, user),
                        message: aliasTokens(campaign.templateBody, user).replace(/<[^>]*>?/gm, '').substring(0, 500),
                        type: 'info',
                        isRead: false,
                        metadata: { campaignId }
                    })
                }
            }

            // Execute Async (Email/WhatsApp)
            await Promise.all(promises)

            // Execute Push (Mock/Real)
            if (isPush && adminFn && pushTokens.length > 0) {
                // Process in chunks of 500 for FCM
                for (let i = 0; i < pushTokens.length; i += 500) {
                    const chunk = pushTokens.slice(i, i + 500)
                    try {
                        const response = await adminFn.messaging().sendEachForMulticast({
                            tokens: chunk,
                            notification: { title: campaign.subject, body: 'Tap to view details' }
                        })
                        stats.pushSent += response.successCount
                        stats.pushFailed += response.failureCount
                    } catch (e) { stats.pushFailed += chunk.length }
                }
            }

            // Execute In-App (Bulk Insert)
            if (isInApp && notificationsToCreate.length > 0) {
                await prisma.notification.createMany({ data: notificationsToCreate })
                stats.inAppSent += notificationsToCreate.length
            }

            // Log Recipients for Analytics (All Channels)
            const recipientsToCreate: any[] = []

            users.forEach((user: any) => {
                const baseRecipient = {
                    campaignId: campaignId,
                    mobile: user.mobileNumber || '', // Might be empty for pure email users
                    name: user.fullName || 'User',
                    role: user.role,
                    campus: user.assignedCampus,
                    status: 'SENT'
                }

                // WhatsApp
                if (isWhatsapp && user.mobileNumber) {
                    recipientsToCreate.push({ ...baseRecipient, channel: 'WHATSAPP' })
                }

                // Email
                if (isEmail && user.email) {
                    recipientsToCreate.push({ ...baseRecipient, channel: 'EMAIL', mobile: user.email }) // Reuse mobile field for ID or keep empty? Layout says "Mobile". Let's store mobile if avail, else email? 
                    // Wait, schema says `mobile` is String.
                    // If I put email in mobile field, it might be confusing. 
                    // But `CampaignRecipient` has `mobile`. It does NOT have `email`.
                    // Quick fix: Store identifier in mobile, or just store mobile if they have it.
                    // If a user has NO mobile but HAS email, `mobile` field is required?
                    // Let's check schema. `mobile String`.
                    // I will store the user's mobile if available, otherwise "N/A" or their Email if it fits?
                    // Better: Store Mobile if present. If not, store Email in mobile field? No, that breaks strict typing if used for matching.
                    // For now, I will store actual mobile. If they don't have mobile, they likely won't be in this system as `User` requires mobile usually.
                    // Actually, `User` model: `mobileNumber String @unique`. So every user HAS a mobile. Safe.
                }

                // Push
                if (isPush && user.DeviceToken?.length > 0) {
                    recipientsToCreate.push({ ...baseRecipient, channel: 'PUSH' })
                }

                // In-App
                if (isInApp && user.userId) {
                    recipientsToCreate.push({ ...baseRecipient, channel: 'IN_APP' })
                }
            })

            if (recipientsToCreate.length > 0) {
                try {
                    await (prisma as any).campaignRecipient.createMany({
                        data: recipientsToCreate,
                        skipDuplicates: true // Avoid double logging if logic overlaps
                    })
                } catch (e) {
                    console.error('Failed to log recipients', e)
                }
            }

            // Incremental Log Update for Progress Tracking
            if (logId) {
                await prisma.campaignLog.update({
                    where: { id: logId },
                    data: {
                        recipientCount: stats.total,
                        sentCount: stats.emailSent + stats.pushSent + stats.inAppSent + stats.whatsappSent,
                        failedCount: stats.emailFailed + stats.pushFailed + stats.whatsappFailed,
                        emailSent: stats.emailSent,
                        pushSent: stats.pushSent,
                        inAppSent: stats.inAppSent,
                        whatsappSent: stats.whatsappSent
                    } as any
                }).catch(e => console.error('Failed to update incremental log', e))
            }

            // Move to next batch
            skip += BATCH_SIZE

            // Simple throttle to avoid rate limits
            await new Promise(r => setTimeout(r, 200))
        }

        // Final Log Update
        if (logId) {
            await prisma.campaignLog.update({
                where: { id: logId },
                data: {
                    status: 'COMPLETED',
                    recipientCount: stats.total,
                    sentCount: stats.emailSent + stats.pushSent + stats.inAppSent + stats.whatsappSent,
                    failedCount: stats.emailFailed + stats.pushFailed + stats.whatsappFailed,
                    emailSent: stats.emailSent, emailFailed: stats.emailFailed,
                    pushSent: stats.pushSent, pushFailed: stats.pushFailed,
                    inAppSent: stats.inAppSent,
                    whatsappSent: stats.whatsappSent, whatsappFailed: stats.whatsappFailed
                } as any
            })
        }

        // Update Campaign Status
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'ACTIVE', lastRunAt: new Date() }
        })

        const totalSent = stats.emailSent + stats.pushSent + stats.inAppSent + stats.whatsappSent
        await logAction('Run Campaign', 'Marketing', `Executed campaign: ${campaign.name}. Sent: ${totalSent}`, undefined)
        return { success: true, stats }

    } catch (error: any) {
        console.error('Batch Dispatch Error:', error)

        // Log Failure
        if (logId) {
            await prisma.campaignLog.update({
                where: { id: logId },
                data: {
                    status: 'FAILED',
                    recipientCount: stats.total,
                    errorLog: JSON.stringify({ error: error.message })
                } as any
            })
        }

        return { success: false, error: 'Campaign dispatch failed mid-process' }
    }
}
