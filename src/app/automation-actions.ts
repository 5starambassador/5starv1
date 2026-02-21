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
 * Fetches WhatsApp automation analytics for the dashboard
 */
export async function getWhatsAppAnalytics(days: number = 7): Promise<WhatsAppAnalytics> {
    const user = await getCurrentUser()
    if (!user || !await hasPermission('analytics')) {
        throw new Error('Unauthorized')
    }

    const startDate = new Date()
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
                select: { createdAt: true, type: true }
            })
        ])

        // Process Daily Trends
        const trendMap = new Map<string, { date: string; sent: number; chatbot: number }>()
        for (let i = 0; i < days; i++) {
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
            name: s.type,
            value: s._count._all
        }))

        const chatbotVolume = typeStats.find((s: any) => s.type === 'CHATBOT')?._count._all || 0
        const nudgeVolume = typeStats.find((s: any) => s.type === 'REMINDER')?._count._all || 0
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
