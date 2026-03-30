'use server'

import prisma from '@/lib/prisma'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { getAmbassadorQuery, getStudentQuery, getReferralQuery, getProgramLeadQuery } from '@/lib/campaign-utils'
import { encryptReferralCode } from '@/lib/crypto'

/**
 * Dispatches a campaign to a large audience using Batching.
 * - Emails: Sent via EmailService
 * - Push: Sent via Firebase Multicast (500 limit)
 * - In-App: Bulk create in DB
 * - WhatsApp: Sent via WhatsAppService
 */
/**
 * Helper to Alias Tokens — audience-aware variable replacement
 * Exported for use in test dispatches and previews.
 */
export const aliasTokens = async (text: string, user: any, audienceType: string = 'AMBASSADORS') => {
    if (!text) return ''
    const type = audienceType || 'AMBASSADORS'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'

    const referralCode = user.referralCode || user.referrerCode || ''
    const referralLink = referralCode ? `${baseUrl}/r/${encryptReferralCode(referralCode)}` : ''
    const referrerLink = user.referrerCode ? `${baseUrl}/r/${encryptReferralCode(user.referrerCode)}` : ''

    // 🔥 GLOBAL PRIORITY mapping — these apply to ALL audience types
    let resolvedText = text
        .replace(/{userName}|{Ambassador}|{parentName}|{Name}|{leadName}|{studentName}/gi, user.fullName || user.studentName || 'Recipient')
        .replace(/{campus}|{Campus}|{CAMPUS}/gi, user.assignedCampus || 'Global Campus')
        .replace(/{mobile}|{Mobile}/gi, user.mobileNumber || '')
        .replace(/{referralCode}|{code}|{ReferralCode}/gi, user.referralCode || '')
        .replace(/{referralLink}|{ReferralLink}/gi, referralLink)
        .replace(/{referrerLink}|{ReferrerLink}/gi, referrerLink)

    if (type === 'STUDENTS') {
        return resolvedText
            .replace(/{grade}|{Grade}/gi, user.grade || '')
            .replace(/{admissionDate}/gi, user.admissionDate || '')
    }

    if (type === 'REFERRALS') {
        const programLink = user.referrerCode ? `${baseUrl}/p/admission?r=${encryptReferralCode(user.referrerCode)}` : ''
        return resolvedText
            .replace(/{studentName}/gi, user.studentName || 'Student')
            .replace(/{grade}|{Grade}/gi, user.grade || '')
            .replace(/{leadStatus}|{status}/gi, user.leadStatus || '')
            .replace(/{ambassadorName}|{referrerName}/gi, user.ambassadorName || '')
            .replace(/{academicYear}/gi, user.academicYear || '2025-2026')
            .replace(/{ProgramLink}/gi, programLink)
    }

    if (type === 'PROGRAM_LEADS') {
        const programLink = user.programSlug ? `${baseUrl}/p/${user.programSlug}?r=${encryptReferralCode(user.referrerCode || '')}` : ''
        return resolvedText
            .replace(/{studentName}/gi, user.studentName || 'Student')
            .replace(/{source}|{referrerName}/gi, user.source || '')
            .replace(/{programName}/gi, user.programName || '')
            .replace(/{programLink}/gi, programLink)
            .replace(/{status}|{leadStatus}/gi, user.leadStatus || '')
            .replace(/{enquiryDate}/gi, user.enquiryDate || '')
    }

    // Default: AMBASSADORS
    resolvedText = resolvedText
        .replace(/{role}|{Role}/gi, user.role || 'Ambassador')
        .replace(/{referralCount}/gi, (user.confirmedReferralCount || 0).toString())
        .replace(/{pendingReferrals}/gi, (user.pendingReferralCount || 0).toString())

    // Handle Dynamic Program Links (e.g. {ProgramLink:slug})
    if (resolvedText.includes('{ProgramLink:')) {
        const programRegex = /{ProgramLink:([^}]+)}/gi
        resolvedText = resolvedText.replace(programRegex, (match, slug) => {
            if (user.referralCode) {
                return `${baseUrl}/offer/${slug}?ref=${user.referralCode}`
            }
            return `${baseUrl}/offer/${slug}`
        })
    }

    return resolvedText
}

export async function dispatchCampaignBatch(campaignId: number) {
    const BATCH_SIZE = 500 // Increased for larger audiences to reduce batch overhead
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
    const campaignRequestId = `camp_${campaignId}_${Date.now()}`

    try {
        const log = await prisma.campaignLog.create({
            data: {
                campaignId: campaignId,
                status: 'PROCESSING',
                recipientCount: 0,
                sentCount: 0,
                failedCount: 0,
                runAt: new Date(),
                refId: campaignRequestId
            } as any
        })
        logId = log.id

        // PRE-FLIGHT: Update Log with Total Match Count based on audience type
        let totalToProcess = 0;
        const type = audience.type || 'AMBASSADORS';

        if (type === 'AMBASSADORS') {
            const preCount = await getAmbassadorQuery(audience as any);
            totalToProcess = await prisma.user.count({ where: preCount });
        } else if (type === 'PROGRAM_LEADS') {
            const leadWhere: any = {};
            if (audience.campus && audience.campus !== 'All') {
                leadWhere.referrer = { assignedCampus: audience.campus };
            }
            totalToProcess = await prisma.programLead.count({ where: leadWhere });
        } else if (type === 'REFERRALS') {
            const where = getReferralQuery(audience as any);
            totalToProcess = await prisma.referralLead.count({ where });
        } else if (type === 'STUDENTS') {
            const whereStudent = getStudentQuery(audience as any);
            totalToProcess = await prisma.student.count({ where: whereStudent });
        }

        if (logId) {
            await prisma.campaignLog.update({
                where: { id: logId },
                data: { recipientCount: totalToProcess } as any
            })
        }
    } catch (e) {
        console.error('Failed to create initial log', e)
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
                        DeviceToken: { select: { token: true } },
                        _count: { select: { referrals: true } }
                    },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = batchUsers.map(u => ({
                    ...u,
                    pendingReferralCount: Math.max(0, (u._count?.referrals || 0) - (u.confirmedReferralCount || 0))
                }))
            }
            else if (audience.type === 'PROGRAM_LEADS') {
                const leadWhere = getProgramLeadQuery(audience as any)

                const leads = await prisma.programLead.findMany({
                    where: leadWhere,
                    orderBy: { id: 'asc' },
                    select: {
                        visitorName: true,
                        visitorMobile: true,
                        clickedAt: true,
                        studentName: true,
                        status: true,
                        program: { select: { title: true, slug: true } },
                        referrer: { select: { assignedCampus: true, fullName: true, referralCode: true } }
                    },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = leads.map(l => ({
                    userId: 0,
                    fullName: l.visitorName || 'Friend',
                    studentName: l.studentName || '',
                    programName: l.program?.title || '',
                    programSlug: l.program?.slug || '',
                    leadStatus: l.status || '',
                    email: '',
                    mobileNumber: l.visitorMobile,
                    assignedCampus: l.referrer?.assignedCampus || '',
                    source: l.referrer?.fullName || 'Program',
                    referrerCode: l.referrer?.referralCode || '',
                    referralCode: null,
                    enquiryDate: l.clickedAt ? new Date(l.clickedAt).toLocaleDateString('en-IN') : '',
                    role: 'Lead', confirmedReferralCount: 0, DeviceToken: []
                }))
            }
            else if (audience.type === 'REFERRALS') {
                const where = getReferralQuery(audience as any)

                const referrals = await prisma.referralLead.findMany({
                    where,
                    orderBy: { leadId: 'asc' },
                    select: {
                        parentName: true, parentMobile: true, campus: true,
                        gradeInterested: true, leadStatus: true,
                        studentName: true, academicYear: true,
                        user: { select: { fullName: true, referralCode: true } }
                    },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = referrals.map(r => ({
                    userId: 0,
                    fullName: r.parentName || 'Parent',
                    studentName: r.studentName || '',
                    email: '',
                    mobileNumber: r.parentMobile,
                    assignedCampus: r.campus || '',
                    grade: r.gradeInterested || '',
                    leadStatus: r.leadStatus || '',
                    ambassadorName: r.user?.fullName || '',
                    academicYear: r.academicYear || '',
                    referrerCode: r.user?.referralCode || '',
                    referralCode: null, // Referrals don't have code themselves
                    role: 'Referral', confirmedReferralCount: 0, DeviceToken: []
                }))
            }
            else if (audience.type === 'STUDENTS') {
                const whereStudent = getStudentQuery(audience as any)

                const students = await prisma.student.findMany({
                    where: whereStudent,
                    orderBy: { studentId: 'asc' },
                    select: {
                        grade: true,
                        createdAt: true,
                        campus: { select: { campusName: true } },
                        parent: {
                            select: { fullName: true, mobileNumber: true, email: true, referralCode: true, DeviceToken: { select: { token: true } } }
                        }
                    },
                    skip: skip,
                    take: BATCH_SIZE
                })
                users = students.map(s => ({
                    userId: 0,
                    fullName: s.parent.fullName || 'Parent',
                    email: s.parent.email,
                    mobileNumber: s.parent.mobileNumber,
                    assignedCampus: s.campus.campusName,
                    grade: s.grade || '',
                    referralCode: s.parent.referralCode || '',
                    admissionDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '',
                    role: 'Parent', confirmedReferralCount: 0, DeviceToken: s.parent.DeviceToken
                }))
            }

            if (users.length === 0) {
                hasMore = false
                break
            }

            stats.total += users.length
            // processedCount moved to bottom of loop to avoid double-counting

            // PROCESS BATCH
            const promises: Promise<void>[] = []
            const pushTokens: string[] = []
            const notificationsToCreate: any[] = []
            const whatsappRecipients: { mobile: string, variables: string[] }[] = []

            for (const user of users) {
                // Email
                if (isEmail && user.email) {
                    const subject = await aliasTokens(campaign.subject, user, audience.type)
                    const body = await aliasTokens(campaign.templateBody, user, audience.type)
                    promises.push(EmailService.sendCampaignEmail(user.email, subject, body)
                        .then(() => { stats.emailSent++ }).catch(() => { stats.emailFailed++ }))
                }

                // WhatsApp
                if (isWhatsapp && waService && user.mobileNumber) {
                    const cleanMobile = user.mobileNumber.toString().replace(/\D/g, '')
                    
                    // SAFETY: Skip if mobile is clearly an ID (like Campaign #14 issue)
                    if (cleanMobile.length < 10) {
                        console.warn(`[CampaignDispatcher] Skipping invalid mobile for WhatsApp: ${user.mobileNumber} (Name: ${user.fullName})`)
                        stats.whatsappFailed++
                        continue
                    }

                    // Resolve Variables dynamically based on User Selection in Campaign Manager
                    const mapping = (campaign as any).waVariableMapping || {}
                    const waVars: string[] = []
                    
                    // Determine how many variables to resolve. 
                    // We use the count from the template config if possible, or fallback to the mapping keys.
                    const mappingKeys = Object.keys(mapping).filter(k => !isNaN(Number(k)))
                    const varCount = mappingKeys.length > 0 ? Math.max(...mappingKeys.map(Number)) : 5

                    if (mappingKeys.length > 0) {
                        for (let i = 1; i <= varCount; i++) {
                            const key = i.toString()
                            const mappedValue = mapping[key]
                            if (mappedValue === 'STATIC') {
                                waVars.push((mapping[`static_${key}`] || '').toString().replace(/[\r\n]+/g, ' ').trim())
                            } else if (mappedValue) {
                                // Placeholder resolution (e.g. {userName} -> "John Doe")
                                waVars.push((await aliasTokens(mappedValue, user, audience.type)).toString().replace(/[\r\n]+/g, ' ').trim())
                            } else {
                                waVars.push('')
                            }
                        }
                    } else {
                        // BACKWARD COMPATIBILITY: Fallback to original static defaults if no mapping is defined
                        waVars.push((user.fullName || 'User').toString().trim())
                        waVars.push((user.assignedCampus || '').toString().trim())
                        waVars.push((user.grade || user.source || '').toString().trim())
                        waVars.push((user.role || '').toString().trim())
                        waVars.push((user.referralCode || '').toString().trim())
                    }
                    
                    whatsappRecipients.push({
                        mobile: cleanMobile,
                        variables: waVars
                    })
                }

                // Push
                if (isPush && user.DeviceToken?.length > 0) {
                    user.DeviceToken.forEach((dt: any) => { if (dt.token) pushTokens.push(dt.token) })
                }

                // In-App
                if (isInApp && user.userId) {
                    notificationsToCreate.push({
                        userId: user.userId,
                title: await aliasTokens(campaign.subject, user, audience.type),
                message: (await aliasTokens(campaign.templateBody, user, audience.type)).replace(/<[^>]*>?/gm, '').substring(0, 500),
                        type: 'info',
                        isRead: false,
                        metadata: { campaignId }
                    })
                }
            }

            // Execute Async (Email)
            await Promise.all(promises)

            // Execute WhatsApp (Batched)
            let waBatchSuccess = true
            if (whatsappRecipients.length > 0 && waService) {
                const waRes = await waService.sendBulkTemplateMessage(
                    whatsappRecipients,
                    (campaign as any).waTemplateName || 'welcome_message',
                    'CAMPAIGN',
                    campaignRequestId
                )
                if (waRes.success) {
                    stats.whatsappSent += whatsappRecipients.length
                } else {
                    waBatchSuccess = false
                    stats.whatsappFailed += whatsappRecipients.length
                }
            }

            // Execute Push (Mock/Real)
            if (isPush && adminFn && pushTokens.length > 0) {
                // Process in chunks of 500 for FCM
                const chunks = []
                for (let i = 0; i < pushTokens.length; i += 500) {
                    chunks.push(pushTokens.slice(i, i + 500))
                }
                await Promise.all(chunks.map(chunk =>
                    adminFn!.messaging().sendEachForMulticast({
                        tokens: chunk,
                        notification: {
                            title: campaign.subject,
                            body: campaign.templateBody,
                        },
                    })
                ))
                stats.pushSent += pushTokens.length
            }

            // Create in-app notifications
            if (isInApp && notificationsToCreate.length > 0) {
                await prisma.notification.createMany({ data: notificationsToCreate })
                stats.inAppSent += notificationsToCreate.length
            }

            // Update processed count & rate limit safety
            processedCount += users.length

            // THROTTLING: Adaptive cooldown to stay within 60s timeout
            if (users.length === BATCH_SIZE) {
                console.log(`[CampaignDispatcher] Batch complete. Cooling down for 0.5s... (Processed: ${processedCount})`)
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            // Log Recipients for Analytics (All Channels)
            const recipientsToCreate: any[] = []

            users.forEach((user: any) => {
                const mobile = user.mobileNumber ? user.mobileNumber.toString().replace(/\D/g, '') : ''
                const baseRecipient = {
                    campaignId: campaignId,
                    mobile,
                    name: user.fullName || 'User',
                    role: user.role,
                    campus: user.assignedCampus
                }

                // WhatsApp
                if (isWhatsapp && user.mobileNumber) {
                    const cleanMobile = user.mobileNumber.toString().replace(/\D/g, '')
                    let status = 'SENT'
                    let errorCode = null

                    if (cleanMobile.length < 10) {
                        status = 'FAILED'
                        errorCode = 'Invalid Mobile Number'
                    } else if (!waBatchSuccess) {
                        status = 'FAILED'
                        errorCode = 'API Dispatch Failed'
                    }

                    recipientsToCreate.push({ 
                        ...baseRecipient, 
                        channel: 'WHATSAPP', 
                        status,
                        errorCode
                    })
                }

                // Email
                if (isEmail && user.email) {
                    recipientsToCreate.push({ 
                        ...baseRecipient, 
                        channel: 'EMAIL', 
                        status: 'SENT' 
                    })
                }

                // Push
                if (isPush && user.DeviceToken?.length > 0) {
                    recipientsToCreate.push({ ...baseRecipient, channel: 'PUSH', status: 'SENT' })
                }

                // In-App
                if (isInApp && user.userId) {
                    recipientsToCreate.push({ ...baseRecipient, channel: 'IN_APP', status: 'SENT' })
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
                        // Keep the recipientCount fixed to what we calculated at start
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
            }).catch(e => console.error('Failed to update error log', e))
        }

        // IMPORTANT: Reset Campaign Status so it doesn't get stuck in "SCHEDULED"
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'ACTIVE' }
        }).catch(err => console.error('Failed to reset stuck status', err))

        return { success: false, error: 'Campaign dispatch failed mid-process' }
    }
}

