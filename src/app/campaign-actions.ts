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
    channels?: string[]
}) {
    try {
        await checkCampaignAccess()
        const campaign = await prisma.campaign.create({
            data: {
                name: data.name,
                subject: data.subject,
                templateBody: data.templateBody,
                type: data.type || 'EMAIL',
                targetAudience: data.targetAudience ?? {},
                channels: data.channels || ['EMAIL'],
                status: 'DRAFT'
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
    channels: string[]
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

export async function getAudienceCount(audience: { type?: string, role: string, campus: string, activityStatus: string }) {
    try {
        await checkCampaignAccess()
        const users = await getFilteredUsers(audience)
        return { success: true, count: users.length }
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

async function getFilteredUsers(audience: { type?: string, role: string, campus: string, activityStatus: string }): Promise<AudienceMember[]> {

    // 1. PROGRAM LEADS
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

    // 2. REFERRALS (General Admissions)
    if (audience.type === 'REFERRALS') {
        const referrals = await prisma.referralLead.findMany({
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

    // 3. STUDENTS (Parents)
    if (audience.type === 'STUDENTS') {
        const whereStudent = getStudentQuery(audience as any)

        const students = await prisma.student.findMany({
            where: whereStudent,
            select: {
                campus: { select: { campusName: true } },
                parent: {
                    select: { mobileNumber: true, fullName: true, email: true }
                }
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

    // 4. AMBASSADORS (Default / Existing Logic)
    let filtered: any[] = []

    if (!audience.type || audience.type === 'AMBASSADORS') {
        const where = getAmbassadorQuery(audience as any)

        const users = await prisma.user.findMany({
            where,
            include: {
                referrals: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        })

        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        if (audience.activityStatus !== 'All') {
            filtered = users.filter((u: any) => {
                const lastActivity = u.referrals?.[0]?.createdAt || u.createdAt
                const isDormant = new Date(lastActivity) < fourteenDaysAgo
                return audience.activityStatus === 'Dormant' ? isDormant : !isDormant
            })
        } else {
            filtered = users
        }
    }


    // Map existing User to AudienceMember
    return filtered.map((u: any) => ({
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

        // 1. Verify Campaign Exists
        const campaign = await prisma.campaign.findUnique({ where: { id } })
        if (!campaign) return { success: false, error: 'Campaign not found' }

        // 2. Create Background Job
        await (prisma as any).job.create({
            data: {
                type: 'CAMPAIGN_BATCH',
                payload: { campaignId: id },
                status: 'PENDING'
            }
        })

        // 3. Mark Campaign as Scheduled/Processing (Optional, helps UI)
        await prisma.campaign.update({
            where: { id },
            data: { status: 'SCHEDULED' }
        })

        // 4. Trigger Worker (Fire-and-forget)
        // We use a relative URL or full URL if needed. 
        // In Server Actions, we might need full URL. 
        // For now, let's rely on the cron or manual trigger, 
        // or attempt a fetch if we can resolve the host.
        // A simple way is to NOT wait for it.
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            fetch(`${baseUrl}/api/cron/process-jobs`, { method: 'GET', cache: 'no-store' }).catch(err => console.error('Failed to trigger worker', err))
        } catch (e) {
            // Ignore trigger errors
        }

        await logAction('Schedule Campaign', 'Marketing', `Scheduled campaign: ${campaign.name}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, message: 'Campaign scheduled for background processing' }

    } catch (error) {
        console.error('runCampaign error:', error)
        return { success: false, error: 'Failed to schedule campaign' }
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

        const rawTrends = await prisma.campaignLog.findMany({
            where: {
                runAt: { gte: thirtyDaysAgo }
            },
            orderBy: { runAt: 'asc' },
            select: {
                runAt: true,
                sentCount: true,
                whatsappDelivered: true,
                whatsappRead: true
            }
        })

        // Group trends by Day
        const trendsMap = new Map<string, any>()
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

        return {
            success: true,
            data: {
                channelStats,
                trends,
                recentActivity: recentActivity.map((a: any) => ({
                    ...a,
                    readAt: a.readAt ? new Date(a.readAt).toISOString() : null
                }))
            }
        }
    } catch (error) {
        console.error('getCampaignAnalytics error:', error)
        return { success: false, error: 'Failed to fetch analytics' }
    }
}
