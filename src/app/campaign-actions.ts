'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { getAmbassadorQuery, getStudentQuery } from '@/lib/campaign-utils'
import { EmailService } from '@/lib/email-service'
import { UserRole } from '@prisma/client'
import fs from 'fs'
import path from 'path'

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
    waTemplateName?: string
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
                waTemplateName: data.waTemplateName || null
            }
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
    waTemplateName: string
}>) {
    try {
        await checkCampaignAccess()
        const campaign = await prisma.campaign.update({
            where: { id },
            data
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
        await prisma.campaign.delete({
            where: { id }
        })

        await logAction('Delete Campaign', 'Marketing', `Deleted campaign: ${id}`, undefined)
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('deleteCampaign error:', error)
        return { success: false, error: 'Failed to delete campaign' }
    }
}

export async function getAudienceCount(audience: { type?: string, role: string, campus: string, activityStatus: string, [key: string]: any }) {
    try {
        await checkCampaignAccess()

        // Use efficient count queries instead of fetching all rows
        if (audience.type === 'PROGRAM_LEADS') {
            const where: any = {}
            if (audience.campus && audience.campus !== 'All') where.assignedCampus = audience.campus
            const count = await prisma.programLead.count({ where })
            return { success: true, count }
        }

        if (audience.type === 'REFERRALS') {
            const where: any = {}
            if (audience.campus && audience.campus !== 'All') where.campus = audience.campus
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
        const leads = await prisma.programLead.findMany({
            select: { visitorMobile: true, visitorName: true }
        })
        return leads.map(l => ({
            mobileNumber: l.visitorMobile,
            fullName: l.visitorName || 'Friend',
            role: 'Lead',
            confirmedReferralCount: 0
        }))
    }

    // 2. REFERRALS — respects campus filter
    if (audience.type === 'REFERRALS') {
        const where: any = {}
        if (audience.campus && audience.campus !== 'All') where.campus = audience.campus
        const referrals = await prisma.referralLead.findMany({
            where,
            select: { parentMobile: true, parentName: true, campus: true }
        })
        return referrals.map(r => ({
            mobileNumber: r.parentMobile,
            fullName: r.parentName || 'Parent',
            assignedCampus: r.campus || undefined,
            role: 'Referral',
            confirmedReferralCount: 0
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
            let baseUrl = process.env.NEXT_PUBLIC_APP_URL
            if (!baseUrl && process.env.NODE_ENV === 'development') {
                baseUrl = 'http://localhost:3001'
            } else if (!baseUrl) {
                baseUrl = 'http://localhost:3000'
            }
            fetch(`${baseUrl}/api/cron/process-jobs`, { method: 'GET', cache: 'no-store' }).catch(err => console.error('Failed to trigger worker', err))
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
        const headers = ['Name', 'Mobile', 'Role', 'Campus', 'Channel', 'Status', 'Sent At', 'Delivered At', 'Read At']
        const rows = recipients.map((r: any) => [
            r.name || 'User',
            r.mobile,
            r.role || '',
            r.campus || '',
            r.channel,
            r.status,
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
