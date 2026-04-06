'use server'

import prisma from "@/lib/prisma"
const db = prisma as any
import { hasPermission } from "@/lib/permission-service"
import { getCurrentUser } from "@/lib/auth-service"

export interface WhatsAppAnalytics {
    totalSent: number
    successRate: number
    chatbotVolume: number
    nudgeVolume: number
    dripVolume: number
    failureCount: number
    recentTrends: { date: string; sent: number; chatbot: number }[]
    distribution: { name: string; value: number }[]
}

/**
 * Fetches WhatsApp automation analytics.
 * Optimized to use count/groupBy and minimal data fetching.
 */
export async function getWhatsAppAnalytics(days: number = 7): Promise<WhatsAppAnalytics> {
    const user = await getCurrentUser()
    if (!user || !await hasPermission('analytics')) {
        throw new Error('Unauthorized')
    }

    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    startDate.setDate(startDate.getDate() - days)

    try {
        const [
            totalSent,
            failedCount,
            typeStats,
            dailyStats
        ] = await Promise.all([
            db.whatsAppLog.count({ where: { createdAt: { gte: startDate } } }),
            db.whatsAppLog.count({ where: { status: 'FAILED', createdAt: { gte: startDate } } }),
            db.whatsAppLog.groupBy({
                by: ['type'],
                _count: { _all: true },
                where: { createdAt: { gte: startDate } }
            }),
            db.whatsAppLog.findMany({
                where: { createdAt: { gte: startDate } },
                select: { createdAt: true, type: true },
                orderBy: { createdAt: 'asc' }
            })
        ])

        // Process Daily Trends
        const trendMap = new Map<string, { date: string; sent: number; chatbot: number }>()
        for (let i = 0; i <= days; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            trendMap.set(dateStr, { date: dateStr, sent: 0, chatbot: 0 })
        }

        dailyStats.forEach((log: { createdAt: Date, type: string }) => {
            const dateStr = log.createdAt.toISOString().split('T')[0]
            const entry = trendMap.get(dateStr)
            if (entry) {
                entry.sent++
                if (log.type === 'CHATBOT') entry.chatbot++
            }
        })

        const recentTrends = Array.from(trendMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(t => ({
                ...t,
                date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }))

        const distribution = typeStats.map((s: any) => ({
            name: s.type || 'UNKNOWN',
            value: s._count._all || 0
        }))

        const chatbotVolume = typeStats.find((s: any) => s.type === 'CHATBOT')?._count._all || 0
        const nudgeVolume = typeStats.find((s: any) => s.type === 'REMINDER' || s.type === 'SYSTEM')?._count._all || 0
        const dripVolume = typeStats.find((s: any) => s.type === 'DRIP')?._count._all || 0

        return {
            totalSent,
            successRate: totalSent > 0 ? Number(((totalSent - failedCount) / totalSent * 100).toFixed(1)) : 100,
            chatbotVolume,
            nudgeVolume,
            dripVolume,
            failureCount: failedCount,
            recentTrends,
            distribution
        }
    } catch (error) {
        console.error('Error fetching WhatsApp analytics:', error)
        return {
            totalSent: 0,
            successRate: 100,
            chatbotVolume: 0,
            nudgeVolume: 0,
            dripVolume: 0,
            failureCount: 0,
            recentTrends: [],
            distribution: []
        }
    }
}

/**
 * Fetches paginated WhatsApp logs for the new Logs tab.
 */
export async function getPaginatedWhatsAppLogs(page: number = 1, pageSize: number = 20, filters?: { status?: string, type?: string }) {
    const user = await getCurrentUser()
    if (!user || !await hasPermission('analytics')) {
        throw new Error('Unauthorized')
    }

    try {
        const whereClause: any = {}
        if (filters?.status && filters.status !== 'All') whereClause.status = filters.status
        
        if (filters?.type && filters.type !== 'All') {
            if (filters.type === 'AUTOMATION') {
                whereClause.type = { in: ['SYSTEM', 'REMINDER'] }
            } else if (filters.type === 'CHATBOT') {
                whereClause.type = { in: ['CHATBOT', 'INBOUND'] }
            } else {
                // ✅ EXPERT OPTIMIZATION: Case-insensitive matching for 'CAMPAIGN' vs 'Campaign'
                whereClause.type = { equals: filters.type, mode: 'insensitive' }
            }
        } else if (filters?.type === 'All' && (filters as any).excludeCampaigns) {
            whereClause.type = { not: 'CAMPAIGN' }
        }

        if ((filters as any)?.refId) {
            // ✅ EXPERT OPTIMIZATION: Use startsWith to capture timestamped IDs from recent hardened dispatches
            whereClause.refId = { startsWith: (filters as any).refId }
        }

        const [logs, total] = await Promise.all([
            db.whatsAppLog.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    mobile: true,
                    template: true,
                    type: true,
                    status: true,
                    refId: true,
                    content: true,
                    createdAt: true
                }
            }),
            db.whatsAppLog.count({ where: whereClause })
        ])

        // --- Enriching logs with User/Admin/Recipient details (Role and Campus) ---
        const mobiles = Array.from(new Set(logs.map((l: any) => l.mobile))) as string[]
        const cleanMobiles = mobiles.map((m: string) => m.replace(/^91/, ''))
        
        // 1. Lookup in User table (Live Profile)
        const [users, admins] = await Promise.all([
            db.user.findMany({
                where: { mobileNumber: { in: [...mobiles, ...cleanMobiles] } },
                select: { mobileNumber: true, role: true, assignedCampus: true }
            }),
            db.admin.findMany({
                where: { adminMobile: { in: [...mobiles, ...cleanMobiles] } },
                select: { adminMobile: true, role: true, assignedCampus: true }
            })
        ])

        // 2. Identify remaining mobiles for CampaignRecipient fallback
        const foundMobiles = new Set([
            ...users.map((u: any) => u.mobileNumber),
            ...admins.map((a: any) => a.adminMobile)
        ])
        const missingMobiles = mobiles.filter((m: string) => !foundMobiles.has(m) && !foundMobiles.has(m.replace(/^91/, '')))

        let campaignRecipients: any[] = []
        if (missingMobiles.length > 0) {
            // Check if we have a campaign context from the refId (e.g. camp_30)
            const campLog = logs.find((l: any) => l.refId?.startsWith('camp_'))
            const campaignIdStr = campLog?.refId?.split('_')[1]
            const campaignId = campaignIdStr ? parseInt(campaignIdStr) : undefined

            campaignRecipients = await db.campaignRecipient.findMany({
                where: { 
                    mobile: { in: missingMobiles.map((m: string) => m.replace(/^91/, '')) },
                    ...(campaignId && { campaignId })
                },
                select: { mobile: true, role: true, campus: true, campaignId: true }
            })
        }

        const enrichedLogs = logs.map((log: any) => {
            const cleanMobile = log.mobile.replace(/^91/, '')
            const user = users.find((u: any) => u.mobileNumber === cleanMobile || u.mobileNumber === log.mobile)
            const admin = admins.find((a: any) => a.adminMobile === cleanMobile || a.adminMobile === log.mobile)
            const recipient = campaignRecipients.find((r: any) => r.mobile === cleanMobile || r.mobile === log.mobile)
            
            return {
                ...log,
                userRole: user?.role || admin?.role || recipient?.role || 'User',
                campus: user?.assignedCampus || admin?.assignedCampus || recipient?.campus || '-'
            }
        })

        return {
            success: true,
            logs: enrichedLogs,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    } catch (error) {
        console.error('Error fetching paginated WhatsApp logs:', error)
        return { success: false, error: 'Failed to fetch logs' }
    }
}
