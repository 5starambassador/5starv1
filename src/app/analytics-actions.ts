'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission, getScopeFilter } from '@/lib/permission-service'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export interface ExplorationFilters {
    dateRange?: {
        from?: string
        to?: string
        preset?: '7d' | '30d' | '90d' | 'all'
    }
    campus?: string
    role?: string
}

export interface ExplorationResponse {
    success: boolean
    data?: any[]
    error?: string
}

/**
 * Optimized server action for the Interactive Data Explorer.
 * Returns a flat structure suitable for data tables and charts.
 */
export async function getExplorationData(reportId: string, filters: ExplorationFilters): Promise<ExplorationResponse> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!(await hasPermission('analytics'))) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Calculate Date Filters
        let startDate: Date | undefined
        let endDate: Date = endOfDay(new Date())

        if (filters.dateRange?.preset && filters.dateRange.preset !== 'all') {
            const days = filters.dateRange.preset === '7d' ? 7 : filters.dateRange.preset === '30d' ? 30 : 90
            startDate = startOfDay(subDays(new Date(), days))
        } else if (filters.dateRange?.from && filters.dateRange?.to) {
            startDate = startOfDay(new Date(filters.dateRange.from))
            endDate = endOfDay(new Date(filters.dateRange.to))
        }

        const dateFilter = startDate ? { gte: startDate, lte: endDate } : undefined

        const { filter: scopeFilter } = await getScopeFilter('analytics')
        if (!scopeFilter) return { success: false, error: 'Unauthorized: Access denied' }

        // 2. Fetch Data based on Report ID
        if (reportId === 'users') {
            const users = await prisma.user.findMany({
                where: {
                    ...scopeFilter,
                    ...(dateFilter && { createdAt: dateFilter }),
                    ...(filters.campus && filters.campus !== 'All' && { assignedCampus: filters.campus }),
                    ...(filters.role && filters.role !== 'All' && { role: filters.role as any })
                },
                select: {
                    userId: true,
                    fullName: true,
                    mobileNumber: true,
                    role: true,
                    assignedCampus: true,
                    confirmedReferralCount: true,
                    status: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            })

            return { success: true, data: users }
        }

        if (reportId === 'leads' || reportId === 'pipeline') {
            const leads = await prisma.referralLead.findMany({
                where: {
                    ...scopeFilter,
                    ...(dateFilter && { createdAt: dateFilter }),
                    ...(filters.campus && filters.campus !== 'All' && { campus: filters.campus })
                },
                include: {
                    user: {
                        select: { fullName: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })

            const flatLeads = leads.map(l => ({
                id: l.leadId,
                name: l.parentName,
                mobile: l.parentMobile,
                campus: l.campus,
                grade: l.gradeInterested,
                status: l.leadStatus,
                referredBy: l.user.fullName,
                createdAt: l.createdAt
            }))

            return { success: true, data: flatLeads }
        }

        return { success: false, error: 'Report type not implemented for explorer' }

    } catch (error) {
        console.error('Exploration Data Error:', error)
        return { success: false, error: 'Failed to fetch analytical data' }
    }
}

export interface CohortRetention {
    month: string;      // Join month (e.g., "Aug 2025")
    size: number;       // Number of users in this cohort
    retention: number[]; // Retention % per month (e.g., [100, 85, 70, ...])
}

/**
 * Calculates cohort retention based on Join Date vs. Activity Logs.
 * A user is considered "retained" in Month N if they have any ActivityLog 
 * entry in that month.
 */
export async function getRetentionData(filters?: { campus?: string }): Promise<CohortRetention[]> {
    const admin = await getCurrentUser()
    if (!admin || !(await hasPermission('analytics'))) {
        throw new Error('Unauthorized')
    }

    try {
        const { filter: scopeFilter } = await getScopeFilter('analytics')
        if (!scopeFilter) throw new Error('Unauthorized: Access denied')

        // 1. Define time window (Last 6 months)
        const monthsCount = 6
        const now = new Date()
        const cohorts: CohortRetention[] = []

        // Start from 5 months ago to today
        const startOfWindow = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1)

        // 2. Fetch all ambassadors joined in the last 6 months
        const ambassadors = await prisma.user.findMany({
            where: {
                ...scopeFilter,
                role: { in: ['Staff', 'Parent', 'Alumni', 'Others'] },
                createdAt: { gte: startOfWindow },
                ...(filters?.campus && filters.campus !== 'All' && filters.campus !== 'all' && { assignedCampus: filters.campus })
            },
            select: {
                userId: true,
                createdAt: true
            }
        })

        // 3. Group users into monthly cohorts
        const cohortGroups: Record<string, number[]> = {}
        const monthNames: string[] = []

        for (let i = 0; i < monthsCount; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1) + i, 1)
            const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            monthNames.push(label)
            cohortGroups[label] = []
        }

        ambassadors.forEach(amb => {
            const joinMonth = amb.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            if (cohortGroups[joinMonth]) {
                cohortGroups[joinMonth].push(amb.userId)
            }
        })

        // 4. For each cohort, check retention in subsequent months
        for (const [joinMonth, userIds] of Object.entries(cohortGroups)) {
            if (userIds.length === 0) continue

            const retentionPercents: number[] = [100] // Month 0 is always 100%
            const monthNamesList = [...monthNames];
            const joinDateIndex = monthNamesList.indexOf(joinMonth);

            if (joinDateIndex === -1) continue;

            // Check each subsequent month in the window
            for (let m = joinDateIndex + 1; m < monthNamesList.length; m++) {
                const targetMonthLabel = monthNamesList[m]
                const targetMonthDate = new Date(targetMonthLabel)
                const startOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), 1)
                const endOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0, 23, 59, 59)

                // Check ActivityLogs for this cohort in this specific month
                const activeCount = await prisma.activityLog.groupBy({
                    by: ['userId'],
                    where: {
                        userId: { in: userIds },
                        createdAt: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    }
                })

                const percent = Math.round((activeCount.length / userIds.length) * 100)
                retentionPercents.push(percent)
            }

            cohorts.push({
                month: joinMonth,
                size: userIds.length,
                retention: retentionPercents
            })
        }

        // Sort cohorts by date descending
        return cohorts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())

    } catch (error) {
        console.error('Retention Data Error:', error)
        throw new Error('Failed to calculate retention data')
    }
}
