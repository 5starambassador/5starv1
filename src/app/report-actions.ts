'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-service'

// Bypass stale Prisma types - Using string literals for statuses
const _LeadStatus = {
    New: 'New',
    Interested: 'Interested',
    Contacted: 'Contacted',
    Follow_up: 'Follow-up',
    Confirmed: 'Confirmed',
    Admitted: 'Admitted',
    Rejected: 'Rejected'
} as any

const _UserRole = {
    Parent: 'Parent',
    Staff: 'Staff',
    Alumni: 'Alumni',
    Others: 'Others'
} as any

// ===================== REPORT #1: REFERRAL PERFORMANCE =====================
export async function generateReferralPerformanceReport(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }

        // Apply Date Filters (on User creation)
        if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {}
            if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate)
        }

        // Apply Campus Filter
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        // Get all users with their referral counts
        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                referrals: {
                    select: {
                        leadStatus: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { confirmedReferralCount: 'desc' }
        })

        // Format CSV
        let csv = 'Ambassador Name,Role,Campus,Total Referrals,Confirmed,Pending,Conversion Rate,Benefit Tier,Benefit Status,Child Code,Year Fee Benefit,Long Term Benefit,Status,Joined Date\n'

        users.forEach((user: any) => {
            const totalReferrals = user.referrals.length
            const confirmed = user.referrals.filter((r: any) => r.leadStatus === 'Confirmed').length
            const pending = user.referrals.filter((r: any) => r.leadStatus !== 'Confirmed').length
            const conversionRate = totalReferrals > 0 ? ((confirmed / totalReferrals) * 100).toFixed(1) : '0'
            const benefitTier = confirmed >= 5 ? '5 Stars' : confirmed >= 4 ? '4 Stars' : confirmed >= 3 ? '3 Stars' : confirmed >= 2 ? '2 Stars' : confirmed >= 1 ? '1 Star' : 'None'

            csv += `"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",${totalReferrals},${confirmed},${pending},${conversionRate}%,${benefitTier},${user.benefitStatus || 'Active'},"${user.childEprNo || ''}",${user.yearFeeBenefitPercent}%,${user.longTermBenefitPercent}%,${user.status},${new Date(user.createdAt).toLocaleDateString()}\n`
        })

        return { success: true, csv, filename: `referral-performance-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Referral Performance Report Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #2: PENDING LEADS =====================
export async function generatePendingLeadsReport(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = {
            leadStatus: { in: [_LeadStatus.New, _LeadStatus.Follow_up] }
        }

        // Date Filter
        if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {}
            if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate)
        }

        // Campus Filter
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.campus = filters.campus
        }

        const pendingLeads = await prisma.referralLead.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { fullName: true, mobileNumber: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        let csv = 'Lead Name,Parent Mobile,Interested Campus,Grade,Status,Referred By,Ambassador Mobile,Days Pending,Created Date\n'

        pendingLeads.forEach(lead => {
            const daysPending = Math.floor((new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            csv += `"${lead.parentName}",${lead.parentMobile},"${lead.campus || 'Not Specified'}","${lead.gradeInterested || 'Not Specified'}",${lead.leadStatus},"${lead.user.fullName}",${lead.user.mobileNumber},${daysPending},${new Date(lead.createdAt).toLocaleDateString()}\n`
        })

        return { success: true, csv, filename: `pending-leads-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Pending Leads Report Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #3: MONTHLY TRENDS =====================
export async function generateMonthlyTrendsReport(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const now = new Date()
        let startLimit = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        let endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        if (filters?.startDate) startLimit = new Date(filters.startDate)
        if (filters?.endDate) endLimit = new Date(filters.endDate)

        const monthsData: any[] = []
        let current = new Date(startLimit.getFullYear(), startLimit.getMonth(), 1)

        while (current <= endLimit) {
            const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59)

            const whereBase: any = { createdAt: { gte: monthStart, lte: monthEnd } }
            if (filters?.campus && filters.campus !== 'All') {
                whereBase.assignedCampus = filters.campus
            }

            const newAmbassadors = await prisma.user.count({
                where: { ...whereBase, referralCode: { not: null } }
            })

            const newLeads = await prisma.referralLead.count({
                where: {
                    createdAt: { gte: monthStart, lte: monthEnd },
                    ...(filters?.campus && filters.campus !== 'All' && { campus: filters.campus })
                }
            })

            const confirmed = await prisma.referralLead.count({
                where: {
                    leadStatus: _LeadStatus.Confirmed,
                    confirmedDate: { gte: monthStart, lte: monthEnd },
                    ...(filters?.campus && filters.campus !== 'All' && { campus: filters.campus })
                }
            })

            const conversionRate = newLeads > 0 ? ((confirmed / newLeads) * 100).toFixed(1) : '0'

            monthsData.push({
                month: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                newAmbassadors,
                newLeads,
                confirmed,
                conversionRate
            })

            current.setMonth(current.getMonth() + 1)
        }

        let csv = 'Month,New Ambassadors,New Leads,Confirmed Admissions,Conversion Rate\n'
        monthsData.forEach((m: any) => {
            csv += `${m.month},${m.newAmbassadors},${m.newLeads},${m.confirmed},${m.conversionRate}%\n`
        })

        return { success: true, csv, filename: `monthly-trends-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Monthly Trends Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #4: INACTIVE USERS =====================
export async function generateInactiveUsersReport(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = {
            referralCode: { not: null },
            status: 'Inactive'
        }

        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        const inactiveUsers = await prisma.user.findMany({
            where: whereClause,
            include: {
                referrals: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        let csv = 'Ambassador Name,Role,Campus,Mobile,Total Referrals,Last Referral Date,Registered Date,Status\n'

        inactiveUsers.forEach((user: any) => {
            const lastReferralDate = user.referrals[0] ? new Date(user.referrals[0].createdAt).toLocaleDateString() : 'Never'
            csv += `"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",${user.mobileNumber},${user.confirmedReferralCount},${lastReferralDate},${new Date(user.createdAt).toLocaleDateString()},${user.status}\n`
        })

        return { success: true, csv, filename: `inactive-users-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Inactive Users Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #5: TOP PERFORMERS LEADERBOARD =====================
export async function generateTopPerformersReport(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        const topPerformers = await prisma.user.findMany({
            where: whereClause,
            include: {
                referrals: {
                    where: { leadStatus: _LeadStatus.Confirmed }
                }
            },
            orderBy: { confirmedReferralCount: 'desc' },
            take: 50
        })

        let csv = 'Rank,Ambassador Name,Role,Campus,Confirmed Referrals,Benefit Tier,Year Fee Benefit,Long Term Benefit\n'

        topPerformers.forEach((user: any, index: number) => {
            const benefitTier = user.confirmedReferralCount >= 5 ? '5 Stars' : user.confirmedReferralCount >= 4 ? '4 Stars' : user.confirmedReferralCount >= 3 ? '3 Stars' : user.confirmedReferralCount >= 2 ? '2 Stars' : '1 Star'
            csv += `${index + 1},"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",${user.confirmedReferralCount},${benefitTier},${user.yearFeeBenefitPercent}%,${user.longTermBenefitPercent}%\n`
        })

        return { success: true, csv, filename: `top-performers-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Top Performers Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #6: CAMPUS DISTRIBUTION =====================
export async function generateCampusDistributionReport() {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const campusStats = await prisma.user.groupBy({
            by: ['assignedCampus'],
            _count: { userId: true },
            where: { referralCode: { not: null } }
        })

        let csv = 'Campus,Total Ambassadors,Total Leads,Confirmed,Conversion Rate,Parents,Staff\n'

        for (const stat of campusStats) {
            const campus = stat.assignedCampus || 'Not Assigned'

            const parents = await prisma.user.count({
                where: { referralCode: { not: null }, assignedCampus: stat.assignedCampus, role: 'Parent' }
            })

            const staff = await prisma.user.count({
                where: { referralCode: { not: null }, assignedCampus: stat.assignedCampus, role: 'Staff' }
            })

            const totalLeads = await prisma.referralLead.count({
                where: { campus: stat.assignedCampus }
            })

            const confirmed = await prisma.referralLead.count({
                where: { campus: stat.assignedCampus, leadStatus: _LeadStatus.Confirmed }
            })

            const conversionRate = totalLeads > 0 ? ((confirmed / totalLeads) * 100).toFixed(1) : '0'

            csv += `"${campus}",${stat._count.userId},${totalLeads},${confirmed},${conversionRate}%,${parents},${staff}\n`
        }

        return { success: true, csv, filename: `campus-distribution-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Campus Distribution Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #7: BENEFIT TIER ANALYSIS =====================
export async function generateBenefitTierReport(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const tiers = [
            { name: '5 Stars', min: 5, max: Infinity },
            { name: '4 Stars', min: 4, max: 4 },
            { name: '3 Stars', min: 3, max: 3 },
            { name: '2 Stars', min: 2, max: 2 },
            { name: '1 Star', min: 1, max: 1 },
            { name: 'No Tier', min: 0, max: 0 }
        ]

        let csv = 'Benefit Tier,User Count,Avg Year Fee Benefit,Avg Long Term Benefit,Percentage\n'

        const baseWhere: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            baseWhere.assignedCampus = filters.campus
        }

        const totalUsers = await prisma.user.count({ where: baseWhere })

        for (const tier of tiers) {
            const users = await prisma.user.findMany({
                where: {
                    ...baseWhere,
                    confirmedReferralCount: tier.max === Infinity ? { gte: tier.min } : { gte: tier.min, lte: tier.max }
                },
                select: { yearFeeBenefitPercent: true, longTermBenefitPercent: true }
            })

            const count = users.length
            const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0'
            const avgYear = count > 0 ? (users.reduce((s: number, u: any) => s + u.yearFeeBenefitPercent, 0) / count).toFixed(1) : '0'
            const avgLong = count > 0 ? (users.reduce((s: number, u: any) => s + u.longTermBenefitPercent, 0) / count).toFixed(1) : '0'

            csv += `${tier.name},${count},${avgYear}%,${avgLong}%,${percentage}%\n`
        }

        return { success: true, csv, filename: `benefit-tier-analysis-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Benefit Tier Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #8: NEW REGISTRATIONS =====================
export async function generateNewRegistrationsReport(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }

        if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {}
            if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate)
        } else {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            whereClause.createdAt = { gte: thirtyDaysAgo }
        }

        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        const newUsers = await prisma.user.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        })

        let csv = 'Registration Date,Ambassador Name,Role,Campus,Mobile,Referrals,Benefit Status,Child Code,Status\n'

        newUsers.forEach((user: any) => {
            csv += `${new Date(user.createdAt).toLocaleDateString()},"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",${user.mobileNumber},${user.confirmedReferralCount},${user.benefitStatus || 'Active'},"${user.childEprNo || ''}",${user.status}\n`
        })

        return { success: true, csv, filename: `new-registrations-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('New Registrations Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #9: STAFF VS PARENT COMPARISON =====================
export async function generateStaffVsParentReport(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const roles = [_UserRole.Parent, _UserRole.Staff]
        let csv = 'Role,Ambassadors,Leads,Confirmed,Conversion%,Avg Referrals\n'

        const baseWhere: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            baseWhere.assignedCampus = filters.campus
        }

        for (const role of roles) {
            const users = await prisma.user.findMany({
                where: { ...baseWhere, role },
                include: { referrals: true }
            })

            const totalAmbassadors = users.length
            const totalLeads = users.reduce((sum: number, u: any) => sum + u.referrals.length, 0)
            const totalConfirmed = users.reduce((sum: number, u: any) => sum + u.confirmedReferralCount, 0)
            const conversion = totalLeads > 0 ? ((totalConfirmed / totalLeads) * 100).toFixed(1) : '0'
            const avgReferrals = totalAmbassadors > 0 ? (totalLeads / totalAmbassadors).toFixed(1) : '0'

            csv += `${role},${totalAmbassadors},${totalLeads},${totalConfirmed},${conversion}%,${avgReferrals}\n`
        }

        return { success: true, csv, filename: `staff-vs-parent-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Staff vs Parent Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #10: LEAD STATUS PIPELINE =====================
export async function generateLeadPipelineReport(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const statuses = [_LeadStatus.New, _LeadStatus.Follow_up, _LeadStatus.Confirmed]
        let csv = 'Lead Status,Count,Percentage,Avg Days in Stage\n'

        const baseWhere: any = {}
        if (filters?.startDate || filters?.endDate) {
            baseWhere.createdAt = {}
            if (filters.startDate) baseWhere.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) baseWhere.createdAt.lte = new Date(filters.endDate)
        }
        if (filters?.campus && filters.campus !== 'All') {
            baseWhere.campus = filters.campus
        }

        const totalLeads = await prisma.referralLead.count({ where: baseWhere })

        for (const status of statuses) {
            const whereClause = { ...baseWhere, leadStatus: status }
            const leads = await prisma.referralLead.findMany({ where: whereClause })
            const count = leads.length
            const percentage = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0'

            const avgDays = count > 0 ?
                (leads.reduce((sum: number, lead: any) => {
                    const endDate = status === 'Confirmed' && lead.confirmedDate ? new Date(lead.confirmedDate) : new Date()
                    const startDate = new Date(lead.createdAt)
                    return sum + Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                }, 0) / count).toFixed(1) : '0'

            csv += `${status},${count},${percentage}%,${avgDays} days\n`
        }

        return { success: true, csv, filename: `lead-pipeline-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Lead Pipeline Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #11: STAR MILESTONE TRACKER =====================
export async function generateStarMilestoneReport(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        const users = await prisma.user.findMany({
            where: {
                ...whereClause,
                confirmedReferralCount: { in: [0, 1, 2, 3, 4] }
            },
            orderBy: { confirmedReferralCount: 'desc' }
        })

        let csv = 'Ambassador Name,Mobile,Campus,Current Stars,Confirmed,Needed for Next,Proximity%\n'

        users.forEach((user: any) => {
            const current = user.confirmedReferralCount
            const next = current + 1
            const needed = 1
            const proximity = Math.round((current / next) * 100)

            csv += `"${user.fullName}",${user.mobileNumber},"${user.assignedCampus || 'N/A'}",${current} Stars,${current},${needed},${proximity}%\n`
        })

        return { success: true, csv, filename: `star-milestones-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Star Milestone Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: CONVERSION FUNNEL =====================
export async function generateConversionFunnelData(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = {}
        if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {}
            if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate)
        }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.campus = filters.campus
        }

        const stages = [
            { id: 'New', label: 'New Leads', color: '#3B82F6' },
            { id: 'Interested', label: 'Interested', color: '#8B5CF6' },
            { id: 'Confirmed', label: 'Confirmed', color: '#10B981' },
            { id: 'Admitted', label: 'Admitted', color: '#059669' }
        ]

        const data = await Promise.all(stages.map(async (stage) => {
            const count = await prisma.referralLead.count({
                where: {
                    ...whereClause,
                    leadStatus: stage.id as any
                }
            })
            return { stage: stage.label, count, color: stage.color }
        }))

        const confirmedLeads = await prisma.referralLead.findMany({
            where: {
                ...whereClause,
                leadStatus: _LeadStatus.Confirmed,
                confirmedDate: { not: null }
            },
            select: { createdAt: true, confirmedDate: true }
        })

        const avgVelocity = confirmedLeads.length > 0
            ? (confirmedLeads.reduce((acc, lead) => {
                const diff = new Date(lead.confirmedDate!).getTime() - new Date(lead.createdAt).getTime()
                return acc + Math.max(0, diff / (1000 * 60 * 60 * 24))
            }, 0) / confirmedLeads.length).toFixed(1)
            : '0'

        return { success: true, funnelData: data, avgVelocity }
    } catch (error) {
        console.error('Funnel Data Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: FINANCIAL ROI =====================
export async function generateFinancialROIData(filters?: { startDate?: string, endDate?: string, campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                referrals: {
                    where: { leadStatus: _LeadStatus.Confirmed }
                }
            }
        })

        let totalRevenue = 0
        let totalBenefitCost = 0
        const roleBreakdown: Record<string, { revenue: number, cost: number }> = {
            Parent: { revenue: 0, cost: 0 },
            Staff: { revenue: 0, cost: 0 },
            Alumni: { revenue: 0, cost: 0 },
            Others: { revenue: 0, cost: 0 }
        }

        users.forEach((user: any) => {
            const confirmedCount = user.referrals.length
            if (confirmedCount > 0) {
                const revenuePerStudent = 60000
                const revenue = confirmedCount * revenuePerStudent
                const benefitPerYear = (user.studentFee || 60000) * (user.yearFeeBenefitPercent / 100)

                totalRevenue += revenue
                totalBenefitCost += benefitPerYear

                const role = user.role as string
                if (roleBreakdown[role]) {
                    roleBreakdown[role].revenue += revenue
                    roleBreakdown[role].cost += benefitPerYear
                }
            }
        })

        const chartData = Object.entries(roleBreakdown).map(([role, data]) => ({
            role,
            revenue: data.revenue,
            cost: data.cost,
            net: data.revenue - data.cost
        })).filter(d => d.revenue > 0)

        return {
            success: true,
            roi: {
                revenue: totalRevenue,
                cost: totalBenefitCost,
                netYield: totalRevenue - totalBenefitCost,
                roiRatio: totalBenefitCost > 0 ? (totalRevenue / totalBenefitCost).toFixed(1) : '∞',
                breakdown: chartData
            }
        }
    } catch (error) {
        console.error('ROI Data Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: TARGET ACHIEVEMENT =====================
export async function generateTargetAchievementData(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        const campusWhere: any = filters?.campus && filters.campus !== 'All'
            ? { campusName: filters.campus }
            : {}

        const campuses = await prisma.campus.findMany({
            where: { isActive: true, ...campusWhere },
            include: {
                targets: {
                    where: { month: currentMonth, year: currentYear }
                }
            }
        })

        const chartData = await Promise.all(campuses.map(async (c) => {
            const target = c.targets[0]?.admissionTarget || 10
            const actual = await prisma.referralLead.count({
                where: {
                    campus: c.campusName,
                    leadStatus: _LeadStatus.Confirmed,
                    confirmedDate: {
                        gte: new Date(currentYear, currentMonth - 1, 1),
                        lte: new Date(currentYear, currentMonth, 0)
                    }
                }
            })

            return {
                campus: c.campusName,
                target,
                actual,
                percent: Math.round((actual / target) * 100),
                capacity: c.maxCapacity || 500,
                enrolled: c.currentEnrollment || 0,
                occupancy: Math.round(((c.currentEnrollment || 0) / (c.maxCapacity || 500)) * 100)
            }
        }))

        return { success: true, achievementData: chartData }
    } catch (error) {
        console.error('Target Data Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: STAR MILESTONES =====================
export async function generateStarMilestonesData(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { referrals: { where: { leadStatus: _LeadStatus.Confirmed } } }
                }
            }
        })

        const tiers = {
            '1-Star': 0, // 1-5
            '2-Star': 0, // 6-10
            '3-Star': 0, // 11-25
            '4-Star': 0, // 26-50
            '5-Star': 0  // 51+
        }

        const risingStars: any[] = []

        users.forEach((user: any) => {
            const count = user._count.referrals
            if (count === 0) return

            let currentTier = ''
            let nextTierGoal = 0
            let nextTierLabel = ''

            if (count >= 51) {
                tiers['5-Star']++
                currentTier = '5-Star'
            } else if (count >= 26) {
                tiers['4-Star']++
                currentTier = '4-Star'
                nextTierGoal = 51
                nextTierLabel = '5-Star'
            } else if (count >= 11) {
                tiers['3-Star']++
                currentTier = '3-Star'
                nextTierGoal = 26
                nextTierLabel = '4-Star'
            } else if (count >= 6) {
                tiers['2-Star']++
                currentTier = '2-Star'
                nextTierGoal = 11
                nextTierLabel = '3-Star'
            } else {
                tiers['1-Star']++
                currentTier = '1-Star'
                nextTierGoal = 6
                nextTierLabel = '2-Star'
            }

            // identify rising stars (within 1 of next milestone)
            if (nextTierGoal > 0 && (nextTierGoal - count) <= 1) {
                risingStars.push({
                    name: user.fullName,
                    current: count,
                    needed: nextTierGoal,
                    nextTier: nextTierLabel,
                    campus: user.assignedCampus
                })
            }
        })

        const chartData = Object.entries(tiers).map(([name, value]) => ({ name, value }))

        return {
            success: true,
            milestones: {
                distribution: chartData,
                risingStars: risingStars.sort((a, b) => (a.needed - a.current) - (b.needed - b.current)).slice(0, 5)
            }
        }
    } catch (error) {
        console.error('Milestone Data Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: ADMISSION INTELLIGENCE =====================
export async function generateAdmissionIntelligenceData(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const campusWhere: any = filters?.campus && filters.campus !== 'All'
            ? { campusName: filters.campus }
            : {}

        const campuses = await prisma.campus.findMany({
            where: { isActive: true, ...campusWhere }
        })

        const intelligenceData = await Promise.all(campuses.map(async (c) => {
            // 1. Calculate Velocity (Days to confirm) for this campus
            const confirmedLeads = await prisma.referralLead.findMany({
                where: {
                    campus: c.campusName,
                    leadStatus: _LeadStatus.Confirmed,
                    confirmedDate: { not: null }
                },
                select: { createdAt: true, confirmedDate: true },
                orderBy: { confirmedDate: 'desc' },
                take: 50 // Recent 50 conversions for rolling average
            })

            const velocity = confirmedLeads.length > 0
                ? (confirmedLeads.reduce((acc, lead) => {
                    const diff = new Date(lead.confirmedDate!).getTime() - new Date(lead.createdAt).getTime()
                    return acc + Math.max(0, diff / (1000 * 60 * 60 * 24))
                }, 0) / confirmedLeads.length).toFixed(1)
                : '0'

            // 2. Predictive Yield
            // Get campus-specific conversion rate
            const totalLeads = await prisma.referralLead.count({ where: { campus: c.campusName } })
            const totalConfirmed = await prisma.referralLead.count({
                where: { campus: c.campusName, leadStatus: _LeadStatus.Confirmed }
            })
            const conversionRate = totalLeads > 0 ? (totalConfirmed / totalLeads) : 0.1 // Default 10% if no data

            // Count new/interested leads
            const pipelineLeads = await prisma.referralLead.count({
                where: {
                    campus: c.campusName,
                    leadStatus: { in: [_LeadStatus.New, _LeadStatus.Interested, _LeadStatus.Follow_up] }
                }
            })

            const predictedYield = Math.round(pipelineLeads * conversionRate)

            return {
                campus: c.campusName,
                velocity: parseFloat(velocity),
                predictedYield,
                pipelineSize: pipelineLeads,
                actualConfirmed: totalConfirmed
            }
        }))

        // Overall summary
        const totalPredicted = intelligenceData.reduce((sum, d) => sum + d.predictedYield, 0)
        const avgVelocity = intelligenceData.length > 0
            ? (intelligenceData.reduce((sum, d) => sum + d.velocity, 0) / intelligenceData.length).toFixed(1)
            : '0'

        return {
            success: true,
            intelligence: {
                campuses: intelligenceData,
                totalPredicted,
                avgVelocity
            }
        }
    } catch (error) {
        console.error('Intelligence Data Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: RETENTION & ACTIVITY =====================
export async function generateRetentionAnalyticsData(filters?: { campus?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const campusWhere: any = filters?.campus && filters.campus !== 'All'
            ? { assignedCampus: filters.campus }
            : {}

        const users = await prisma.user.findMany({
            where: { isFiveStarMember: true, ...campusWhere },
            include: {
                referrals: {
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                }
            }
        })

        const now = new Date()
        const cohorts = {
            Active: 0,   // < 30 days
            Slowing: 0,  // 31-60 days
            AtRisk: 0,   // 61-90 days
            Dormant: 0   // > 90 days or never
        }

        users.forEach((user: any) => {
            const lastReferral = user.referrals[0]
            if (!lastReferral) {
                cohorts.Dormant++
                return
            }

            const diffDays = Math.floor((now.getTime() - new Date(lastReferral.createdAt).getTime()) / (1000 * 60 * 60 * 24))

            if (diffDays <= 30) cohorts.Active++
            else if (diffDays <= 60) cohorts.Slowing++
            else if (diffDays <= 90) cohorts.AtRisk++
            else cohorts.Dormant++
        })

        // Pipeline Bottlenecks (Avg Time in Stage)
        const leads = await prisma.referralLead.findMany({
            where: filters?.campus && filters.campus !== 'All' ? { campus: filters.campus } : {},
            select: { createdAt: true, leadStatus: true, confirmedDate: true }
        })

        const confirmedLeads = leads.filter(l => l.leadStatus === 'Confirmed' && l.confirmedDate)
        const avgDaysToConfirm = confirmedLeads.length > 0
            ? (confirmedLeads.reduce((acc, lead) => {
                const diff = new Date(lead.confirmedDate!).getTime() - new Date(lead.createdAt).getTime()
                return acc + Math.max(0, diff / (1000 * 60 * 60 * 24))
            }, 0) / confirmedLeads.length).toFixed(1)
            : '0'

        return {
            success: true,
            retention: {
                cohorts: [
                    { name: 'Active', value: cohorts.Active, color: '#10B981' },
                    { name: 'Slowing', value: cohorts.Slowing, color: '#F59E0B' },
                    { name: 'At Risk', value: cohorts.AtRisk, color: '#EF4444' },
                    { name: 'Dormant', value: cohorts.Dormant, color: '#64748b' }
                ],
                avgDaysToConfirm
            }
        }
    } catch (error) {
        console.error('Retention Data Error:', error)
        return { success: false, error: 'Failed' }
    }
}
