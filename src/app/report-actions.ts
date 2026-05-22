'use server'

import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission, getPermissionScope } from '@/lib/permission-service'
import prisma from '@/lib/prisma'
import { generateReferralStudentDetailsCSV } from '@/lib/report-utils'
import { getAccruedPayoutLiabilitiesInternal } from '@/app/finance-actions'

// Bypass stale Prisma types - Using string literals for statuses
const _LeadStatus = {
    New: 'New',
    Interested: 'Interested',
    Contacted: 'Contacted',
    Follow_up: 'Follow_up',
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
export async function generateReferralPerformanceReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    const canAccess = await hasPermission('reports')
    if (!admin || !canAccess) {
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

        // Apply Campus Filter & Scoping
        const scope = await getPermissionScope('reports')
        const isSuperAdmin = admin.role === 'Super Admin'

        if (!isSuperAdmin && scope === 'campus' && admin.assignedCampus) {
            whereClause.assignedCampus = admin.assignedCampus
        } else if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        // Get all users with their referral counts
        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                fullName: true,
                role: true,
                assignedCampus: true,
                mobileNumber: true,
                benefitStatus: true,
                aadharNo: true,
                address: true,
                academicYear: true,
                childEprNo: true,
                yearFeeBenefitPercent: true,
                longTermBenefitPercent: true,
                status: true,
                createdAt: true,
                confirmedReferralCount: true,
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
        const rows: string[] = [
            'Ambassador Name,Role,Campus,Mobile,Total Referrals,Confirmed,Pending,Conversion Rate,Benefit Tier,Benefit Status,Aadhar No,Address,Academic Year,Child Code,Year Fee Benefit,Long Term Benefit,Status,Joined Date'
        ]

        users.forEach((user: any) => {
            const totalReferrals = user.referrals.length
            const confirmed = user.referrals.filter((r: any) => r.leadStatus === 'Confirmed').length
            const pending = user.referrals.filter((r: any) => r.leadStatus !== 'Confirmed').length
            const conversionRate = totalReferrals > 0 ? ((confirmed / totalReferrals) * 100).toFixed(1) : '0'
            const benefitTier = confirmed >= 5 ? '5 Stars' : confirmed >= 4 ? '4 Stars' : confirmed >= 3 ? '3 Stars' : confirmed >= 2 ? '2 Stars' : confirmed >= 1 ? '1 Star' : 'None'

            rows.push(`"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",="${user.mobileNumber}",${totalReferrals},${confirmed},${pending},${conversionRate}%,${benefitTier},${user.benefitStatus || 'Active'},="${user.aadharNo || ''}","${(user.address || '').replace(/"/g, '""')}","${user.academicYear || ''}","${user.childEprNo || ''}",${user.yearFeeBenefitPercent}%,${user.longTermBenefitPercent}%,${user.status},${new Date(user.createdAt).toLocaleDateString()}`)
        })

        return { success: true, csv: rows.join('\n'), filename: `referral-performance-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Referral Performance Report Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #2: PENDING LEADS =====================
export async function generatePendingLeadsReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    const canAccess = await hasPermission('reports')
    if (!admin || !canAccess) {
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
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
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

        const rows: string[] = [
            'Lead Name,Parent Mobile,Interested Campus,Grade,Status,Referred By,Ambassador Mobile,Days Pending,Created Date'
        ]

        pendingLeads.forEach((lead: any) => {
            const daysPending = Math.floor((new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            rows.push(`"${lead.parentName}",${lead.parentMobile},"${lead.campus || 'Not Specified'}","${lead.gradeInterested || 'Not Specified'}",${lead.leadStatus},"${lead.user.fullName}",${lead.user.mobileNumber},${daysPending},${new Date(lead.createdAt).toLocaleDateString()}`)
        })

        return { success: true, csv: rows.join('\n'), filename: `pending-leads-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Pending Leads Report Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #3: MONTHLY TRENDS =====================
export async function generateMonthlyTrendsReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
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
            if (filters?.academicYear && filters.academicYear !== 'All') {
                whereBase.academicYear = filters.academicYear
            }

            const newAmbassadors = await prisma.user.count({
                where: { ...whereBase, referralCode: { not: null } }
            })

            const newLeads = await prisma.referralLead.count({
                where: {
                    createdAt: { gte: monthStart, lte: monthEnd },
                    ...(filters?.campus && filters.campus !== 'All' && { campus: filters.campus }),
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
                }
            })

            const confirmed = await prisma.referralLead.count({
                where: {
                    leadStatus: { in: [_LeadStatus.Confirmed, _LeadStatus.Admitted] },
                    confirmedDate: { gte: monthStart, lte: monthEnd },
                    ...(filters?.campus && filters.campus !== 'All' && { campus: filters.campus }),
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
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

        const rows: string[] = [
            'Month,New Ambassadors,New Leads,Confirmed Admissions,Conversion Rate'
        ]

        monthsData.forEach((m: any) => {
            rows.push(`${m.month},${m.newAmbassadors},${m.newLeads},${m.confirmed},${m.conversionRate}%`)
        })

        return { success: true, csv: rows.join('\n'), filename: `monthly-trends-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Monthly Trends Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #4: INACTIVE USERS =====================
export async function generateInactiveUsersReport(filters?: { campus?: string, academicYear?: string }) {
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
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const inactiveUsers = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                fullName: true,
                role: true,
                assignedCampus: true,
                mobileNumber: true,
                aadharNo: true,
                address: true,
                academicYear: true,
                confirmedReferralCount: true,
                createdAt: true,
                status: true,
                referrals: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const rows: string[] = [
            'Ambassador Name,Role,Campus,Mobile,Aadhar No,Address,Academic Year,Total Referrals,Last Referral Date,Registered Date,Status'
        ]

        inactiveUsers.forEach((user: any) => {
            const lastReferralDate = user.referrals[0] ? new Date(user.referrals[0].createdAt).toLocaleDateString() : 'Never'
            rows.push(`"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",="${user.mobileNumber}",="${user.aadharNo || ''}","${(user.address || '').replace(/"/g, '""')}","${user.academicYear || ''}",${user.confirmedReferralCount},${lastReferralDate},${new Date(user.createdAt).toLocaleDateString()},${user.status}`)
        })

        return { success: true, csv: rows.join('\n'), filename: `inactive-users-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Inactive Users Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #5: TOP PERFORMERS LEADERBOARD =====================
export async function generateTopPerformersReport(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const topPerformers = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                fullName: true,
                role: true,
                assignedCampus: true,
                confirmedReferralCount: true,
                yearFeeBenefitPercent: true,
                longTermBenefitPercent: true
            },
            orderBy: { confirmedReferralCount: 'desc' },
            take: 50
        })

        const rows: string[] = [
            'Rank,Ambassador Name,Role,Campus,Confirmed Referrals,Benefit Tier,Year Fee Benefit,Long Term Benefit'
        ]

        topPerformers.forEach((user: any, index: number) => {
            const benefitTier = user.confirmedReferralCount >= 5 ? '5 Stars' : user.confirmedReferralCount >= 4 ? '4 Stars' : user.confirmedReferralCount >= 3 ? '3 Stars' : user.confirmedReferralCount >= 2 ? '2 Stars' : '1 Star'
            rows.push(`${index + 1},"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",${user.confirmedReferralCount},${benefitTier},${user.yearFeeBenefitPercent}%,${user.longTermBenefitPercent}%`)
        })

        return { success: true, csv: rows.join('\n'), filename: `top-performers-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Top Performers Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #6: CAMPUS DISTRIBUTION =====================
export async function generateCampusDistributionReport(filters?: { academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const campusStats = await prisma.user.groupBy({
            by: ['assignedCampus'],
            _count: { userId: true },
            where: { 
                referralCode: { not: null },
                ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
            }
        })

        const rows: string[] = [
            'Campus,Total Ambassadors,Total Leads,Confirmed,Conversion Rate,Parents,Staff'
        ]

        for (const stat of campusStats) {
            const campus = stat.assignedCampus || 'Not Assigned'

            const [parents, staff, totalLeads, confirmed] = await Promise.all([
                prisma.user.count({ where: { referralCode: { not: null }, assignedCampus: stat.assignedCampus, role: 'Parent', ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear }) } }),
                prisma.user.count({ where: { referralCode: { not: null }, assignedCampus: stat.assignedCampus, role: 'Staff', ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear }) } }),
                prisma.referralLead.count({ where: { campus: stat.assignedCampus, ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear }) } }),
                prisma.referralLead.count({ where: { campus: stat.assignedCampus, leadStatus: { in: [_LeadStatus.Confirmed, _LeadStatus.Admitted] }, ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear }) } })
            ])

            const conversionRate = totalLeads > 0 ? ((confirmed / totalLeads) * 100).toFixed(1) : '0'
            rows.push(`"${campus}",${stat._count.userId},${totalLeads},${confirmed},${conversionRate}%,${parents},${staff}`)
        }

        return { success: true, csv: rows.join('\n'), filename: `campus-distribution-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Campus Distribution Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #7: BENEFIT TIER ANALYSIS =====================
export async function generateBenefitTierReport(filters?: { campus?: string, academicYear?: string }) {
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

        const rows: string[] = [
            'Benefit Tier,User Count,Avg Year Fee Benefit,Avg Long Term Benefit,Percentage'
        ]

        const baseWhere: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            baseWhere.assignedCampus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            baseWhere.academicYear = filters.academicYear
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

            rows.push(`${tier.name},${count},${avgYear}%,${avgLong}%,${percentage}%`)
        }

        return { success: true, csv: rows.join('\n'), filename: `benefit-tier-analysis-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Benefit Tier Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #8: NEW REGISTRATIONS =====================
export async function generateNewRegistrationsReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
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

        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const newUsers = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                createdAt: true,
                fullName: true,
                role: true,
                assignedCampus: true,
                mobileNumber: true,
                aadharNo: true,
                address: true,
                academicYear: true,
                confirmedReferralCount: true,
                benefitStatus: true,
                childEprNo: true,
                status: true,
                transactionId: true,
                paymentAmount: true
            },
            orderBy: { createdAt: 'desc' }
        })

        const rows: string[] = [
            'Registration Date,Ambassador Name,Role,Campus,Mobile,Aadhar No,Address,Academic Year,Referrals,Benefit Status,Child Code,Status,Transaction ID,Payment Amount'
        ]

        newUsers.forEach((user: any) => {
            rows.push(`${new Date(user.createdAt).toLocaleDateString()},"${user.fullName}",${user.role},"${user.assignedCampus || 'Not Assigned'}",="${user.mobileNumber}",="${user.aadharNo || ''}","${(user.address || '').replace(/"/g, '""')}","${user.academicYear || ''}",${user.confirmedReferralCount},${user.benefitStatus || 'Active'},"${user.childEprNo || ''}",${user.status},="${user.transactionId || ''}",${user.paymentAmount || 0}`)
        })

        return { success: true, csv: rows.join('\n'), filename: `new-registrations-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('New Registrations Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #9: STAFF VS PARENT COMPARISON =====================
export async function generateStaffVsParentReport(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const roles = [_UserRole.Parent, _UserRole.Staff]
        const rows: string[] = [
            'Role,Ambassadors,Leads,Confirmed,Conversion%,Avg Referrals'
        ]

        const baseWhere: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            baseWhere.assignedCampus = filters.campus
        }

        if (filters?.academicYear && filters.academicYear !== 'All') {
            baseWhere.academicYear = filters.academicYear
        }

        for (const role of roles) {
            const users = await prisma.user.findMany({
                where: { ...baseWhere, role },
                select: {
                    userId: true,
                    confirmedReferralCount: true,
                    referrals: {
                        select: {
                            leadId: true
                        }
                    }
                }
            })

            const totalAmbassadors = users.length
            const totalLeads = users.reduce((sum: number, u: any) => sum + u.referrals.length, 0)
            const totalConfirmed = users.reduce((sum: number, u: any) => sum + u.confirmedReferralCount, 0)
            const conversion = totalLeads > 0 ? ((totalConfirmed / totalLeads) * 100).toFixed(1) : '0'
            const avgReferrals = totalAmbassadors > 0 ? (totalLeads / totalAmbassadors).toFixed(1) : '0'

            rows.push(`${role},${totalAmbassadors},${totalLeads},${totalConfirmed},${conversion}%,${avgReferrals}`)
        }

        return { success: true, csv: rows.join('\n'), filename: `staff-vs-parent-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Staff vs Parent Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #10: LEAD STATUS PIPELINE =====================
export async function generateLeadPipelineReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const statuses = [_LeadStatus.New, _LeadStatus.Follow_up, _LeadStatus.Confirmed]
        const rows: string[] = [
            'Lead Status,Count,Percentage,Avg Days in Stage'
        ]

        const baseWhere: any = {}
        if (filters?.startDate || filters?.endDate) {
            baseWhere.createdAt = {}
            if (filters.startDate) baseWhere.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) baseWhere.createdAt.lte = new Date(filters.endDate)
        }
        if (filters?.campus && filters.campus !== 'All') {
            baseWhere.campus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            baseWhere.academicYear = filters.academicYear
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

            rows.push(`${status},${count},${percentage}%,${avgDays} days`)
        }

        return { success: true, csv: rows.join('\n'), filename: `lead-pipeline-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Lead Pipeline Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #11: STAR MILESTONE TRACKER =====================
export async function generateStarMilestoneReport(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const users = await prisma.user.findMany({
            where: {
                ...whereClause,
                confirmedReferralCount: { in: [0, 1, 2, 3, 4] }
            },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                assignedCampus: true,
                confirmedReferralCount: true
            },
            orderBy: { confirmedReferralCount: 'desc' }
        })

        const rows: string[] = [
            'Ambassador Name,Mobile,Campus,Current Stars,Confirmed,Needed for Next,Proximity%'
        ]

        users.forEach((user: any) => {
            const current = user.confirmedReferralCount
            const next = current + 1
            const needed = 1
            const proximity = Math.round((current / next) * 100)

            rows.push(`"${user.fullName}",${user.mobileNumber},"${user.assignedCampus || 'N/A'}",${current} Stars,${current},${needed},${proximity}%`)
        })

        return { success: true, csv: rows.join('\n'), filename: `star-milestones-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Star Milestone Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== DYNAMIC INSIGHTS: CONVERSION FUNNEL =====================
export async function generateConversionFunnelData(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
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
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
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
            ? (confirmedLeads.reduce((acc: number, lead: any) => {
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
export async function generateFinancialROIData(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                studentFee: true,
                yearFeeBenefitPercent: true,
                role: true,
                referrals: {
                    where: { leadStatus: _LeadStatus.Confirmed },
                    select: {
                        annualFee: true
                    }
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
            const confirmedReferrals = user.referrals
            if (confirmedReferrals.length > 0) {
                // Precision: Sum up actual annualFee from confirmed leads, or fallback to default
                const actualRevenue = confirmedReferrals.reduce((sum: number, r: any) => sum + (r.annualFee || 0), 0)
                const benefitPerYear = (user.studentFee || 0) * (user.yearFeeBenefitPercent / 100)

                totalRevenue += actualRevenue
                totalBenefitCost += benefitPerYear

                const role = user.role as string
                if (roleBreakdown[role]) {
                    roleBreakdown[role].revenue += actualRevenue
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
export async function generateTargetAchievementData(filters?: { campus?: string, academicYear?: string }) {
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

        const chartData = await Promise.all(campuses.map(async (c: any) => {
            const target = c.targets[0]?.admissionTarget || 10
            const actual = await prisma.referralLead.count({
                where: {
                    campus: c.campusName,
                    leadStatus: _LeadStatus.Confirmed,
                    confirmedDate: {
                        gte: new Date(currentYear, currentMonth - 1, 1),
                        lte: new Date(currentYear, currentMonth, 0)
                    },
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
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
export async function generateStarMilestonesData(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { referralCode: { not: null } }
        if (filters?.campus && filters.campus !== 'All') {
            whereClause.assignedCampus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                fullName: true,
                assignedCampus: true,
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
export async function generateAdmissionIntelligenceData(filters?: { campus?: string, academicYear?: string }) {
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

        const intelligenceData = await Promise.all(campuses.map(async (c: any) => {
            // 1. Calculate Velocity (Days to confirm) for this campus
            const confirmedLeads = await prisma.referralLead.findMany({
                where: {
                    campus: c.campusName,
                    leadStatus: _LeadStatus.Confirmed,
                    confirmedDate: { not: null },
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
                },
                select: { createdAt: true, confirmedDate: true },
                orderBy: { confirmedDate: 'desc' },
                take: 50 // Recent 50 conversions for rolling average
            })

            const velocity = confirmedLeads.length > 0
                ? (confirmedLeads.reduce((acc: number, lead: any) => {
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
export async function generateRetentionAnalyticsData(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const campusWhere: any = filters?.campus && filters.campus !== 'All'
            ? { assignedCampus: filters.campus }
            : {}

        const users = await prisma.user.findMany({
            where: { 
                isFiveStarMember: true, 
                ...campusWhere,
                ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
            },
            select: {
                userId: true,
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
            where: {
                ...(filters?.campus && filters.campus !== 'All' ? { campus: filters.campus } : {}),
                ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
            },
            select: { createdAt: true, leadStatus: true, confirmedDate: true }
        })

        const confirmedLeads = leads.filter((l: any) => l.leadStatus === 'Confirmed' && l.confirmedDate)
        const avgDaysToConfirm = confirmedLeads.length > 0
            ? (confirmedLeads.reduce((acc: number, lead: any) => {
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

// ===================== REPORT #12: SYSTEM AUDIT TRAIL =====================
export async function generateAuditTrailReport(filters?: { startDate?: string, endDate?: string, module?: string }) {
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
        if (filters?.module && filters.module !== 'All') {
            whereClause.module = filters.module
        }

        const logs = await prisma.activityLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
            // No limit — full export
        })

        // Enrich with actor names
        const adminIds = [...new Set(logs.map(l => l.adminId).filter(Boolean))] as number[]
        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as number[]

        const [admins, users] = await Promise.all([
            prisma.admin.findMany({ where: { adminId: { in: adminIds } }, select: { adminId: true, adminName: true, role: true } }),
            prisma.user.findMany({ where: { userId: { in: userIds } }, select: { userId: true, fullName: true, role: true } })
        ])

        const adminMap = Object.fromEntries(admins.map(a => [a.adminId, a]))
        const userMap = Object.fromEntries(users.map(u => [u.userId, u]))

        const rows: string[] = [
            'Timestamp,Actor Type,Actor ID,Actor Name,Actor Role,Action,Module,Target ID,Description,IP Address'
        ]

        logs.forEach((log: any) => {
            let actorType = 'System', actorId = '-', actorName = 'System', actorRole = '-'
            if (log.adminId && adminMap[log.adminId]) {
                actorType = 'Admin'; actorId = String(log.adminId)
                actorName = adminMap[log.adminId].adminName
                actorRole = adminMap[log.adminId].role
            } else if (log.userId && userMap[log.userId]) {
                actorType = 'Ambassador'; actorId = String(log.userId)
                actorName = userMap[log.userId].fullName
                actorRole = userMap[log.userId].role
            }
            rows.push(`${new Date(log.createdAt).toLocaleString()},${actorType},${actorId},"${actorName}","${actorRole}","${log.action}","${log.module}","${log.targetId || ''}","${(log.description || '').replace(/"/g, '""')}","${log.ipAddress || ''}"`)
        })

        return { success: true, csv: rows.join('\n'), filename: `audit-trail-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Audit Trail Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #16: WHATSAPP ACTIVITY LOG =====================
export async function generateWhatsAppLogReport(filters?: { startDate?: string, endDate?: string, status?: string }) {
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
        if (filters?.status && filters.status !== 'All') {
            whereClause.status = filters.status
        }

        const logs = await prisma.whatsAppLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        })

        const rows: string[] = [
            'Timestamp,Mobile,Template,Type,Status,Reference ID,Content (Preview)'
        ]

        logs.forEach((log: any) => {
            const preview = (log.content || '').replace(/"/g, '""').substring(0, 80)
            rows.push(`${new Date(log.createdAt).toLocaleString()},"${log.mobile}","${log.template || ''}","${log.type}","${log.status}","${log.refId || ''}","${preview}"`)
        })

        return { success: true, csv: rows.join('\n'), filename: `whatsapp-log-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('WhatsApp Log Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}


// ===================== REPORT #13: SETTLEMENT INTEGRITY =====================
export async function generateSettlementIntegrityReport(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const leadWhere: any = { leadStatus: _LeadStatus.Confirmed }
        if (filters?.campus && filters.campus !== 'All') {
            leadWhere.campus = filters.campus
        }
        if (filters?.academicYear && filters.academicYear !== 'All') {
            leadWhere.academicYear = filters.academicYear
        }

        const leads = await prisma.referralLead.findMany({
            where: leadWhere,
            include: {
                user: {
                    select: { fullName: true, mobileNumber: true, userId: true }
                }
            }
        })

        const settlements = await prisma.settlement.findMany({
            where: { status: 'Processed' }
        })

        const rows: string[] = [
            'Ambassador Name,Mobile,Lead Name,Confirmed Date,Status,Settlement Status'
        ]

        leads.forEach((lead: any) => {
            const hasSettlement = settlements.some((s: any) => s.userId === lead.userId)
            const settlementStatus = hasSettlement ? 'Settled' : 'Unsettled'
            rows.push(`"${lead.user.fullName}",${lead.user.mobileNumber},"${lead.parentName}",${new Date(lead.confirmedDate || lead.createdAt).toLocaleDateString()},${lead.leadStatus},${settlementStatus}`)
        })

        return { success: true, csv: rows.join('\n'), filename: `integrity-audit-${new Date().toISOString().split('T')[0]}.csv` }
    } catch (error) {
        console.error('Integrity Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #14: MASTER PIPELINE EXPORT =====================
export async function generateMasterPipelineExport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
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
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const leads = await prisma.referralLead.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { fullName: true, mobileNumber: true, referralCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const rows: string[] = [
            'Lead ID,Created Date,Lead Name,Parent Mobile,Campus,Grade,Status,Referred By,Ambassador Mobile,Referral Code,Confirmed Date,Annual Fee,Admission Fee,Donation Fee,Rejection Reason'
        ]

        leads.forEach((lead: any) => {
            const row = [
                lead.leadId,
                new Date(lead.createdAt).toLocaleDateString(),
                `"${(lead.parentName || '').replace(/"/g, '""')}"`,
                `"${lead.parentMobile || ''}"`,
                `"${(lead.campus || 'Not Specified').replace(/"/g, '""')}"`,
                `"${(lead.gradeInterested || 'N/A').replace(/"/g, '""')}"`,
                lead.leadStatus,
                `"${(lead.user?.fullName || 'N/A').replace(/"/g, '""')}"`,
                `"${lead.user?.mobileNumber || ''}"`,
                `"${lead.user?.referralCode || ''}"`,
                lead.confirmedDate ? new Date(lead.confirmedDate).toLocaleDateString() : '-',
                lead.annualFee || 0,
                lead.admissionFeeCollected || 0,
                lead.donationFeeCollected || 0,
                `"${(lead.rejectionReason || '').replace(/"/g, '""')}"`
            ]
            rows.push(row.join(','))
        })

        return {
            success: true,
            csv: rows.join('\n'),
            filename: `master-pipeline-export-${new Date().toISOString().split('T')[0]}.csv`
        }
    } catch (error) {
        console.error('Master Pipeline Export Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #15: MASTER REFERRAL REPORT (AMBASSADORS + LEADS) =====================
export async function generateMasterReferralReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
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
        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        const leads = await prisma.referralLead.findMany({
            where: whereClause,
            include: {
                user: true
            },
            orderBy: { createdAt: 'desc' }
        })

        const headers = [
            'Lead ID', 'Lead Name', 'Lead Mobile', 'Lead Campus', 'Lead Grade', 'Lead Status', 'Lead Created Date', 'Lead Confirmed Date',
            'Annual Fee', 'Admission Fee Collected', 'Donation Fee Collected',
            'Ambassador ID', 'Ambassador Name', 'Ambassador Mobile', 'Ambassador Role', 'Ambassador Campus', 'Ambassador Referral Code', 'Ambassador Aadhar', 'Ambassador Address', 'Ambassador Academic Year', 'Ambassador Joined Date'
        ]

        const rows: string[] = [headers.join(',')]

        leads.forEach((lead: any) => {
            const row = [
                lead.leadId,
                `"${(lead.parentName || '').replace(/"/g, '""')}"`,
                `"${lead.parentMobile || ''}"`,
                `"${(lead.campus || 'N/A').replace(/"/g, '""')}"`,
                `"${(lead.gradeInterested || 'N/A').replace(/"/g, '""')}"`,
                lead.leadStatus,
                new Date(lead.createdAt).toLocaleDateString(),
                lead.confirmedDate ? new Date(lead.confirmedDate).toLocaleDateString() : '-',
                lead.annualFee || 0,
                lead.admissionFeeCollected || 0,
                lead.donationFeeCollected || 0,
                lead.user?.userId || 'N/A',
                `"${(lead.user?.fullName || 'N/A').replace(/"/g, '""')}"`,
                `"${lead.user?.mobileNumber || ''}"`,
                `"${lead.user?.role || ''}"`,
                `"${(lead.user?.assignedCampus || 'Global').replace(/"/g, '""')}"`,
                `"${lead.user?.referralCode || ''}"`,
                `="${lead.user?.aadharNo || ''}"`,
                `"${(lead.user?.address || '').replace(/"/g, '""')}"`,
                `"${lead.user?.academicYear || ''}"`,
                lead.user?.createdAt ? new Date(lead.user.createdAt).toLocaleDateString() : '-'
            ]
            rows.push(row.join(','))
        })


        return {
            success: true,
            csv: rows.join('\n'),
            filename: `master-referral-report-${new Date().toISOString().split('T')[0]}.csv`
        }
    } catch (error) {
        console.error('Master Referral Report Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #16: DAILY REFERRAL VISUAL REPORT =====================
/**
 * Generates aggregated data for the Daily Referral Summary Dashboard.
 * Filters:
 * - targetDate: The "snapshot" date for both cumulative (as of) and daily (on that day) metrics.
 * - campus: Optional specific campus filter.
 * - academicYear: Optional specific academic year filter.
 */
export async function getDailyReferralReport(filters?: { targetDate?: string, campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    const canAccess = await hasPermission('reports')
    if (!admin || !canAccess) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const targetDate = filters?.targetDate || new Date().toISOString().split('T')[0]
        const dateObj = new Date(targetDate)
        const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0)
        const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59)

        // 1. Fetch All Active Campuses (or just the selected one)
        const campusWhere: any = { isActive: true }
        if (filters?.campus && filters.campus !== 'All') {
            campusWhere.campusName = filters.campus
        }

        const campuses = await prisma.campus.findMany({
            where: campusWhere,
            orderBy: { campusName: 'asc' }
        })

        // SORTING: Schools at top, Colleges (AASC, ACET, ACCHM) at bottom
        const colleges = ['AASC', 'ACET', 'ACCHM']
        campuses.sort((a, b) => {
            const aIsCollege = colleges.includes(a.campusName)
            const bIsCollege = colleges.includes(b.campusName)
            if (aIsCollege && !bIsCollege) return 1
            if (!aIsCollege && bIsCollege) return -1
            return a.campusName.localeCompare(b.campusName)
        })

        const reportRows = await Promise.all(campuses.map(async (campus, index) => {
            // ... (rest of individual row fetching logic remains the same)
            const campusName = campus.campusName

            // COMMON WHERE CLAUSE
            const baseWhere: any = { campus: campusName }
            if (filters?.academicYear && filters.academicYear !== 'All') {
                baseWhere.academicYear = filters.academicYear
            }

            // CUMULATIVE STATS (As of the selected targetDate)
            const cumulativeTotal = await prisma.referralLead.count({
                where: { 
                    ...baseWhere,
                    createdAt: { lte: dayEnd } 
                }
            })
            
            const cumulativeAdmitted = await prisma.referralLead.count({
                where: { 
                    ...baseWhere,
                    leadStatus: { in: [_LeadStatus.Confirmed, _LeadStatus.Admitted] },
                    createdAt: { lte: dayEnd }
                }
            })

            // DAILY STATS (For selected targetDate)
            const dailyNew = await prisma.referralLead.count({
                where: { 
                    ...baseWhere,
                    createdAt: { gte: dayStart, lte: dayEnd }
                }
            })

            // Admitted Today: We check Students created today who have a referral link
            const studentWhere: any = {
                referralLead: { campus: campusName },
                createdAt: { gte: dayStart, lte: dayEnd }
            }
            if (filters?.academicYear && filters.academicYear !== 'All') {
                studentWhere.academicYear = filters.academicYear
            }

            const dailyAdmitted = await prisma.student.count({
                where: studentWhere
            })

            // TOTAL POTENTIAL (Ambassadors registered * 5)
            const ambassadorCount = await prisma.user.count({
                where: {
                    assignedCampus: campusName,
                    referralCode: { not: null },
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
                }
            })
            const potential = ambassadorCount * 5
            const achievement = potential > 0 ? (cumulativeTotal / potential) * 100 : 0
            const conversion = cumulativeTotal > 0 ? (cumulativeAdmitted / cumulativeTotal) * 100 : 0

            return {
                slNo: index + 1,
                campusName,
                potential,
                achievement,
                conversion,
                cumulative: {
                    total: cumulativeTotal,
                    admitted: cumulativeAdmitted
                },
                daily: {
                    new: dailyNew,
                    admitted: dailyAdmitted,
                    total: dailyNew // Daily Total = New leads submitted on that day
                }
            }
        }))

        // SEPARATE SCHOOLS AND COLLEGES
        const schoolRows = reportRows.filter(r => !colleges.includes(r.campusName))
        const collegeRows = reportRows.filter(r => colleges.includes(r.campusName))

        function calculateGroupTotals(rows: any[]) {
            const totals = {
                potential: rows.reduce((sum, r) => sum + r.potential, 0),
                achievement: 0,
                conversion: 0,
                cumulative: {
                    total: rows.reduce((sum, r) => sum + r.cumulative.total, 0),
                    admitted: rows.reduce((sum, r) => sum + r.cumulative.admitted, 0)
                },
                daily: {
                    new: rows.reduce((sum, r) => sum + r.daily.new, 0),
                    admitted: rows.reduce((sum, r) => sum + r.daily.admitted, 0),
                    total: rows.reduce((sum, r) => sum + r.daily.total, 0)
                }
            }
            totals.achievement = totals.potential > 0 ? (totals.cumulative.total / totals.potential) * 100 : 0
            totals.conversion = totals.cumulative.total > 0 ? (totals.cumulative.admitted / totals.cumulative.total) * 100 : 0
            return totals
        }

        const schoolSubtotal = calculateGroupTotals(schoolRows)
        const collegeSubtotal = calculateGroupTotals(collegeRows)
        const grandTotals = calculateGroupTotals(reportRows)

        return { 
            success: true, 
            data: {
                schoolRows,
                schoolSubtotal,
                collegeRows,
                collegeSubtotal,
                grandTotals,
                targetDate
            }
        }
    } catch (error) {
        console.error('Daily Referral Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #17: APP USER STATUS (SUMMARY) =====================
export async function generateAppReferralStatusReport(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const campusWhereBase: any = { isActive: true }
        if (filters?.campus && filters.campus !== 'All') {
            campusWhereBase.campusName = filters.campus
        }

        const campuses = await prisma.campus.findMany({
            where: campusWhereBase,
            orderBy: { campusName: 'asc' }
        })

        const headers = [
            'Sl No.', 'Campus Name', 'Staff Count', 'Parent Count', 'Both Potential Referral (x5)',
            'Staff Active', 'Staff Inactive/Pending status',
            'Parent Active', 'Parent Inactive/Pending status'
        ]

        const rows: string[] = [headers.join(',')]
        const totals = {
            staffCount: 0, parentCount: 0, potential: 0,
            sActive: 0, sInactivePending: 0,
            pActive: 0, pInactivePending: 0
        }

        for (const [index, campus] of campuses.entries()) {
            const campusName = campus.campusName

            // Counts for Staff
            const staffStats = await prisma.user.groupBy({
                by: ['status'],
                where: { 
                    assignedCampus: campusName, 
                    role: 'Staff',
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
                },
                _count: { userId: true }
            })

            // Counts for Parent
            const parentStats = await prisma.user.groupBy({
                by: ['status'],
                where: { 
                    assignedCampus: campusName, 
                    role: 'Parent',
                    ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
                },
                _count: { userId: true }
            })

            const extract = (stats: any[]) => {
                let total = 0, active = 0, inactivePending = 0
                stats.forEach(s => {
                    total += s._count.userId
                    if (s.status === 'Active') {
                        active += s._count.userId
                    } else {
                        // All other statuses (Pending, Inactive, PendingVerification, Suspended)
                        inactivePending += s._count.userId
                    }
                })
                return { total, active, inactivePending }
            }

            const s = extract(staffStats)
            const p = extract(parentStats)
            const potential = (s.total + p.total) * 5

            rows.push([
                index + 1,
                `"${campusName}"`,
                s.total,
                p.total,
                potential,
                s.active,
                s.inactivePending,
                p.active,
                p.inactivePending
            ].join(','))

            // Update Totals
            totals.staffCount += s.total; totals.parentCount += p.total; totals.potential += potential
            totals.sActive += s.active; totals.sInactivePending += s.inactivePending
            totals.pActive += p.active; totals.pInactivePending += p.inactivePending
        }

        // Add Grand Total row
        rows.push([
            'Grand Total', '', totals.staffCount, totals.parentCount, totals.potential,
            totals.sActive, totals.sInactivePending,
            totals.pActive, totals.pInactivePending
        ].join(','))

        return { 
            success: true, 
            csv: rows.join('\n'), 
            filename: `app-user-status-${new Date().toISOString().split('T')[0]}.csv` 
        }

    } catch (error) {
        console.error('APP User Status Report Error:', error)
        return { success: false, error: 'Failed' }
    }
}

// ===================== REPORT #18: AMBASSADOR MASTER REGISTRY =====================
export async function generateAmbassadorMasterRegistry(filters?: { campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Super Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = { 
            referralCode: { not: null },
            ...(filters?.campus && filters.campus !== 'All' && { assignedCampus: filters.campus }),
            ...(filters?.academicYear && filters.academicYear !== 'All' && { academicYear: filters.academicYear })
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                fullName: true,
                role: true,
                assignedCampus: true,
                mobileNumber: true,
                createdAt: true,
                status: true,
                confirmedReferralCount: true,
                academicYear: true
            },
            orderBy: [
                { assignedCampus: 'asc' },
                { fullName: 'asc' }
            ]
        })

        const headers = [
            'Sl No.', 'Ambassador Name', 'Role', 'Campus', 'Mobile', 
            'Registration Date', 'Account Status', 'Confirmed Referrals', 'Academic Year'
        ]

        const rows: string[] = [headers.join(',')]

        users.forEach((u, index) => {
            rows.push([
                index + 1,
                `"${u.fullName}"`,
                u.role,
                `"${u.assignedCampus || 'Not Assigned'}"`,
                `="${u.mobileNumber}"`,
                new Date(u.createdAt).toLocaleDateString('en-GB'),
                u.status,
                u.confirmedReferralCount,
                u.academicYear || 'N/A'
            ].join(','))
        })

        return { 
            success: true, 
            csv: rows.join('\n'), 
            filename: `ambassador-master-registry-${new Date().toISOString().split('T')[0]}.csv` 
        }

    } catch (error) {
        console.error('Ambassador Master Registry Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}

// ===================== REPORT #17: REFERRAL STUDENT DETAILS =====================
export async function generateReferralStudentDetailsReport(filters?: { startDate?: string, endDate?: string, campus?: string, academicYear?: string }) {
    const admin = await getCurrentUser()
    const canAccess = await hasPermission('reports')
    if (!admin || !canAccess) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const whereClause: any = {
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        }

        // Apply Date Filters
        if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {}
            if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate)
            if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate)
        }

        // Apply Campus Filter & Scoping
        const scope = await getPermissionScope('reports')
        const isSuperAdmin = admin.role === 'Super Admin'

        if (!isSuperAdmin && scope === 'campus' && admin.assignedCampus) {
            whereClause.campus = admin.assignedCampus
        } else if (filters?.campus && filters.campus !== 'All') {
            whereClause.campus = filters.campus
        }

        if (filters?.academicYear && filters.academicYear !== 'All') {
            whereClause.academicYear = filters.academicYear
        }

        // FIX (AUDIT): Instead of raw prisma fetch, use the enriched financial engine
        let resolvedCampusId: number | undefined = undefined
        if (whereClause.campus) {
            const c = await prisma.campus.findFirst({ where: { campusName: whereClause.campus } })
            if (c) resolvedCampusId = c.id
        }

        const financeRes = await getAccruedPayoutLiabilitiesInternal(
            admin,
            filters?.academicYear || 'All',
            undefined, // search
            resolvedCampusId,
            1,
            50000 // SAFETY: High limit to get all records for export
        )

        if (!financeRes.success || !financeRes.data) {
            throw new Error(financeRes.error || 'Failed to fetch accurate financial data')
        }

        // Flatten ambassadors -> referrals
        const enrichedReferrals = financeRes.data.flatMap((amb: any) => amb.referrals)

        // Apply secondary filtering (Date ranges)
        const finalReferrals = enrichedReferrals.filter((ref: any) => {
            const refDate = ref.confirmedDate ? new Date(ref.confirmedDate) : new Date(ref.createdAt)
            
            if (filters?.startDate) {
                const start = new Date(filters.startDate)
                if (refDate < start) return false
            }
            if (filters?.endDate) {
                const end = new Date(filters.endDate)
                // Set to end of day for inclusive filtering
                end.setHours(23, 59, 59, 999)
                if (refDate > end) return false
            }
            return true
        })

        const csv = generateReferralStudentDetailsCSV(finalReferrals)

        return { 
            success: true, 
            csv, 
            filename: `referral-student-details-${new Date().toISOString().split('T')[0]}.csv` 
        }
    } catch (error) {
        console.error('Referral Student Details Report Error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}



