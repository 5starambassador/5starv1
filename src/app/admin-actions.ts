'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'

/**
 * Fetches all referral leads with ambassador information.
 * Requires Admin privileges.
 * 
 * @returns Object containing success status and array of referrals
 */
export async function getAllReferrals() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    const referrals = await prisma.referralLead.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' }
    })
    return { success: true, referrals }
}

/**
 * Generates comprehensive analytics for the admin dashboard.
 * Includes lead counts, conversion rates, campus distribution, and top performers.
 * 
 * @returns Object containing detailed metrics and success status
 */
export async function getAdminAnalytics() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    const referrals = await prisma.referralLead.findMany({
        include: { user: true }
    })

    const users = await prisma.user.findMany()

    // Basic counts
    const totalLeads = referrals.length
    const confirmedLeads = referrals.filter(r => r.leadStatus === 'Confirmed').length
    const pendingLeads = totalLeads - confirmedLeads
    const conversionRate = totalLeads > 0 ? ((confirmedLeads / totalLeads) * 100).toFixed(1) : '0'

    // Ambassadors
    const totalAmbassadors = users.filter(u => u.role === 'Parent' || u.role === 'Staff').length
    const avgReferralsPerAmbassador = totalAmbassadors > 0 ? (totalLeads / totalAmbassadors).toFixed(1) : '0'

    // Total estimated savings/incentives
    const totalEstimatedValue = referrals.reduce((sum, r) => {
        const fee = r.user.studentFee || 60000
        const percent = r.user.yearFeeBenefitPercent || 0
        return sum + (fee * percent / 100)
    }, 0)

    // Campus distribution
    const campusMap: Record<string, number> = {}
    referrals.forEach(r => {
        const campus = r.campus || 'Unknown'
        campusMap[campus] = (campusMap[campus] || 0) + 1
    })
    const campusDistribution = Object.entries(campusMap).map(([campus, count]) => ({
        campus,
        count,
        percentage: ((count / totalLeads) * 100).toFixed(1)
    }))

    // Role breakdown
    const parentReferrals = referrals.filter(r => r.user.role === 'Parent').length
    const staffReferrals = referrals.filter(r => r.user.role === 'Staff').length
    const roleBreakdown = {
        parent: { count: parentReferrals, percentage: totalLeads > 0 ? ((parentReferrals / totalLeads) * 100).toFixed(1) : '0' },
        staff: { count: staffReferrals, percentage: totalLeads > 0 ? ((staffReferrals / totalLeads) * 100).toFixed(1) : '0' }
    }

    // Status breakdown
    const statusMap: Record<string, number> = {}
    referrals.forEach(r => {
        const status = r.leadStatus || 'New'
        statusMap[status] = (statusMap[status] || 0) + 1
    })
    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
        percentage: ((count / totalLeads) * 100).toFixed(1)
    }))

    // Top performers
    const userReferralCounts: Record<number, { user: { fullName: string; role: string; referralCode: string }, count: number }> = {}
    referrals.forEach(r => {
        if (!userReferralCounts[r.userId]) {
            userReferralCounts[r.userId] = { user: r.user, count: 0 }
        }
        userReferralCounts[r.userId].count++
    })

    const topPerformers = Object.values(userReferralCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => ({
            name: item.user.fullName,
            role: item.user.role,
            referralCode: item.user.referralCode,
            count: item.count
        }))

    return {
        success: true,
        totalLeads,
        confirmedLeads,
        pendingLeads,
        conversionRate,
        totalAmbassadors,
        avgReferralsPerAmbassador,
        totalEstimatedValue,
        campusDistribution,
        roleBreakdown,
        statusBreakdown,
        topPerformers
    }
}

/**
 * Confirms a referral lead and calculates benefits for the ambassador.
 * Triggers revalidation of administrative and user dashboards.
 * @param leadId - The ID of the referral lead to confirm.
 * @returns An object indicating success or failure.
 */
export async function confirmReferral(leadId: number) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Update Lead
        const lead = await prisma.referralLead.update({
            where: { leadId },
            data: {
                leadStatus: 'Confirmed',
                confirmedDate: new Date()
            }
        })

        // 2. Update User Counts & Benefits (Automation)
        const userId = lead.userId

        // Count confirmed referrals
        const count = await prisma.referralLead.count({
            where: {
                userId,
                leadStatus: 'Confirmed'
            }
        })

        // Determine Benefit % based on Flyer Logic
        const lookupCount = Math.min(count, 5) // Cap at 5 for slab lookup

        // Slabs (Fetch from DB with fallback)
        const slab = await prisma.benefitSlab.findFirst({
            where: { referralCount: lookupCount }
        })

        // Fallback defaults if DB is empty
        const defaultSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 };
        const yearFeeBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0);

        // Long Term Benefit Logic
        // Prereq: Must be Five Star Member (5 referrals in previous year)
        // AND Must have at least 1 referral this year
        let longTermTotal = 0;
        const user = await prisma.user.findUnique({ where: { userId } });

        if (user?.isFiveStarMember && count >= 1) {
            // Base 15% + (5% per referral) OR use DB Logic if available
            // 1->20, 2->25...
            const slabExtra = slab ? slab.longTermExtraPercent : 5; // Default 5% extra per referral
            const baseLongTerm = slab ? slab.baseLongTermPercent : 15; // Default base 15%
            longTermTotal = baseLongTerm + (count * slabExtra);
        }

        // Update User
        await prisma.user.update({
            where: { userId },
            data: {
                confirmedReferralCount: count,
                yearFeeBenefitPercent: yearFeeBenefit,
                longTermBenefitPercent: longTermTotal,
                benefitStatus: count >= 1 ? 'Active' : 'Inactive',
                lastActiveYear: 2025
            }
        })

        revalidatePath('/admin')
        revalidatePath('/dashboard')
        revalidatePath('/referrals')

        // Log the action (1.5)
        await logAction('UPDATE', 'referral', `Confirmed referral lead: ${leadId}`, leadId.toString(), { userId })

        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Failed' }
    }
}

/**
 * Fetches all users (ambassadors/parents/staff) for the admin dashboard.
 * If the current user is a Campus Head, results are filtered to their campus.
 * @returns Object containing success status and array of user records.
 */
export async function getAdminUsers() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    const where: any = {}
    if (user.role !== 'Super Admin' && user.assignedCampus) {
        where.assignedCampus = user.assignedCampus
    }

    try {
        const users = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                role: true,
                assignedCampus: true,
                status: true,
                confirmedReferralCount: true,
                createdAt: true
            }
        })
        return { success: true, users }
    } catch (error) {
        console.error('getAdminUsers error:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

/**
 * Fetches all student records for the admin dashboard.
 * Filters by assigned campus for non-Super Admins.
 * @returns Object containing success status and array of student records.
 */
export async function getAdminStudents() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    const where: any = {}
    if (user.role !== 'Super Admin' && user.assignedCampus) {
        where.campus = { campusName: user.assignedCampus }
    }

    try {
        const students = await prisma.student.findMany({
            where,
            include: {
                parent: { select: { fullName: true, mobileNumber: true } },
                campus: { select: { campusName: true } },
                ambassador: { select: { fullName: true, mobileNumber: true, role: true, referralCode: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, students }
    } catch (error) {
        console.error('getAdminStudents error:', error)
        return { success: false, error: 'Failed to fetch students' }
    }
}

export async function getAdminAdmins() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('CampusHead') && !user.role.includes('Admin'))) {
        return { success: false, error: 'Unauthorized' }
    }

    const where: any = {}

    // Campus Head can only see admins in their campus (except themselves usually, but let's list all for now)
    if (user.role !== 'Super Admin' && user.assignedCampus) {
        where.assignedCampus = user.assignedCampus
    }

    try {
        const admins = await prisma.admin.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                adminId: true,
                adminName: true,
                adminMobile: true,
                role: true,
                assignedCampus: true,
                status: true,
                createdAt: true
            }
        })
        return { success: true, admins }
    } catch (error) {
        console.error('getAdminAdmins error:', error)
        return { success: false, error: 'Failed to fetch admins' }
    }
}

/**
 * Calculates performance comparison data across campuses for the admin view.
 * @returns Object containing success status and performance comparison metrics.
 */
export async function getAdminCampusPerformance() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('CampusHead') && !user.role.includes('Admin'))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        let campusNames: string[] = []

        if (user.assignedCampus) {
            campusNames = [user.assignedCampus]
        } else {
            // Get all campuses from referrals if global admin
            const distinctCampuses = await prisma.referralLead.findMany({
                where: { campus: { not: null } },
                select: { campus: true },
                distinct: ['campus']
            })
            campusNames = distinctCampuses.map(c => c.campus).filter(Boolean) as string[]
        }

        const comparison = []

        for (const campus of campusNames) {
            const totalLeads = await prisma.referralLead.count({
                where: { campus }
            })

            const confirmed = await prisma.referralLead.count({
                where: { campus, leadStatus: 'Confirmed' }
            })

            const pending = await prisma.referralLead.count({
                where: { campus, leadStatus: { in: ['New', 'Follow-up'] } }
            })

            const conversionRate = totalLeads > 0
                ? (confirmed / totalLeads) * 100
                : 0

            // Count unique ambassadors for this campus
            const ambassadorIds = await prisma.referralLead.findMany({
                where: { campus },
                select: { userId: true },
                distinct: ['userId']
            })

            comparison.push({
                campus,
                totalLeads,
                confirmed,
                pending,
                conversionRate: Number(conversionRate.toFixed(2)),
                ambassadors: ambassadorIds.length
            })
        }

        // Sort by total leads descending
        comparison.sort((a, b) => b.totalLeads - a.totalLeads)

        return { success: true, campusPerformance: comparison }

    } catch (error) {
        console.error('getAdminCampusPerformance error:', error)
        return { success: false, error: 'Failed to fetch campus performance' }
    }
}
