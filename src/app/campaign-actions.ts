'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { getAmbassadorQuery, getStudentQuery, getReferralQuery, getProgramLeadQuery } from '@/lib/campaign-utils'
import { EmailService } from '@/lib/email-service'
import { whatsappService } from '@/lib/whatsapp-service'
import { UserRole } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { aliasTokens } from './campaign-dispatcher'

// Helper to check campaign access via the permission matrix
async function checkCampaignAccess() {
    const user = await getCurrentUser()
    if (!user || !(await hasPermission('campaigns'))) {
        throw new Error('Unauthorized: Campaign access required')
    }
    return user
}

export async function getCampaigns() {
    try {
        await checkCampaignAccess()
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                logs: {
                    orderBy: { runAt: 'desc' },
                    take: 1
                }
            }
        })
        return { success: true, campaigns }
    } catch (error: any) {
        console.error('getCampaigns error:', error)
        return { success: false, error: error.message || 'Failed to fetch campaigns' }
    }
}

export async function createCampaign(data: {
    name: string,
    subject: string,
    templateBody: string,
    type?: string,
    targetAudience?: any,
    channels?: string[],
    waTemplateName?: string,
    waHeaderUrl?: string,
    waVariableMapping?: any
}) {
    try {
        await checkCampaignAccess()
        if (!data.channels || data.channels.length === 0) {
            return { success: false, error: 'At least one channel must be selected' }
        }

        const campaign = await prisma.campaign.create({
            data: {
                name: data.name,
                subject: data.subject,
                templateBody: data.templateBody,
                type: data.type || 'EMAIL',
                targetAudience: data.targetAudience ?? {},
                channels: data.channels || ['EMAIL'],
                status: 'DRAFT',
                waTemplateName: data.waTemplateName || null,
                waHeaderUrl: data.waHeaderUrl || null,
                waVariableMapping: data.waVariableMapping || null
            } as any
        })

        await logAction('Create Campaign', 'Marketing', `Created campaign: ${data.name}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, campaign }
    } catch (error) {
        console.error('createCampaign error:', error)
        return { success: false, error: 'Failed to create campaign' }
    }
}

export async function updateCampaign(id: number, data: Partial<{
    name: string,
    subject: string,
    templateBody: string,
    status: string,
    targetAudience: any,
    channels: string[],
    waTemplateName: string,
    waHeaderUrl: string,
    waVariableMapping: any
}>) {
    try {
        await checkCampaignAccess()
        const campaign = await prisma.campaign.update({
            where: { id },
            data: data as any
        })

        await logAction('Update Campaign', 'Marketing', `Updated campaign: ${id}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, campaign }
    } catch (error) {
        console.error('updateCampaign error:', error)
        return { success: false, error: 'Failed to update campaign' }
    }
}

export async function deleteCampaign(id: number) {
    try {
        await checkCampaignAccess()

        // 1. Delete granular recipient history
        await (prisma as any).campaignRecipient.deleteMany({
            where: { campaignId: id }
        })

        // 2. Delete aggregate logs (this was the primary blocker)
        await prisma.campaignLog.deleteMany({
            where: { campaignId: id }
        })

        // 3. Cleanup ANY background jobs for this campaign to prevent worker errors
        await (prisma as any).job.deleteMany({
            where: {
                type: 'CAMPAIGN_BATCH',
                payload: { path: ['campaignId'], equals: id }
            }
        }).catch(() => {
            // Fallback for older Prisma versions or different JSON structures
            console.warn('[Campaign Action] Standard JSON job deletion failed, continuing...')
        })

        // 4. Finally delete the campaign itself
        await prisma.campaign.delete({
            where: { id }
        })

        await logAction('Delete Campaign', 'Marketing', `Deleted campaign: ${id}`, undefined)
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('deleteCampaign error:', error)
        return { success: false, error: 'Failed to delete campaign. Ensure all related logs are cleared.' }
    }
}

export async function getAudienceCount(audience: { type?: string, role: string, campus: string, activityStatus: string, [key: string]: any }) {
    try {
        await checkCampaignAccess()

        // Use efficient count queries instead of fetching all rows
        if (audience.type === 'PROGRAM_LEADS') {
            const where = getProgramLeadQuery(audience as any)
            const count = await prisma.programLead.count({ where })
            return { success: true, count }
        }

        if (audience.type === 'REFERRALS') {
            const where = getReferralQuery(audience as any)
            const count = await prisma.referralLead.count({ where })
            return { success: true, count }
        }

        if (audience.type === 'STUDENTS') {
            const where = getStudentQuery(audience as any)
            const count = await prisma.student.count({ where })
            return { success: true, count }
        }

        // AMBASSADORS (default)
        const where = getAmbassadorQuery(audience as any)
        const count = await prisma.user.count({ where })
        return { success: true, count }

    } catch (error) {
        return { success: false, error: 'Failed to count audience' }
    }
}


interface AudienceMember {
    fullName?: string
    email?: string | null
    mobileNumber: string
    referralCode?: string
    assignedCampus?: string
    role: string
    confirmedReferralCount: number
    createdAt?: Date
    referrals?: any[]
}

async function getFilteredUsers(audience: { type?: string, role: string, campus: string, activityStatus: string, [key: string]: any }): Promise<AudienceMember[]> {

    // 1. PROGRAM LEADS — no campus filter in schema, fetch all
    if (audience.type === 'PROGRAM_LEADS') {
        const where = getProgramLeadQuery(audience as any)
        const leads = await prisma.programLead.findMany({
            where,
            select: { visitorMobile: true, visitorName: true }
        })
        return leads.map(l => ({
            mobileNumber: l.visitorMobile,
            fullName: l.visitorName || 'Friend',
            role: 'Lead',
            confirmedReferralCount: 0
        }))
    }

    // 2. REFERRALS — respects campus and status filters
    if (audience.type === 'REFERRALS') {
        const where = getReferralQuery(audience as any)
        const referrals = await prisma.referralLead.findMany({
            where,
            select: { parentMobile: true, parentName: true, campus: true, leadStatus: true }
        })
        return referrals.map(r => ({
            mobileNumber: r.parentMobile,
            fullName: r.parentName || 'Parent',
            assignedCampus: r.campus || undefined,
            role: 'Referral',
            confirmedReferralCount: 0,
            leadStatus: r.leadStatus
        }))
    }

    // 3. STUDENTS (contact via parent) — uses campus filter
    if (audience.type === 'STUDENTS') {
        const whereStudent = getStudentQuery(audience as any)
        const students = await prisma.student.findMany({
            where: whereStudent,
            select: {
                campus: { select: { campusName: true } },
                parent: { select: { mobileNumber: true, fullName: true, email: true } }
            }
        })
        return students.map(s => ({
            mobileNumber: s.parent.mobileNumber,
            fullName: s.parent.fullName,
            email: s.parent.email,
            assignedCampus: s.campus.campusName,
            role: 'Parent',
            confirmedReferralCount: 0
        }))
    }

    // 4. AMBASSADORS (default) — full filter support
    const where = getAmbassadorQuery(audience as any)
    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    })

    return users.map((u: any) => ({
        fullName: u.fullName,
        email: u.email,
        mobileNumber: u.mobileNumber,
        referralCode: u.referralCode,
        assignedCampus: u.assignedCampus,
        role: u.role,
        confirmedReferralCount: u.confirmedReferralCount,
        createdAt: u.createdAt,
        referrals: u.referrals
    }))
}


export async function runCampaign(id: number) {
    try {
        await checkCampaignAccess()

        // 1. Verify Campaign Exists & Current Status
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { logs: { where: { status: 'PROCESSING' }, take: 1 } }
        })
        if (!campaign) return { success: false, error: 'Campaign not found' }

        // 2. CHECK: Is it already processing or scheduled?
        const existingJob = await (prisma as any).job.findFirst({
            where: {
                type: 'CAMPAIGN_BATCH',
                status: { in: ['PENDING', 'PROCESSING'] },
                payload: { path: ['campaignId'], equals: id }
            }
        })

        if (existingJob || (campaign.logs.length > 0 && campaign.logs[0].status === 'PROCESSING')) {
            return { success: false, error: 'This campaign is already scheduled or in progress.' }
        }

        // 3. PRE-FLIGHT: Count audience before queuing — prevents stuck state on 0 audience
        const audience = (campaign.targetAudience as any) || {}
        const preCount = await getAudienceCount(audience)
        if (preCount.success && (preCount.count ?? 0) === 0) {
            // Log immediately as completed with 0 recipients
            await prisma.campaignLog.create({
                data: {
                    campaignId: id,
                    status: 'COMPLETED',
                    recipientCount: 0,
                    sentCount: 0,
                    failedCount: 0,
                    runAt: new Date(),
                    errorLog: 'No recipients matched the audience filters'
                } as any
            })
            await prisma.campaign.update({ where: { id }, data: { status: 'ACTIVE', lastRunAt: new Date() } })

            // Log this action for audit
            await logAction('Trigger Campaign', 'Marketing', `Campaign completed instantly (0 Recipients): ${campaign.name}`, undefined)

            revalidatePath('/superadmin')
            return { success: true, message: 'Campaign completed instantly: No recipients matched your audience filters.' }
        }

        // 4. Create Background Job
        await (prisma as any).job.create({
            data: {
                type: 'CAMPAIGN_BATCH',
                payload: { campaignId: id },
                status: 'PENDING'
            }
        })

        // 5. Mark Campaign as Scheduled
        await prisma.campaign.update({
            where: { id },
            data: { status: 'SCHEDULED' }
        })

        // 6. Trigger Worker (Fire-and-forget)
        try {
            let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL
            
            if (!baseUrl) {
                if (process.env.VERCEL_URL) {
                    baseUrl = `https://${process.env.VERCEL_URL}`
                } else if (process.env.NODE_ENV === 'development') {
                    baseUrl = 'http://localhost:3001'
                } else {
                    baseUrl = 'http://localhost:3000'
                }
            }
            
            console.log(`[CampaignTrigger] Firing worker at: ${baseUrl}/api/cron/process-jobs`)
            fetch(`${baseUrl}/api/cron/process-jobs`, { method: 'GET', cache: 'no-store' })
                .catch(err => console.error('[CampaignTrigger] Worker fetch failed:', err.message))
        } catch (e) {
            // Ignore trigger errors
        }

        await logAction('Trigger Campaign', 'Marketing', `Initiated campaign dispatch: ${campaign.name}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, message: 'Campaign scheduled for background processing' }

    } catch (error) {
        console.error('runCampaign error:', error)
        return { success: false, error: 'Failed to schedule campaign' }
    }
}


export async function resetStuckCampaign(id: number) {
    try {
        await checkCampaignAccess()

        // 1. Mark Log as Failed
        await prisma.campaignLog.updateMany({
            where: { campaignId: id, status: 'PROCESSING' },
            data: { status: 'FAILED', errorLog: 'Manually reset by administrator' } as any
        })

        // 2. Cleanup stuck jobs for this campaign
        await (prisma as any).job.updateMany({
            where: {
                type: 'CAMPAIGN_BATCH',
                status: { in: ['PENDING', 'PROCESSING'] },
                payload: { path: ['campaignId'], equals: id }
            },
            data: { status: 'FAILED', error: 'Manually reset by administrator' }
        })

        // 3. Mark Campaign back to ACTIVE (so it can be re-run) or DRAFT
        await prisma.campaign.update({
            where: { id },
            data: { status: 'ACTIVE' }
        })

        revalidatePath('/superadmin')
        return { success: true, message: 'Campaign state reset successfully' }

    } catch (error: any) {
        console.error('resetStuckCampaign error:', error)
        return { success: false, error: error.message || 'Failed to reset campaign' }
    }
}

export async function exportCampaignData(campaignId: number) {
    try {
        await checkCampaignAccess()

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { name: true }
        })

        if (!campaign) return { success: false, error: 'Campaign not found' }

        // Fetch Recipient Data
        const recipients = await (prisma as any).campaignRecipient.findMany({
            where: { campaignId },
            orderBy: { sentAt: 'desc' }
        })

        if (!recipients || recipients.length === 0) {
            // Fallback to basic aggregate info if no granular data (old campaigns)
            // or return empty with headers
        }

        // Generate CSV
        const headers = ['Name', 'Mobile', 'Role', 'Campus', 'Channel', 'Status', 'Failure Reason', 'Sent At', 'Delivered At', 'Read At']
        const rows = recipients.map((r: any) => [
            r.name || 'User',
            r.mobile,
            r.role || '',
            r.campus || '',
            r.channel,
            r.status,
            r.errorCode || '',
            r.sentAt ? new Date(r.sentAt).toISOString() : '',
            r.deliveredAt ? new Date(r.deliveredAt).toISOString() : '',
            r.readAt ? new Date(r.readAt).toISOString() : ''
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map((row: any[]) => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        return { success: true, csv: csvContent, filename: `campaign_${campaignId}_report.csv` }
    } catch (error) {
        console.error('export error', error)
        return { success: false, error: 'Export failed' }
    }
}

export async function getCampaignAnalytics() {
    try {
        await checkCampaignAccess()

        // 1. Channel Distribution (Pie Chart)
        // Aggregate status counts by channel from `CampaignRecipient`
        // Since we don't have a direct groupBy channel/status easy access without raw query or multiple count queries,
        // let's do a raw query for efficiency or multiple Prisma aggregates.
        // GroupBy is supported in Prisma.

        const channelStats = await (prisma as any).campaignRecipient.groupBy({
            by: ['channel', 'status'],
            _count: {
                _all: true
            }
        })

        // Format for Pie Chart: Need "WhatsApp", "Email", "Push", "In-App" with total counts
        // Actually, we want "Read vs Delivered" per channel? 
        // Or just total "Engagement"?
        // Let's return the raw stats, we can process in UI.

        // 2. Trend Analysis (Line Chart - Last 30 Days)
        // We can use CampaignLog for "Sent" counts trends.
        // For "Read" trends, we'd need to aggregate CampaignRecipient readAt dates?
        // That's heavy.
        // Let's stick to CampaignLog runAt for "Sent Activity".
        // And maybe CampaignLog.whatsappRead for "Read Activity" (if we keep updating it).
        // Yes, we updated CampaignLog.whatsappRead in the webhook! 
        // So CampaignLog has the trend data we need.

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const [rawTrends, inAppReads] = await Promise.all([
            prisma.campaignLog.findMany({
                where: { runAt: { gte: thirtyDaysAgo } },
                orderBy: { runAt: 'asc' },
                select: {
                    runAt: true,
                    sentCount: true,
                    whatsappDelivered: true,
                    whatsappRead: true,
                    inAppSent: true
                }
            }),
            (prisma as any).campaignRecipient.groupBy({
                by: ['readAt'],
                where: {
                    channel: 'IN_APP',
                    status: 'READ',
                    readAt: { gte: thirtyDaysAgo }
                },
                _count: { _all: true }
            })
        ])

        // Group trends by Day
        const trendsMap = new Map<string, any>()

        // 1. Process Campaign Logs (Sent & WhatsApp Reads)
        rawTrends.forEach((log: any) => {
            const date = new Date(log.runAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (!trendsMap.has(date)) {
                trendsMap.set(date, { date, sent: 0, delivered: 0, read: 0 })
            }
            const entry = trendsMap.get(date)
            entry.sent += log.sentCount
            entry.delivered += log.whatsappDelivered || 0
            entry.read += log.whatsappRead || 0
        })

        // 2. Add In-App Reads to Trends
        inAppReads.forEach((group: any) => {
            if (!group.readAt) return
            const date = new Date(group.readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (trendsMap.has(date)) {
                const entry = trendsMap.get(date)
                entry.read += group._count._all
            }
        })

        const trends = Array.from(trendsMap.values())

        // 3. Recent Activity (Feed)
        // Fetch latest 5 "READ" events from CampaignRecipient
        const recentActivity = await (prisma as any).campaignRecipient.findMany({
            where: {
                status: 'READ'
            },
            take: 5,
            orderBy: { readAt: 'desc' },
            select: {
                name: true,
                mobile: true,
                channel: true,
                readAt: true,
                campaign: {
                    select: { name: true }
                }
            }
        })

        // 4. Stuck Job Detection (Last 24h)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const stuckJobs = await prisma.job.findMany({
            where: {
                status: 'PROCESSING',
                updatedAt: { lte: new Date(Date.now() - 30 * 60 * 1000) }, // Stuck for > 30 mins
                createdAt: { gte: dayAgo }
            },
            select: { id: true, type: true, createdAt: true }
        })

        return {
            success: true,
            data: {
                channelStats,
                trends,
                recentActivity: recentActivity.map((a: any) => ({
                    ...a,
                    readAt: a.readAt ? new Date(a.readAt).toISOString() : null
                })),
                stuckJobs
            }
        }
    } catch (error) {
        console.error('getCampaignAnalytics error:', error)
        return { success: false, error: 'Failed to fetch analytics' }
    }
}

/**
 * Re-calculates and synchronizes campaign metrics from recipient records.
 * Acts as a failsafe if real-time webhook updates miss any events.
 */
export async function syncCampaignMetrics(campaignId: number) {
    try {
        await checkCampaignAccess()

        // 1. Get counts from recipients
        const counts = await (prisma as any).campaignRecipient.groupBy({
            by: ['status'],
            where: {
                campaignId: campaignId,
                channel: 'WHATSAPP'
            },
            _count: { _all: true }
        })

        const stats = {
            delivered: 0,
            read: 0
        }

        counts.forEach((c: any) => {
            if (c.status === 'DELIVERED') stats.delivered = c._count._all
            if (c.status === 'READ') stats.read = c._count._all
        })

        // 2. Find the latest log for this campaign
        const latestLog = await prisma.campaignLog.findFirst({
            where: { campaignId },
            orderBy: { runAt: 'desc' }
        })

        if (!latestLog) {
            return { success: false, error: 'No campaign logs found to update' }
        }

        // 3. Update the log with accurate counts
        await prisma.campaignLog.update({
            where: { id: latestLog.id },
            data: {
                whatsappDelivered: stats.delivered,
                whatsappRead: stats.read
            }
        })

        revalidatePath('/superadmin')
        return { success: true, stats }

    } catch (error: any) {
        console.error('syncCampaignMetrics error:', error)
        return { success: false, error: error.message || 'Failed to sync metrics' }
    }
}

export async function sendIndividualWhatsApp(data: {
    mobile: string,
    templateName: string,
    variables: string[],
    buttonVariables?: string[]
}) {
    try {
        await checkCampaignAccess()

        if (!data.mobile || !data.templateName) {
            return { success: false, error: 'Mobile and template name are required' }
        }

        const res = await whatsappService.sendTemplateMessage(
            data.mobile,
            data.templateName,
            data.variables,
            'Campaign', // 4: type
            undefined,  // 5: refId
            undefined,  // 6: headerUrl
            data.buttonVariables // 7: buttonVariables
        )

        if (res && res.success) {
            await logAction('Send Individual WhatsApp', 'Marketing', `Direct message to: ${data.mobile} using ${data.templateName}`, undefined)
            return { success: true, messageId: res.messageId }
        } else {
            return { success: false, error: res.error || 'Failed to send WhatsApp message' }
        }
    } catch (error: any) {
        console.error('sendIndividualWhatsApp error:', error)
        return { success: false, error: error.message || 'Failed to process request' }
    }
}

export async function getWhatsAppTemplates() {
    try {
        await checkCampaignAccess()
        const templates = await prisma.whatsAppConfig.findMany({
            where: { isEnabled: true },
            select: {
                id: true,
                templateName: true,
                requiredVariablesCount: true,
                description: true
            }
        })
        return { success: true, templates }
    } catch (error: any) {
        console.error('getWhatsAppTemplates error:', error)
        return { success: false, error: error.message || 'Failed to fetch templates' }
    }
}

/**
 * Sends a single test WhatsApp message for a campaign to a specific mobile number.
 * Uses real variable mapping logic with a sample recipient from the audien/**
 * Sends a real-time WhatsApp test message for a campaign.
 * Uses current UI mapping if provided, otherwise falls back to saved campaign settings.
 */
export async function sendTestCampaignMessage(
    campaignId: number, 
    testMobile: string, 
    overrideMapping?: any, 
    overrideTemplateName?: string,
    overrideHeaderUrl?: string
) {
    try {
        await checkCampaignAccess()
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
        if (!campaign) throw new Error('Campaign not found')

        const audience = (campaign.targetAudience as any) || { type: 'AMBASSADORS' }
        const type = audience.type || 'AMBASSADORS'
        
        // 🔥 TARGETED CAMPUS: If the campaign has a campus filter, prioritize it
        const targetCampus = (audience as any).campus !== 'All' ? (audience as any).campus : 'Global Campus'
        
        // 🧪 Sample Construction: Prefer real data records with a campus name
        let sampleUser: any = null

        if (type === 'AMBASSADORS') {
            const where = getAmbassadorQuery(audience)
            sampleUser = await prisma.user.findFirst({ 
                where: { 
                    AND: [
                        where,
                        { assignedCampus: { not: null } },
                        { assignedCampus: { not: '' } }
                    ]
                }, 
                orderBy: { userId: 'desc' },
                select: { 
                    userId: true, fullName: true, email: true, mobileNumber: true, 
                    referralCode: true, assignedCampus: true, role: true, 
                    confirmedReferralCount: true 
                } 
            }) || await prisma.user.findFirst({ 
                where, 
                orderBy: { userId: 'desc' },
                select: { 
                    userId: true, fullName: true, email: true, mobileNumber: true, 
                    referralCode: true, assignedCampus: true, role: true, 
                    confirmedReferralCount: true 
                } 
            })
            if (sampleUser) {
                sampleUser.pendingReferralCount = 0 
            }
        } else if (type === 'PROGRAM_LEADS') {
            const where = getProgramLeadQuery(audience)
            const lead = await prisma.programLead.findFirst({ 
                where: {
                    AND: [
                        where,
                        { referrer: { assignedCampus: { not: null } } },
                        { referrer: { assignedCampus: { not: '' } } }
                    ]
                },
                orderBy: { clickedAt: 'desc' },
                select: {
                    visitorName: true, visitorMobile: true, clickedAt: true,
                    studentName: true, status: true,
                    program: { select: { title: true, slug: true } },
                    referrer: { select: { assignedCampus: true, fullName: true, referralCode: true } }
                } 
            }) || await prisma.programLead.findFirst({ 
                where,
                orderBy: { clickedAt: 'desc' },
                select: {
                    visitorName: true, visitorMobile: true, clickedAt: true,
                    studentName: true, status: true,
                    program: { select: { title: true, slug: true } },
                    referrer: { select: { assignedCampus: true, fullName: true, referralCode: true } }
                } 
            })
            if (lead) {
                sampleUser = {
                    userId: 0,
                    fullName: lead.visitorName || 'Friend',
                    studentName: lead.studentName || '',
                    programName: lead.program?.title || '',
                    programSlug: lead.program?.slug || '',
                    leadStatus: lead.status || '',
                    email: '',
                    mobileNumber: lead.visitorMobile,
                    assignedCampus: lead.referrer?.assignedCampus || targetCampus,
                    source: lead.referrer?.fullName || 'Program',
                    referrerCode: lead.referrer?.referralCode || '',
                    referralCode: null,
                    enquiryDate: lead.clickedAt ? new Date(lead.clickedAt).toLocaleDateString('en-IN') : '',
                    role: 'Lead', confirmedReferralCount: 0, DeviceToken: []
                }
            }
        } else if (type === 'REFERRALS') {
            const where = getReferralQuery(audience)
            const r = await prisma.referralLead.findFirst({ 
                where: {
                    AND: [
                        where,
                        { campus: { not: null } },
                        { campus: { not: '' } }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    parentName: true, parentMobile: true, campus: true,
                    gradeInterested: true, leadStatus: true,
                    studentName: true, academicYear: true,
                    user: { select: { fullName: true, referralCode: true } }
                }
            }) || await prisma.referralLead.findFirst({ 
                where,
                orderBy: { createdAt: 'desc' },
                select: {
                    parentName: true, parentMobile: true, campus: true,
                    gradeInterested: true, leadStatus: true,
                    studentName: true, academicYear: true,
                    user: { select: { fullName: true, referralCode: true } }
                }
            })
        // 🔥 TARGETED CAMPUS: If the campaign has a campus filter, prioritize it
        const targetCampus = (audience as any).campus !== 'All' ? (audience as any).campus : 'Global Campus'

        if (r) {
            sampleUser = {
                userId: 0,
                fullName: r.parentName || 'Parent',
                studentName: r.studentName || '',
                email: '',
                mobileNumber: r.parentMobile,
                assignedCampus: r.campus || targetCampus,
                grade: r.gradeInterested || '',
                leadStatus: r.leadStatus || '',
                ambassadorName: r.user?.fullName || '',
                academicYear: r.academicYear || '',
                referrerCode: r.user?.referralCode || '',
                referralCode: null,
                role: 'Referral', confirmedReferralCount: 0, DeviceToken: []
            }
        }
    } else if (type === 'STUDENTS') {
        const where = getStudentQuery(audience)
        const s = await prisma.student.findFirst({ 
            where,
            orderBy: { studentId: 'desc' },
            include: { campus: true, parent: true }
        })
        if (s) {
            sampleUser = {
                userId: 0,
                fullName: s.parent?.fullName || 'Parent',
                email: s.parent?.email,
                mobileNumber: s.parent?.mobileNumber,
                assignedCampus: s.campus?.campusName || targetCampus,
                grade: s.grade || '',
                referralCode: s.parent?.referralCode || '',
                admissionDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '',
                role: 'Parent', confirmedReferralCount: 0, DeviceToken: []
            }
        }
    }

    if (!sampleUser) {
        // Fallback to dummy data
        sampleUser = {
            fullName: 'Test Recipient',
            referralCode: 'TEST123',
            assignedCampus: targetCampus,
            role: 'Ambassador',
            mobileNumber: testMobile,
            confirmedReferralCount: 5,
            pendingReferralCount: 2
        }
    }

        // WhatsApp Logic (Main priority) - Use override if provided
        const isWhatsapp = (campaign as any).channels?.includes('WHATSAPP')
        if (isWhatsapp) {
            const mapping = overrideMapping || (campaign as any).waVariableMapping || {}
            const templateName = overrideTemplateName || (campaign as any).waTemplateName || 'welcome_message'
            
            const mappingKeys = Object.keys(mapping).filter(k => {
                const cleanKey = k.replace('button_', 'var_')
                return !isNaN(Number(cleanKey.replace(/\D/g, '')))
            })
            
            const waVars: string[] = []
            const btnVars: string[] = []
            const varCount = mappingKeys.length > 0 ? Math.max(...mappingKeys.map(k => Number(k.replace(/\D/g, '')))) : 0

            if (mappingKeys.length > 0) {
                for (let i = 1; i <= varCount; i++) {
                    const key = i.toString()
                    const btnKey = `button_${i}`
                    
                    // Body Var
                    const bodyMappedValue = mapping[key] || mapping[`var_${key}`]
                    if (bodyMappedValue === 'STATIC') {
                        const val = (mapping[`static_${key}`] || mapping[`static_var_${key}`] || '').toString().replace(/[\r\n]+/g, ' ').trim()
                        waVars.push(val)
                    } else if (bodyMappedValue) {
                        try {
                            const resolved = (await aliasTokens(bodyMappedValue, sampleUser, type)).toString().replace(/[\r\n]+/g, ' ').trim()
                            if (bodyMappedValue.toLowerCase().includes('campus') && !resolved) {
                                waVars.push(targetCampus || 'Global Campus')
                            } else {
                                waVars.push(resolved || '')
                            }
                        } catch (err: any) {
                            console.error('[Action_Safety] aliasTokens failed (DB Timeout?):', err.message)
                            waVars.push('')
                        }
                    }

                    // Button Var
                    const btnMappedValue = mapping[btnKey]
                    if (btnMappedValue === 'STATIC') {
                        btnVars.push((mapping[`static_${btnKey}`] || '').toString().trim())
                    } else if (btnMappedValue) {
                        btnVars.push((await aliasTokens(btnMappedValue, sampleUser, type)).toString().trim())
                    }
                }
            } else {
                // No mapping defined — fallback to Name + Campus (2 Variables Only)
                waVars.push((sampleUser?.fullName || 'User').toString().trim())
                waVars.push(sampleUser?.assignedCampus || targetCampus || 'Global Campus')
            }
            
            console.log(`[VAR_DEBUG] Final waVars for ${templateName}:`, waVars)
            console.log(`[VAR_DEBUG] Final btnVars for ${templateName}:`, btnVars)

            const cleanMobile = testMobile.replace(/\D/g, '')
            const requestId = `test_${campaignId}_${Date.now()}`
            const headerUrl = overrideHeaderUrl || (campaign as any).waHeaderUrl || null
            
            // WhatsApp Archival Enrichment for Tests: Pull branding from config
            let waTemplateBody = campaign.templateBody;
            if (templateName) {
                const waConfig = await prisma.whatsAppConfig.findFirst({
                    where: { templateName: templateName }
                }) as any;
                if (waConfig?.templateBody) {
                    waTemplateBody = waConfig.templateBody;
                }
            }

            const fullText = await aliasTokens(waTemplateBody, sampleUser, type)

            const res = await whatsappService.sendTemplateMessage(
                cleanMobile,
                templateName,
                waVars,
                'TEST',
                requestId,
                headerUrl,
                btnVars.length > 0 ? btnVars : undefined,
                fullText,
                sampleUser.role || 'User',
                sampleUser.assignedCampus || targetCampus || '-'
            )

            if (res.success) {
                // ✅ EXPERT OPTIMIZATION: Non-blocking logAction to prevent UI hang
                logAction('Test Campaign Dispatch', 'Marketing', `Sent test WhatsApp for campaign #${campaignId} (${campaign.name}) to ${testMobile}`, undefined).catch(err => {
                    console.error('[Action_Safety] Background logAction failed:', err.message)
                })
                return { success: true }
            } else {
                throw new Error('WhatsApp API failed to send test message')
            }
        }

        return { success: false, error: 'Only WhatsApp test is supported in this mode' }

    } catch (error: any) {
        console.error('sendTestCampaignMessage error:', error)
        return { success: false, error: error.message || 'Failed to send test message' }
    }
}

