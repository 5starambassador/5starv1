'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'

export async function getAuditLogs(params: {
    search?: string
    module?: string
    startDate?: string
    endDate?: string
}) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') {
            return { error: 'Unauthorized' }
        }

        const where: any = {}

        if (params.search) {
            where.OR = [
                { description: { contains: params.search, mode: 'insensitive' } },
                { action: { contains: params.search, mode: 'insensitive' } }
            ]
        }

        // Logic Mappings for UI groups
        if (params.module && params.module !== 'All') {
            const mod = params.module.toUpperCase()
            let moduleTags: string[] = [mod, mod.toLowerCase()]

            if (mod === 'ADMIN') moduleTags = ['user', 'admin', 'system', 'ADMIN', 'USER']
            else if (mod === 'AUTH') moduleTags = ['auth', 'AUTH', 'login', 'SECURITY']
            else if (mod === 'LEADS') moduleTags = ['referral', 'lead-mgmt', 'leads', 'LEADS', 'REFERRAL']
            else if (mod === 'FINANCE') moduleTags = ['finance', 'settlement', 'payout', 'FINANCE', 'SETTLEMENT']
            else if (mod === 'REPORTS') moduleTags = ['reports', 'reporting', 'REPORTS']
            else if (mod === 'SETTINGS') moduleTags = ['settings', 'SETTINGS']
            else if (mod === 'SECURITY') moduleTags = ['security', 'permissions', 'verification', 'SECURITY', 'PERMISSIONS']

            where.module = { in: moduleTags }
        }

        if (params.startDate && params.endDate) {
            where.createdAt = {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate)
            }
        }

        const logs = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        // Manually populate actor details since no direct relation exists in schema
        const adminIds = logs.map(l => l.adminId).filter(Boolean) as number[]
        const userIds = logs.map(l => l.userId).filter(Boolean) as number[]

        const admins = await prisma.admin.findMany({
            where: { adminId: { in: adminIds } },
            select: { adminId: true, adminName: true, role: true }
        })

        const users = await prisma.user.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, fullName: true, role: true }
        })

        const enrichedLogs = logs.map(log => ({
            ...log,
            admin: log.adminId ? admins.find(a => a.adminId === log.adminId) : null,
            user: log.userId ? users.find(u => u.userId === log.userId) : null
        }))

        return { success: true, logs: enrichedLogs }
    } catch (error) {
        console.error('getAuditLogs error:', error)
        return { error: 'Failed' }
    }
}

export async function getAuditStats() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { error: 'Unauthorized' }

        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        // 1. Daily Volume
        const dailyVolume = await prisma.activityLog.count({
            where: { createdAt: { gte: startOfDay } }
        })

        // 2. Security Alerts (Critical actions)
        const securityAlerts = await prisma.activityLog.count({
            where: {
                createdAt: { gte: startOfDay },
                module: { in: ['SECURITY', 'AUTH', 'security', 'auth'] },
                action: { in: ['BAN', 'DELETE', 'FAILED_LOGIN'] }
            }
        })

        // 3. Module Health (Group by module with normalization)
        const logs = await prisma.activityLog.findMany({
            where: { createdAt: { gte: startOfDay } },
            select: { module: true }
        })
        const moduleCounts: Record<string, number> = {}

        const normalize = (m: string) => {
            const up = m.toUpperCase()
            if (['USER', 'ADMIN', 'SYSTEM'].includes(up)) return 'ADMIN'
            if (['REFERRAL', 'LEAD-MGMT', 'LEADS'].includes(up)) return 'LEADS'
            if (['SECURITY', 'PERMISSIONS', 'VERIFICATION'].includes(up)) return 'SECURITY'
            if (['FINANCE', 'SETTLEMENT', 'PAYOUT'].includes(up)) return 'FINANCE'
            if (['REPORTS', 'REPORTING'].includes(up)) return 'REPORTS'
            return up // Fallback to uppercase name
        }

        logs.forEach(l => {
            const norm = normalize(l.module)
            moduleCounts[norm] = (moduleCounts[norm] || 0) + 1
        })
        const moduleHealth = Object.entries(moduleCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)

        // 4. Top Actor
        // Simplification: just find most frequent actor ID in logs
        // Proper way requires GroupBy which might be tedious with mixed user/admin IDs
        // We'll estimate from the fetched logs for "Active Module" logic

        // Let's do a quick aggregate for Top Actor from the logs we fetched
        // Or fetch specific Top Actor
        const actorCounts: Record<string, number> = {}
        const _logsDetails = await prisma.activityLog.findMany({
            where: { createdAt: { gte: startOfDay } },
            take: 500
        })
        _logsDetails.forEach(l => {
            const key = l.adminId ? `admin:${l.adminId}` : l.userId ? `user:${l.userId}` : 'system'
            actorCounts[key] = (actorCounts[key] || 0) + 1
        })

        let topActorKey = 'None'
        let topActorCount = 0
        Object.entries(actorCounts).forEach(([key, count]) => {
            if (count > topActorCount) {
                topActorCount = count
                topActorKey = key
            }
        })

        let topActorName = 'System'
        if (topActorKey.startsWith('admin:')) {
            const aid = parseInt(topActorKey.split(':')[1])
            const a = await prisma.admin.findUnique({ where: { adminId: aid }, select: { adminName: true } })
            if (a) topActorName = a.adminName
        } else if (topActorKey.startsWith('user:')) {
            const uid = parseInt(topActorKey.split(':')[1])
            const u = await prisma.user.findUnique({ where: { userId: uid }, select: { fullName: true } })
            if (u) topActorName = u.fullName
        }

        return {
            success: true,
            stats: {
                dailyVolume,
                securityAlerts,
                moduleHealth,
                topActor: { name: topActorName, count: topActorCount }
            }
        }

    } catch (error) {
        console.error('getAuditStats error:', error)
        return { error: 'Failed' }
    }
}


export async function getUserAuditLogs(userId: number) {
    try {
        const user = await getCurrentUser()
        if (!user || !['Super Admin', 'Campus Head', 'Admission Admin'].includes(user.role)) {
            return { error: 'Unauthorized' }
        }

        // Check if admin has access to view audit logs or specific permissions
        // For now, we allow admins to view user logs as part of user management

        const logs = await prisma.activityLog.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // Limit to last 100 logs
        })

        return { success: true, logs }
    } catch (error) {
        console.error('Error fetching user audit logs:', error)
        return { error: 'Failed to fetch audit logs' }
    }
}
