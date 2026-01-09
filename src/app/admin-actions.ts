'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { getScopeFilter, canEdit, hasPermission } from '@/lib/permission-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { mapLeadStatus, mapUserRole, mapAccountStatus } from '@/lib/enum-utils'
import { notifyReferralConfirmed, notifyFiveStarAchievement, notifyReferralStatusChanged } from '@/lib/notification-helper'
import { AdminAnalytics } from '@/types'

/**
 * Fetches all referral leads with ambassador information.
 * Requires Admin privileges. Respects permission scope settings.
 * 
 * @returns Object containing success status and array of referrals
 */
export async function getAllReferrals() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    // Get scope filter based on permission settings
    const { filter, isReadOnly } = await getScopeFilter('referralTracking', {
        campusField: 'campus',
        useCampusName: true
    })

    if (filter === null) return { success: false, error: 'No access to referral data' }

    const referrals = await prisma.referralLead.findMany({
        where: filter,
        include: { user: true, student: true },
        orderBy: { createdAt: 'desc' }
    })
    return { success: true, referrals, isReadOnly }
}

/**
 * Generates comprehensive analytics for the admin dashboard.
 * Includes lead counts, conversion rates, campus distribution, and top performers.
 * 
 * @returns Object containing detailed metrics and success status
 */
export async function getAdminAnalytics(): Promise<{ success: boolean; error?: string } & Partial<AdminAnalytics>> {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    // Check if user has access to analytics module
    if (!await hasPermission('analytics')) {
        return { success: false, error: 'Access Denied to Analytics' }
    }

    // Get scope filter based on permission settings
    const { filter: referralFilter } = await getScopeFilter('referralTracking', {
        campusField: 'campus',
        useCampusName: true
    })

    const { filter: userFilter } = await getScopeFilter('userManagement', {
        campusField: 'assignedCampus',
        useCampusName: true
    })

    if (referralFilter === null || userFilter === null) return { success: false, error: 'Access Denied' }

    const referrals = await prisma.referralLead.findMany({
        where: referralFilter,
        include: { user: true }
    })

    const users = await prisma.user.findMany({
        where: userFilter
    })

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

    // Strict Permission Check
    if (!await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied: You do not have confirm rights' }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Lead
            const lead = await tx.referralLead.update({
                where: { leadId },
                include: { user: true },
                data: {
                    leadStatus: 'Confirmed',
                    confirmedDate: new Date()
                }
            })

            // 2. Update User Counts & Benefits (Automation)
            const userId = lead.userId

            // Count confirmed referrals for the CURRENT academic year
            // Note: In a production system, we'd filter by academicYear field
            const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

            const currentYearCount = await tx.referralLead.count({
                where: {
                    userId,
                    leadStatus: 'Confirmed',
                    confirmedDate: { gte: currentYearStart }
                }
            })

            // Count LIFETIME confirmed referrals
            const count = await tx.referralLead.count({
                where: {
                    userId,
                    leadStatus: 'Confirmed'
                }
            })

            // Determine Benefit % based on the 5-Star system logic (1.5)
            // TRACK 1: New Referrals This Year (Reset annually)
            // 1: 5%, 2: 10%, 3: 25%, 4: 30%, 5: 50%
            const shortTermSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 };
            const lookupCount = Math.min(currentYearCount, 5); // Use currentYearCount, NOT lifetime count
            let yearFeeBenefit = shortTermSlabs[lookupCount] || 0;

            // Long Term Benefit Logic (Track 2 - For Returning 5-Star Members)
            // Prereq: Must be Five Star Member (achieved 5+ referrals in PREVIOUS years)
            // Activation: Must have at least 1 NEW referral this year to unlock
            let longTermTotal = 0;
            const user = await tx.user.findUnique({ where: { userId } });

            if (user?.isFiveStarMember) { // Check eligibility first
                // DATE-BASED CUMULATIVE CALCULATION
                // We must distinguish between "Prior Years History" and "Current Year Activity"

                // 1. Current Year Activity (Boost: 5%)
                // Already calculated as currentYearCount

                // 2. Count referrals from PRIOR years (Base: 3%)
                // Total 'count' includes current, so subtract current to get prior
                const priorYearCount = count - currentYearCount;

                // 3. Apply Formula ONLY if active this year
                if (currentYearCount >= 1) {
                    const cumulativeBase = priorYearCount * 3;
                    const currentYearBoost = currentYearCount * 5;
                    longTermTotal = cumulativeBase + currentYearBoost;

                    // System picks the higher of: short-term slab OR cumulative long-term
                    if (longTermTotal > yearFeeBenefit) {
                        yearFeeBenefit = longTermTotal;
                    }
                }
            }

            // Update User
            await tx.user.update({
                where: { userId },
                data: {
                    confirmedReferralCount: count,
                    yearFeeBenefitPercent: yearFeeBenefit,
                    longTermBenefitPercent: longTermTotal,
                    benefitStatus: count >= 1 ? 'Active' : 'Inactive', // Basic active check
                    // Qualify for Five Star status if they hit 5 referrals this year OR already have it
                    // Sticky flag: once 5-star, always 5-star
                    isFiveStarMember: user?.isFiveStarMember || count >= 5,
                    lastActiveYear: new Date().getFullYear()
                }
            })

            return { leadId, userId, parentName: lead.parentName, currentYearCount, wasFiveStar: user?.isFiveStarMember || false, justAchieved5Star: !user?.isFiveStarMember && count >= 5 }
        })

        // --- Send In-App Notifications ---
        try {
            // Notify ambassador about confirmed referral
            await notifyReferralConfirmed(result.userId, {
                parentName: result.parentName,
                leadId: result.leadId
            }, result.currentYearCount)

            // Special celebration if they just achieved 5-Star status!
            if (result.justAchieved5Star) {
                const ambassador = await prisma.user.findUnique({
                    where: { userId: result.userId },
                    select: { fullName: true }
                })

                await notifyFiveStarAchievement(result.userId, ambassador?.fullName || 'Ambassador')
            }
        } catch (notifError) {
            console.error('Notification error:', notifError)
            // Don't fail the confirmation if notification fails
        }

        revalidatePath('/admin')
        revalidatePath('/dashboard')
        revalidatePath('/referrals')

        // Log the action (1.5)
        await logAction('UPDATE', 'referral', `Confirmed referral lead: ${result.leadId}`, result.leadId.toString(), null, { userId: result.userId })

        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Failed' }
    }
}

/**
 * Fetches all users (ambassadors/parents/staff) for the admin dashboard.
 * Respects permission scope settings from the matrix.
 * @returns Object containing success status and array of user records.
 */
export async function getAdminUsers() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    // Get scope filter based on permission settings
    const { filter, isReadOnly } = await getScopeFilter('userManagement', {
        campusField: 'assignedCampus',
        useCampusName: true
    })

    if (filter === null) return { success: false, error: 'No access to user data' }

    try {
        const users = await prisma.user.findMany({
            where: filter,
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
 * Respects permission scope settings from the matrix.
 * @returns Object containing success status and array of student records.
 */
export async function getAdminStudents() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    // Get scope filter based on permission settings
    const { filter, isReadOnly } = await getScopeFilter('studentManagement', {
        campusField: 'campusId',
        useCampusName: false
    })

    if (filter === null) return { success: false, error: 'No access to student data' }

    try {
        const students = await prisma.student.findMany({
            where: filter,
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

    // Get scope filter based on permission settings
    const { filter, isReadOnly } = await getScopeFilter('adminManagement', {
        campusField: 'assignedCampus',
        useCampusName: true
    })

    if (filter === null) return { success: false, error: 'Access Denied' }

    try {
        const admins = await prisma.admin.findMany({
            where: filter,
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

    // Check module permission
    if (!await hasPermission('campusPerformance')) {
        return { success: false, error: 'Access Denied to Campus Management' }
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
                where: { campus, leadStatus: { in: ['New', 'Follow_up'] } }
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
        return { success: false, error: 'Failed to fetch campus management' }
    }
}
