'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { getScopeFilter, canEdit, canDelete, hasPermission } from '@/lib/permission-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { mapLeadStatus, mapUserRole, mapAccountStatus } from '@/lib/enum-utils'
import { notifyReferralConfirmed, notifyFiveStarAchievement, notifyReferralStatusChanged } from '@/lib/notification-helper'
import { AdminAnalytics } from '@/types'
import { buildReferralWhereClause } from '@/lib/filter-utils'

/**
 * Fetches all referral leads with ambassador information.
 * Requires Admin privileges. Respects permission scope settings.
 * 
 * @returns Object containing success status and array of referrals
 */
/**
 * Fetches paginated and filtered referral leads.
 * 
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @param filters - Filter criteria
 * @param sort - Sorting configuration
 */
export async function getAllReferrals(
    page: number = 1,
    limit: number = 50,
    filters?: {
        status?: string
        role?: string
        campus?: string
        search?: string
        feeType?: string
        dateRange?: { from: string; to: string } // ISO strings
    },
    sort?: { field: string; order: 'asc' | 'desc' }
) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    const { filter: scopeFilter, isReadOnly } = await getScopeFilter('referralTracking', {
        campusField: 'campus',
        useCampusName: true
    })

    if (scopeFilter === null) return { success: false, error: 'No access to referral data' }

    // Build Dynamic Where Clause (Refactored)
    const where = buildReferralWhereClause(filters, scopeFilter)

    // Build Order By
    let orderBy: any = { createdAt: 'desc' }
    if (sort) {
        if (sort.field === 'parentName') orderBy = { parentName: sort.order }
        else if (sort.field === 'campus') orderBy = { campus: sort.order }
        else if (sort.field === 'status') orderBy = { leadStatus: sort.order }
        else if (sort.field === 'date') orderBy = { createdAt: sort.order }
    }

    try {
        // Run Count and Find in Parallel
        const [total, referrals] = await Promise.all([
            prisma.referralLead.count({ where }),
            prisma.referralLead.findMany({
                where,
                include: { user: true, student: true },
                orderBy,
                skip: (page - 1) * limit,
                take: limit
            })
        ])

        return {
            success: true,
            referrals,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            isReadOnly
        }
    } catch (error: any) {
        console.error('getAllReferrals error:', error)
        return { success: false, error: error.message || 'Failed to fetch referrals' }
    }
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

    try {
        const [
            totalLeads,
            confirmedLeads,
            statusCounts,
            campusCounts,
            roleCounts,
            totalAmbassadors,
            topPerformersData
        ] = await prisma.$transaction([
            prisma.referralLead.count({ where: referralFilter }),
            prisma.referralLead.count({ where: { ...referralFilter, leadStatus: 'Confirmed' } }),
            prisma.referralLead.groupBy({
                by: ['leadStatus'],
                _count: { _all: true },
                where: referralFilter,
                orderBy: { _count: { leadStatus: 'desc' } }
            }),
            prisma.referralLead.groupBy({
                by: ['campus'],
                _count: { _all: true },
                where: referralFilter,
                orderBy: { _count: { campus: 'desc' } }
            }),
            prisma.referralLead.findMany({ where: referralFilter, select: { user: { select: { role: true } } } }),
            prisma.user.count({ where: { ...userFilter, role: { in: ['Parent', 'Staff'] } } }),
            prisma.referralLead.groupBy({
                by: ['userId'],
                _count: { _all: true },
                where: referralFilter,
                orderBy: { _count: { userId: 'desc' } },
                take: 5
            })
        ])

        const pendingLeads = totalLeads - confirmedLeads
        const conversionRate = totalLeads > 0 ? ((confirmedLeads / totalLeads) * 100).toFixed(1) : '0'
        const avgReferralsPerAmbassador = totalAmbassadors > 0 ? (totalLeads / totalAmbassadors).toFixed(1) : '0'

        // Total Estimated Value (Simplified)
        const totalEstimatedValue = 0

        // Campus distribution
        const campusDistribution = campusCounts.map(c => {
            const count = (c._count as any)._all || 0
            return {
                campus: c.campus || 'Unknown',
                count: count,
                percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0'
            }
        })

        // Role breakdown
        const parentReferrals = roleCounts.filter(r => r.user.role === 'Parent').length
        const staffReferrals = roleCounts.filter(r => r.user.role === 'Staff').length
        const roleBreakdown = {
            parent: { count: parentReferrals, percentage: totalLeads > 0 ? ((parentReferrals / totalLeads) * 100).toFixed(1) : '0' },
            staff: { count: staffReferrals, percentage: totalLeads > 0 ? ((staffReferrals / totalLeads) * 100).toFixed(1) : '0' }
        }

        // Status breakdown
        const statusBreakdown = statusCounts.map(s => {
            const count = (s._count as any)._all || 0
            return {
                status: s.leadStatus || 'New',
                count: count,
                percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0'
            }
        })

        // Top Performers
        const performerIds = topPerformersData.map(p => p.userId)
        const performerDetails = await prisma.user.findMany({
            where: { userId: { in: performerIds } },
            select: { userId: true, fullName: true, role: true, referralCode: true }
        })

        const topPerformers = topPerformersData.map(p => {
            const user = performerDetails.find(u => u.userId === p.userId)
            return {
                name: user?.fullName || 'Unknown',
                role: user?.role || '-',
                referralCode: user?.referralCode || '-',
                count: (p._count as any)._all || 0,
                totalValue: 0
            }
        })

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
    } catch (e: any) {
        console.error('getAdminAnalytics error:', e)
        return { success: false, error: 'Failed to calc analytics' }
    }
}

/**
 * Confirms a referral lead and calculates benefits for the ambassador.
 * Triggers revalidation of administrative and user dashboards.
 * @param leadId - The ID of the referral lead to confirm.
 * @returns An object indicating success or failure.
 */
export async function confirmReferral(leadId: number, admissionNumber: string, selectedFeeType: 'OTP' | 'WOTP') {
    const admin = await getCurrentUser()
    // Permission handled by matrix Check
    if (!admin || !await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied: You do not have confirm rights' }
    }

    if (!admissionNumber) {
        return { success: false, error: 'Student ERP/Admission Number is required for confirmation' }
    }

    if (!selectedFeeType) {
        return { success: false, error: 'Fee Type Selection (OTP or WOTP) is mandatory for confirmation' }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Check if admission number is already used (Optional uniqueness check)
            const existing = await tx.referralLead.findFirst({
                where: { admissionNumber, leadId: { not: leadId } }
            })
            if (existing) {
                // Must throw in transaction to rollback, or return strict error object (but transaction requires throw to abort)
                throw new Error(`ERP Number ${admissionNumber} is already linked to another lead`)
            }

            // 0. Fetch the correct fee snapshot
            const leadRecord = await tx.referralLead.findUnique({
                where: { leadId },
                select: { campusId: true, gradeInterested: true }
            })

            if (!leadRecord || !leadRecord.campusId || !leadRecord.gradeInterested) {
                throw new Error('Lead must have a campus and grade assigned before confirmation')
            }

            const feeRule = await tx.gradeFee.findFirst({
                where: {
                    campusId: leadRecord.campusId,
                    grade: leadRecord.gradeInterested,
                    academicYear: '2025-2026' // Default for now
                }
            })

            let annualFee = 0
            if (feeRule) {
                const rule = feeRule as any
                annualFee = selectedFeeType === 'OTP'
                    ? (rule.annualFee_otp || 0)
                    : (rule.annualFee_wotp || 0)
            }

            // 1. Update Lead
            const lead = await tx.referralLead.update({
                where: { leadId },
                include: { user: true },
                data: {
                    leadStatus: 'Confirmed',
                    confirmedDate: new Date(),
                    admissionNumber: admissionNumber,
                    selectedFeeType: selectedFeeType,
                    annualFee: annualFee
                }
            }).then(l => l as any)

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
    } catch (e: any) {
        console.error(e)
        return { success: false, error: e.message || 'Failed' }
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

// --- Bulk Actions ---

export async function bulkRejectReferrals(leadIds: number[]) {
    const admin = await getCurrentUser()
    // Permission handled by matrix Check
    if (!admin || !await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied' }
    }

    try {
        await prisma.referralLead.updateMany({
            where: {
                leadId: { in: leadIds },
                leadStatus: { not: 'Confirmed' } // Protect confirmed leads
            },
            data: { leadStatus: 'Rejected' }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Bulk reject failed' }
    }
}

export async function bulkDeleteReferrals(leadIds: number[]) {
    const admin = await getCurrentUser()
    // Permission handled by matrix Check
    if (!admin || !await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied: Delete access required' }
    }

    try {
        await prisma.referralLead.deleteMany({
            where: {
                leadId: { in: leadIds }
            }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Bulk delete failed' }
    }
}

/**
 * Calculates realtime stats based on the current applied filters.
 * Used for dynamic dashboard cards.
 */
export async function getReferralStats(filters?: {
    status?: string
    role?: string
    campus?: string
    feeType?: string
    search?: string
    dateRange?: { from: string; to: string }
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    const { filter: scopeFilter } = await getScopeFilter('referralTracking', {
        campusField: 'campus',
        useCampusName: true
    })

    if (scopeFilter === null) return { success: false, error: 'No access' }

    // Reconstruct Where Clause (Refactored)
    const where = buildReferralWhereClause(filters, scopeFilter)

    try {
        const total = await prisma.referralLead.count({ where })

        const confirmed = await prisma.referralLead.count({
            where: { ...where, leadStatus: 'Confirmed' }
        })

        const pending = await prisma.referralLead.count({
            where: { ...where, leadStatus: { in: ['New', 'Follow-up'] } }
        })

        const conversionRate = total > 0 ? parseFloat(((confirmed / total) * 100).toFixed(1)) : 0

        return {
            success: true,
            total,
            confirmed,
            pending,
            conversionRate
        }
    } catch (error) {
        console.error('getReferralStats error', error)
        return { success: false, error: 'Failed to calc stats' }
    }
}

/**
 * Exports referrals to CSV based on current filters.
 * Returns a CSV string.
 */
export async function exportReferrals(filters?: {
    status?: string
    role?: string
    campus?: string
    feeType?: string
    search?: string
    dateRange?: { from: string; to: string }
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    const { filter: scopeFilter } = await getScopeFilter('referralTracking', {
        campusField: 'campus',
        useCampusName: true
    })

    if (scopeFilter === null) return { success: false, error: 'No access' }

    const where = buildReferralWhereClause(filters, scopeFilter)

    try {
        const referrals = await prisma.referralLead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        role: true,
                        assignedCampus: true,
                        mobileNumber: true
                    }
                }
            }
        })

        // Manual CSV Generation
        const headers = ['Lead ID', 'Parent Name', 'Parent Mobile', 'Student Name', 'Grade', 'Campus', 'Status', 'Referrer', 'Referrer Role', 'Referrer Mobile', 'Date Created', 'ERP Number']
        const rows = referrals.map(r => [
            r.leadId,
            `"${r.parentName.replace(/"/g, '""')}"`,
            r.parentMobile,
            `"${(r.studentName || '').replace(/"/g, '""')}"`,
            r.gradeInterested || '',
            r.campus || '',
            r.leadStatus,
            `"${r.user.fullName.replace(/"/g, '""')}"`,
            r.user.role,
            r.user.mobileNumber,
            new Date(r.createdAt).toLocaleDateString(),
            r.admissionNumber || ''
        ])

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
        return { success: true, csv: csvContent }

    } catch (e) {
        console.error('Export Error', e)
        return { success: false, error: 'Export failed' }
    }
}

/**
 * Bulk confirms selected referrals.
 * Only processes leads that ALREADY have an admission number (from import).
 */
export async function bulkConfirmReferrals(leadIds: number[], forcedFeeType?: 'OTP' | 'WOTP') {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    // Strict Edit Check
    if (!await canEdit('referralTracking')) return { success: false, error: 'Permission Denied' }

    try {
        // Fetch leads to verify they have ERP numbers
        const leads = await prisma.referralLead.findMany({
            where: {
                leadId: { in: leadIds },
                leadStatus: { not: 'Confirmed' },
                admissionNumber: { not: null }, // MUST have ERP number
                // If forcedFeeType is provided, we don't strictly require selectedFeeType to be set already
                ...(forcedFeeType ? {} : { selectedFeeType: { not: null } })
            }
        })

        if (leads.length === 0) {
            // Check if they were already confirmed
            const alreadyConfirmed = await prisma.referralLead.count({
                where: {
                    leadId: { in: leadIds },
                    leadStatus: 'Confirmed'
                }
            })

            if (alreadyConfirmed === leadIds.length) {
                return { success: false, error: 'All selected referrals are already confirmed.' }
            }

            return { success: false, error: 'No eligible leads found. (Must have ERP Number and not be confirmed)' }
        }

        let processed = 0
        const chunkSize = 5 // Process 5 transactions in parallel to speed up without hitting connection limits

        // Helper to process a chunk
        const processChunk = async (chunk: typeof leads) => {
            const promises = chunk.map(async (lead) => {
                const targetFeeType = forcedFeeType || (lead as any).selectedFeeType
                if (!targetFeeType) return null
                try {
                    await confirmReferral(lead.leadId, lead.admissionNumber!, targetFeeType)
                    return true
                } catch (err) {
                    console.error(`Failed to confirm lead ${lead.leadId}`, err)
                    return false
                }
            })
            const results = await Promise.all(promises)
            return results.filter(Boolean).length
        }

        // Execute in chunks
        for (let i = 0; i < leads.length; i += chunkSize) {
            const chunk = leads.slice(i, i + chunkSize)
            const count = await processChunk(chunk)
            processed += count
        }

        revalidatePath('/admin')
        return { success: true, processed, totalRequested: leadIds.length }

    } catch (e: any) {
        console.error('Bulk Confirm Error', e)
        return { success: false, error: e.message }
    }
}

/**
 * Bulk converts confirmed leads to students.
 */
export async function bulkConvertLeadsToStudents(leadIds: number[]) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    // Strict Check
    if (!await canEdit('studentManagement')) return { success: false, error: 'Permission Denied' }

    try {
        const leads = await prisma.referralLead.findMany({
            where: {
                leadId: { in: leadIds },
                student: { is: null }, // Not already converted
                leadStatus: 'Confirmed' // Standard flow: must be confirmed
            },
            include: { user: true }
        })

        if (leads.length === 0) {
            return { success: false, error: 'No eligible leads found. (Leads must be Confirmed and not already converted)' }
        }

        let processed = 0
        const errors = []

        for (const lead of leads) {
            try {
                // FIND OR CREATE PARENT
                let actualParentId = null
                const parentUser = await prisma.user.findUnique({
                    where: { mobileNumber: lead.parentMobile }
                })

                if (parentUser) {
                    actualParentId = parentUser.userId
                } else {
                    const newParent = await prisma.user.create({
                        data: {
                            fullName: lead.parentName,
                            mobileNumber: lead.parentMobile,
                            role: 'Parent',
                            // @ts-ignore
                            referralCode: undefined,
                            status: 'Active',
                            childInAchariya: true
                        }
                    })
                    actualParentId = newParent.userId
                }

                // RESOLVE CAMPUS
                let finalCampusId = lead.campusId
                if (!finalCampusId && lead.campus) {
                    const c = await prisma.campus.findUnique({ where: { campusName: lead.campus } })
                    if (c) finalCampusId = c.id
                }

                if (!finalCampusId) {
                    // Fallback to first campus if available
                    const firstCampus = await prisma.campus.findFirst()
                    finalCampusId = firstCampus?.id || null
                }

                if (!finalCampusId) {
                    errors.push({ id: lead.leadId, reason: 'No Campus found' })
                    continue
                }

                // CREATE STUDENT RECORD
                await prisma.student.create({
                    data: {
                        fullName: lead.studentName || (lead.parentName + "'s Child"),
                        parentId: actualParentId,
                        campusId: finalCampusId,
                        grade: lead.gradeInterested || 'N/A',
                        section: lead.section,
                        academicYear: lead.admittedYear || '2025-2026',
                        referralLeadId: lead.leadId,
                        admissionNumber: lead.admissionNumber,
                        ambassadorId: lead.userId,
                        selectedFeeType: lead.selectedFeeType,
                        annualFee: lead.annualFee,
                        status: 'Active'
                    } as any
                })

                // UPDATE LEAD STATUS
                await prisma.referralLead.update({
                    where: { leadId: lead.leadId },
                    data: { leadStatus: 'Admitted' }
                })

                processed++
            } catch (err: any) {
                console.error(`Failed to convert lead ${lead.leadId}`, err)
                errors.push({ id: lead.leadId, reason: err.message })
            }
        }

        revalidatePath('/admin')
        return { success: true, processed, totalRequested: leadIds.length, errors }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Converts a single confirmed referral lead into a Student record.
 * Creates a shadow Parent account if needed.
 */
export async function convertLeadToStudent(leadId: number, details: { studentName: string }) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    if (!await canEdit('studentManagement')) return { success: false, error: 'Permission Denied' }

    try {
        // Reuse bulk logic for single item to ensure consistency
        const res = await bulkConvertLeadsToStudents([leadId])
        if (res.success) return { success: true }
        return { success: false, error: res.error || 'Conversion failed' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Rejects a single referral lead.
 */
export async function rejectReferral(leadId: number) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    if (!await canEdit('referralTracking')) return { success: false, error: 'Permission Denied' }

    try {
        const res = await bulkRejectReferrals([leadId])
        if (res.success) return { success: true }
        return { success: false, error: res.error || 'Rejection failed' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Updates referral lead details.
 */
export async function updateReferral(leadId: number, data: {
    parentName: string,
    parentMobile: string,
    studentName?: string,
    gradeInterested?: string,
    campus?: string
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    if (!await canEdit('referralTracking')) return { success: false, error: 'Permission Denied' }

    try {
        await prisma.referralLead.update({
            where: { leadId },
            data: {
                parentName: data.parentName,
                parentMobile: data.parentMobile,
                studentName: data.studentName,
                gradeInterested: data.gradeInterested,
                campus: data.campus
            }
        })
        revalidatePath('/admin')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
