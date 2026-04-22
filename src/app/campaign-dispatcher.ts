'use server'

import prisma from '@/lib/prisma'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { getAmbassadorQuery, getStudentQuery, getReferralQuery, getProgramLeadQuery, toTitleCase, resolveWhatsAppVariables, aliasTokens as centralAliasTokens } from '@/lib/campaign-utils'
import { encryptReferralCode } from '@/lib/crypto'
import { whatsappService } from '@/lib/whatsapp-service'

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
/**
 * Legacy Export maintained for compatibility, now delegates to centralized engine
 */
export const aliasTokens = async (text: string, user: any, audienceType: string = 'AMBASSADORS') => {
    return centralAliasTokens(text, user, audienceType)
}

export async function dispatchCampaignBatch(campaignId: number) {
    const BATCH_SIZE = 100 // Optimized for Serverless Timeouts (Safe with 3s delays)
    const adminFn = await getFirebaseAdmin()

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { logs: { where: { status: 'PROCESSING' }, take: 1 } }
    })
    if (!campaign) return { success: false, error: 'Campaign not found' }

    // Check for existing processing log to RESUME
    let existingLog = campaign.logs.find(l => l.status === 'PROCESSING')
    let isResuming = !!existingLog

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

    if (isResuming && existingLog) {
        logId = existingLog.id
        stats.whatsappSent = existingLog.whatsappSent || 0
        stats.whatsappFailed = existingLog.whatsappFailed || 0
        stats.emailSent = existingLog.emailSent || 0
        stats.emailFailed = existingLog.emailFailed || 0
        stats.pushSent = existingLog.pushSent || 0
        stats.pushFailed = existingLog.pushFailed || 0
        stats.inAppSent = existingLog.inAppSent || 0
        stats.total = existingLog.sentCount || 0
        console.log(`[CampaignDispatcher] Resuming Campaign #${campaignId} from count ${existingLog.sentCount}`)
    } else {
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
                const leadWhere = getProgramLeadQuery(audience as any);
                totalToProcess = await (prisma as any).programLead.count({ where: leadWhere });
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
    }

    try {
        let skip = isResuming && existingLog ? (existingLog.sentCount + existingLog.failedCount) : 0
        let hasMore = true
        let processedInThisRun = 0
        const MAX_BATCHES_PER_RUN = 1 // Process one batch at a time to be 100% safe from timeouts

        while (hasMore && processedInThisRun < MAX_BATCHES_PER_RUN) {
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
                    source: r.user?.fullName || '', // Map source for heuristic recovery consistency
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
                        fullName: true, // Actual student name
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
                    studentName: s.fullName || '',
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
            // Processed count moved to bottom of loop to avoid double-counting

            // PROCESS BATCH
            const promises: Promise<void>[] = []
            const pushTokens: string[] = []
            const notificationsToCreate: any[] = []
            const whatsappRecipients: { mobile: string, variables: string[], fullText?: string, userRole?: string, campus?: string }[] = []
            const whatsappButtonVariables: { [mobile: string]: string[] } = {}

            for (const user of users) {
                // Email
                if (isEmail && user.email) {
                    const subject = await aliasTokens(campaign.subject, user, audience.type)
                    // WhatsApp Archival Enrichment: We try to find the full professional branding
                // text from the config if we're using a WhatsApp template.
                let waTemplateBody = campaign.templateBody;
                if (campaign.waTemplateName) {
                    const waConfig = await prisma.whatsAppConfig.findFirst({
                        where: { templateName: campaign.waTemplateName }
                    }) as any;
                    if (waConfig?.templateBody) {
                        waTemplateBody = waConfig.templateBody;
                    }
                }

                const body = await aliasTokens(waTemplateBody, user, audience.type)
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

                    const templateName = (campaign as any).waTemplateName || 'welcome_message'
                    const mapping = (campaign as any).waVariableMapping || {}
                    
                    // 🛡️ 100% INTEGRITY: Fetch template config once per recipient
                    const waConfig = await prisma.whatsAppConfig.findFirst({
                        where: { templateName: templateName }
                    })
                    const requiredCount = waConfig?.requiredVariablesCount ?? 0

                    // 🚀 USE CENTRALIZED RESOLVER
                    const { waVars, btnVars } = await resolveWhatsAppVariables(user, audience.type, mapping, requiredCount)

                    // 🛡️ INLINE SAFETY NET: Force correct picker resolution regardless of module cache
                    const _dBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.5starambassador.com'
                    for (let _di = 0; _di < waVars.length; _di++) {
                        const _dToken = mapping[(_di + 1).toString()] || ''
                        const _dHasPicker = _dToken.includes('{ProgramLink:') || _dToken.includes('{programLink:')
                        const _dCorrectlyResolved = waVars[_di]?.includes('/offer/')
                        if (_dHasPicker && !_dCorrectlyResolved) {
                            const _dSlugMatch = _dToken.match(/\{[Pp]rogram[Ll]ink:([^}]+)\}/)
                            if (_dSlugMatch?.[1]) {
                                const _dSlug = _dSlugMatch[1].trim()
                                const _dRefCode = user.referralCode || user.referrerCode || ''
                                waVars[_di] = _dRefCode
                                    ? `${_dBaseUrl}/offer/${_dSlug}?r=${encryptReferralCode(_dRefCode)}`
                                    : `${_dBaseUrl}/offer/${_dSlug}`
                                console.error(`[SAFETY_NET_DISPATCH] ${user.fullName}: "${_dSlug}" -> ${waVars[_di]}`)
                            }
                        }
                    }

                    if (Object.keys(mapping).filter(k => /^\d+$/.test(k)).length === 0) {
                        // BACKWARD COMPATIBILITY: no mapping defined, push generic fields
                        waVars.push((user.fullName || 'User').toString().trim())
                        waVars.push((user.assignedCampus || '').toString().trim())
                        waVars.push((user.grade || user.source || '').toString().trim())
                        waVars.push((user.role || '').toString().trim())
                        waVars.push((user.referralCode || '').toString().trim())
                    }
                    
                    const fullText = waVars.join(', ')
                    
                    whatsappRecipients.push({
                        mobile: cleanMobile,
                        variables: waVars,
                        fullText: fullText,
                        userRole: user.role,
                        campus: user.assignedCampus
                    })

                    if (btnVars.length > 0) {
                        whatsappButtonVariables[cleanMobile] = btnVars
                    }
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
                    campaignRequestId,
                    (campaign as any).waHeaderUrl || null,
                    whatsappButtonVariables
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
            processedInThisRun++

            if (users.length === BATCH_SIZE) {
                console.log(`[CampaignDispatcher] Batch complete. Cooling down for 0.5s... (Processed this run: ${processedInThisRun})`)
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            // Log Recipients for Analytics
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
                        skipDuplicates: true
                    })
                } catch (e) {
                    console.error('Failed to log recipients', e)
                }
            }

            // Incremental Log Update
            if (logId) {
                await prisma.campaignLog.update({
                    where: { id: logId },
                    data: {
                        sentCount: stats.emailSent + stats.pushSent + stats.inAppSent + stats.whatsappSent,
                        failedCount: stats.emailFailed + stats.pushFailed + stats.whatsappFailed,
                        emailSent: stats.emailSent,
                        pushSent: stats.pushSent,
                        inAppSent: stats.inAppSent,
                        whatsappSent: stats.whatsappSent
                    } as any
                }).catch(e => console.error('Failed to update incremental log', e))
            }

            skip += BATCH_SIZE
            await new Promise(r => setTimeout(r, 200))
        }

        // Final check: Is there more work?
        const stillHasMore = hasMore && processedInThisRun >= MAX_BATCHES_PER_RUN

        // Final Log Update
        if (logId) {
            await prisma.campaignLog.update({
                where: { id: logId },
                data: {
                    status: stillHasMore ? 'PROCESSING' : 'COMPLETED',
                    sentCount: stats.emailSent + stats.pushSent + stats.inAppSent + stats.whatsappSent,
                    failedCount: stats.emailFailed + stats.pushFailed + stats.whatsappFailed,
                    emailSent: stats.emailSent, emailFailed: stats.emailFailed,
                    pushSent: stats.pushSent, pushFailed: stats.pushFailed,
                    inAppSent: stats.inAppSent,
                    whatsappSent: stats.whatsappSent, whatsappFailed: stats.whatsappFailed
                } as any
            })
        }

        if (!stillHasMore) {
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'ACTIVE', lastRunAt: new Date() }
            })
            const totalSent = stats.emailSent + stats.pushSent + stats.inAppSent + stats.whatsappSent
            await logAction('Run Campaign', 'Marketing', `Executed campaign: ${campaign.name}. Sent: ${totalSent}`, undefined)
        }

        return { success: true, stats, hasMore: stillHasMore }

    } catch (error: any) {
        console.error('Batch Dispatch Error:', error)

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

        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'ACTIVE' }
        }).catch(err => console.error('Failed to reset stuck status', err))

        return { success: false, error: 'Campaign dispatch failed mid-process' }
    }
}
