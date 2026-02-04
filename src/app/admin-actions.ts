'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { getScopeFilter, canEdit, canDelete, hasPermission } from '@/lib/permission-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { mapLeadStatus, mapUserRole, mapAccountStatus, toLeadStatus } from '@/lib/enum-utils'
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
        grade?: string
    },
    sort?: { field: string; order: 'asc' | 'desc' }
) {
    const fs = require('fs')
    const path = require('path')
    const logFile = path.join(process.cwd(), 'debug_referrals.log')
    const log = (msg: string) => { try { fs.appendFileSync(logFile, new Date().toISOString() + ': ' + msg + '\\n') } catch (e) { } }

    log(`getAllReferrals called. Page: ${page}, Limit: ${limit}, Filters: ${JSON.stringify(filters || {})}`)

    const user = await getCurrentUser()
    log(`User: ${user?.role} (${user?.userId || 'No ID'})`)
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) {
        log('Unauthorized: Role check failed')
        return { success: false, error: 'Unauthorized' }
    }

    const { filter: scopeFilter, isReadOnly } = await getScopeFilter('referralTracking', {
        campusField: 'campus',
        useCampusName: true
    })

    log(`Scope Filter Result: ${JSON.stringify(scopeFilter)}`)

    if (scopeFilter === null) {
        log('DEBUG: No access to referral data (scopeFilter is null)')
        return { success: false, error: 'No access to referral data' }
    }

    // Build Dynamic Where Clause (Refactored)
    const where = buildReferralWhereClause(filters, scopeFilter)

    log(`DEBUG: getAllReferrals WHERE: ${JSON.stringify(where)}`)

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
                include: {
                    user: {
                        select: {
                            userId: true,
                            fullName: true,
                            role: true,
                            referralCode: true,
                            mobileNumber: true,
                            assignedCampus: true,
                            // Only select safe fields to avoid serialization issues with passwords etc
                        }
                    },
                    student: true
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit
            })
        ])

        log(`DEBUG: Fetched ${referrals.length} referrals. Total: ${total}`)
        if (referrals.length > 0) {
            const sample = referrals[0]
            log(`Sample Lead: ${sample.leadId} - ${sample.user?.fullName} - ${sample.campus}`)
        } else {
            log('No referrals found.')
        }
        if (referrals.length > 0) {
            console.log('DEBUG: Sample Lead:', JSON.stringify(referrals[0].user, null, 2))
        }

        return {
            success: true,
            referrals,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalPending: await prisma.referralLead.count({ where: { ...where, leadStatus: { in: ['New', 'Follow_up'] } } }),
                totalConfirmed: await prisma.referralLead.count({ where: { ...where, leadStatus: 'Confirmed' } })
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
export async function confirmReferral(leadId: number, admissionNumber: string, selectedFeeType: 'OTP' | 'WOTP', admissionFee?: number, donationFee?: number, annualFee?: number) {
    const admin = await getCurrentUser()
    // Permission handled by matrix Check
    if (!admin || !await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied: You do not have confirm rights' }
    }

    if (!admissionNumber) {
        return { success: false, error: 'Student ERP/Admission Number is required for confirmation' }
    }

    // Validation for fees and fee type moved inside transaction where campus is known

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
                select: { campusId: true, campus: true, gradeInterested: true }
            })

            if (!leadRecord || !leadRecord.gradeInterested) {
                throw new Error('Lead must have a grade assigned before confirmation')
            }

            // Fix for "Special Logic" campuses (AASC, etc.) which might not have campusId mapped
            const isSpecialCampus = ['ACET', 'AASC', 'ACCHM'].includes(leadRecord.campus || '')
            const hasValidCampus = leadRecord.campusId || (isSpecialCampus && leadRecord.campus)

            if (!hasValidCampus) {
                throw new Error('Lead must have a campus assigned before confirmation')
            }

            // --- Validation for Normal Logic Campuses ---
            // isSpecialCampus is already defined above

            if (!selectedFeeType && !isSpecialCampus) {
                throw new Error('Fee Type Selection (OTP or WOTP) is mandatory for confirmation')
            }

            if (!isSpecialCampus) {
                if (admissionFee === undefined || admissionFee === null) {
                    throw new Error('Admission Fee is mandatory for this campus')
                }
                if (donationFee === undefined || donationFee === null) {
                    throw new Error('Donation Fee is mandatory for this campus')
                }
            }

            // Calculate Standard Fee (Fallback if not provided)
            let finalAnnualFee = 0
            if (annualFee !== undefined && annualFee !== null) {
                finalAnnualFee = annualFee
            } else {
                // FALLBACK: If special campus, auto-inject fixed "Annual Fee" (Commission Base)
                if (isSpecialCampus) {
                    if (leadRecord.campus === 'ACET') {
                        finalAnnualFee = 5000 // Commission Base for ACET
                    } else if (['AASC', 'ACCHM'].includes(leadRecord.campus || '')) {
                        finalAnnualFee = 2000 // Commission Base for AASC/ACCHM
                    }
                } else {
                    const feeRule = await tx.gradeFee.findFirst({
                        where: {
                            campusId: leadRecord.campusId || 0, // Fallback to 0 or handle missing campusId better
                            grade: leadRecord.gradeInterested,
                            academicYear: '2026-2027' // Default for now, ideally dynamic
                        }
                    })

                    /* Fallback logic for fee generation if not provided - kept simple within core logic or could import getGradeFee */
                    if (feeRule) {
                        finalAnnualFee = selectedFeeType === 'OTP'
                            ? (feeRule.annualFee_otp || 0)
                            : (feeRule.annualFee_wotp || 0)
                    }
                }
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
                    annualFee: finalAnnualFee,
                    admissionFeeCollected: admissionFee,
                    donationFeeCollected: donationFee
                } as any
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
            // 1: 5%, 2: 10%, 3: 20%, 4: 30%, 5: 50%
            const shortTermSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 20, 4: 30, 5: 50 };
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
 * Reverts a confirmed referral back to New status.
 * CRITICAL: Recalculates benefits to ensure system consistency.
 */
export async function revertReferralConfirmation(leadId: number) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) {
        return { success: false, error: 'Permission Denied: Only Admins can revert confirmation' }
    }

    try {
        await prisma.$transaction(async (tx) => {
            const lead = await tx.referralLead.findUnique({ where: { leadId } })
            if (!lead || lead.leadStatus !== 'Confirmed') {
                throw new Error('Lead is not currently confirmed')
            }

            // 1. Revert Lead Status & Clear Confirmation Data
            await tx.referralLead.update({
                where: { leadId },
                data: {
                    leadStatus: 'New',
                    confirmedDate: null,
                    admissionNumber: null,
                    selectedFeeType: null, // Clear choice so they select new one
                    annualFee: null,
                    admissionFeeCollected: 0,
                    donationFeeCollected: 0
                } as any
            })

            // 2. RECALCULATE Benefits (CRITICAL STEP)
            const userId = lead.userId
            const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

            // Recount AFTER revert
            const currentYearCount = await tx.referralLead.count({
                where: {
                    userId,
                    leadStatus: 'Confirmed',
                    confirmedDate: { gte: currentYearStart }
                }
            })

            const count = await tx.referralLead.count({
                where: {
                    userId,
                    leadStatus: 'Confirmed'
                }
            })

            // --- Benefit Logic (Identical to Confirm Logic) ---
            const shortTermSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 20, 4: 30, 5: 50 };
            const lookupCount = Math.min(currentYearCount, 5);
            let yearFeeBenefit = shortTermSlabs[lookupCount] || 0;

            let longTermTotal = 0;
            const user = await tx.user.findUnique({ where: { userId } });

            if (user?.isFiveStarMember) {
                const priorYearCount = count - currentYearCount;
                if (currentYearCount >= 1) {
                    const cumulativeBase = priorYearCount * 3;
                    const currentYearBoost = currentYearCount * 5;
                    longTermTotal = cumulativeBase + currentYearBoost;
                    if (longTermTotal > yearFeeBenefit) {
                        yearFeeBenefit = longTermTotal;
                    }
                }
            }

            // Update User with CORRECTED benefit state
            await tx.user.update({
                where: { userId },
                data: {
                    confirmedReferralCount: count,
                    yearFeeBenefitPercent: yearFeeBenefit,
                    longTermBenefitPercent: longTermTotal,
                    benefitStatus: count >= 1 ? 'Active' : 'Inactive',
                    // Note: We don't revoke isFiveStarMember if they drop below 5, it's sticky
                }
            })
        })

        revalidatePath('/admin')
        revalidatePath('/dashboard')
        revalidatePath('/referrals')

        await logAction('UPDATE', 'referral', `Reverted confirmation for lead: ${leadId}`, leadId.toString())

        return { success: true }
    } catch (e: any) {
        console.error('Revert Error:', e)
        return { success: false, error: e.message || 'Revert failed' }
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

export async function bulkRejectReferrals(leadIds: number[], reason?: string) {
    const admin = await getCurrentUser()
    // Permission handled by matrix Check
    if (!admin || !await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied' }
    }

    if (!reason || reason.trim().length < 3) {
        return { success: false, error: 'A valid rejection reason is mandatory' }
    }

    try {
        await prisma.referralLead.updateMany({
            where: {
                leadId: { in: leadIds },
                leadStatus: { not: 'Confirmed' } // Protect confirmed leads
            },
            data: {
                leadStatus: 'Rejected',
                rejectionReason: reason
            }
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
    // STRICT CHECK: Only Super Admin can delete referrals
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Permission Denied: Only Super Admin can delete referrals' }
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
 * Triggers deletion of a SINGLE referral.
 * Restricted to Super Admin.
 */
export async function deleteReferral(leadId: number) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Permission Denied: Only Super Admin can delete referrals' }
    }

    try {
        await prisma.referralLead.delete({
            where: { leadId }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error('Delete referral error:', e)
        return { success: false, error: 'Failed to delete referral' }
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
    grade?: string
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

    const fs = require('fs')
    const path = require('path')
    const logFile = path.join(process.cwd(), 'debug_referrals.log')
    const log = (msg: string) => { try { fs.appendFileSync(logFile, new Date().toISOString() + ': ' + msg + '\n') } catch (e) { } }

    log(`getReferralStats called. Filters: ${JSON.stringify(filters || {})}`)
    log(`DEBUG: Stats WHERE: ${JSON.stringify(where)}`)

    try {
        const total = await prisma.referralLead.count({ where })

        const confirmed = await prisma.referralLead.count({
            where: { ...where, leadStatus: 'Confirmed' }
        })

        // Use 'Follow_up' (underscore) to match Prisma Enum / DB Value
        const pending = await prisma.referralLead.count({
            where: { ...where, leadStatus: { in: ['New', 'Follow_up'] } }
        })

        log(`DEBUG: getReferralStats Result - Total: ${total}, Confirmed: ${confirmed}, Pending: ${pending}`)

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
    grade?: string
    columns?: string[] // [NEW] User selected columns
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
                        referralCode: true,
                        assignedCampus: true,
                        mobileNumber: true
                    }
                }
            }
        })

        // Dynamic Column Mapping
        // Define available columns and their data extractors
        const FIELD_MAP: Record<string, (r: any) => string | number> = {
            'Lead ID': r => r.leadId,
            'Parent Name': r => `"${r.parentName.replace(/"/g, '""')}"`,
            'Parent Mobile': r => r.parentMobile,
            'Student Name': r => `"${(r.studentName || '').replace(/"/g, '""')}"`,
            'Grade': r => r.gradeInterested || '',
            'Section': r => r.section || '',
            'Campus': r => r.campus || '',
            'Status': r => r.leadStatus,
            'Referrer': r => `"${r.user.fullName.replace(/"/g, '""')}"`,
            'Referrer Role': r => r.user.role,
            'Referrer Code': r => r.user.referralCode || '',
            'Referrer Campus': r => r.user.assignedCampus || '',
            'Referrer Mobile': r => r.user.mobileNumber,
            'Date Created': r => new Date(r.createdAt).toLocaleDateString(),
            'Confirmed Date': r => r.confirmedDate ? new Date(r.confirmedDate).toLocaleDateString() : 'N/A',
            'ERP Number': r => r.admissionNumber || '',
            'Academic Year': r => r.admittedYear || '', // [NEW] As requested
            'Fee Plan': r => r.selectedFeeType || '',
            'Annual Fee': r => r.annualFee || '',
            'Admission Fee': r => r.admissionFeeCollected || 0,
            'Donation Fee': r => r.donationFeeCollected || 0,
            'Rejection Reason': r => `"${(r.rejectionReason || '').replace(/"/g, '""')}"`
        }

        // Default columns if none provided (Legacy behavior or default)
        const DEFAULT_COLUMNS = ['Lead ID', 'Parent Name', 'Parent Mobile', 'Student Name', 'Grade', 'Campus', 'Status', 'Referrer', 'Referrer Role', 'Date Created', 'ERP Number']

        // Use provided columns or default
        const targetColumns = (filters?.columns && filters.columns.length > 0) ? filters.columns : DEFAULT_COLUMNS

        // Filter out any invalid column names requested by client
        const headers = targetColumns.filter(c => FIELD_MAP[c])

        const rows = referrals.map(r => {
            return headers.map(header => {
                const extractor = FIELD_MAP[header]
                return extractor ? extractor(r) : ''
            })
        })

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
                        admissionFeeCollected: (lead as any).admissionFeeCollected,
                        donationFeeCollected: (lead as any).donationFeeCollected,
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
export async function rejectReferral(leadId: number, reason: string) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) return { success: false, error: 'Unauthorized' }

    if (!await canEdit('referralTracking')) return { success: false, error: 'Permission Denied' }

    if (!reason || reason.trim().length < 3) {
        return { success: false, error: 'Rejection reason is required' }
    }

    try {
        const res = await bulkRejectReferrals([leadId], reason)
        if (res.success) return { success: true }
        return { success: false, error: res.error || 'Rejection failed' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}


/**
 * Updates an existing referral lead with new details.
 * Supports editing Student Info, Status, Fee Plan, and Admission Details.
 */
export async function updateReferral(leadId: number, data: {
    studentName?: string
    parentName?: string
    parentMobile?: string
    gradeInterested?: string
    campus?: string
    admissionNumber?: string
    section?: string
    leadStatus?: string
    annualFee?: number | null
    selectedFeeType?: 'OTP' | 'WOTP' | null
    admittedYear?: string
    rejectionReason?: string | null
    admissionFeeCollected?: number | null
    donationFeeCollected?: number | null
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) {
        return { success: false, error: 'Unauthorized' }
    }

    if (!await canEdit('referralTracking')) {
        return { success: false, error: 'Permission Denied' }
    }

    try {
        // Resolve Campus ID if name provided
        let campusId = undefined
        if (data.campus) {
            const c = await prisma.campus.findUnique({ where: { campusName: data.campus } })
            if (c) campusId = c.id
        }

        // Check if status is transitioning to Confirmed to set timestamp
        const currentLead = await prisma.referralLead.findUnique({ where: { leadId }, select: { leadStatus: true } })
        let extraData: any = {}
        if (data.leadStatus === 'Confirmed' && currentLead?.leadStatus !== 'Confirmed') {
            extraData.confirmedAt = new Date()
        }

        await prisma.referralLead.update({
            where: { leadId },
            data: {
                ...data,
                ...extraData,
                campusId: campusId,
                leadStatus: data.leadStatus ? toLeadStatus(data.leadStatus) : undefined,
                annualFee: data.annualFee ? Number(data.annualFee) : null,
                selectedFeeType: (!data.selectedFeeType || (data.selectedFeeType as any) === '') ? null : data.selectedFeeType as any,
                admissionFeeCollected: data.admissionFeeCollected,
                donationFeeCollected: data.donationFeeCollected
            } as any // Cast to any to resolve Prisma type sync issues
        })

        revalidatePath('/admin')
        revalidatePath('/referrals')

        await logAction('UPDATE', 'referral', `Updated lead ${leadId} details`, leadId.toString(), null, { updates: data })

        return { success: true }
    } catch (e: any) {
        console.error('Update Referral Error:', e)
        return { success: false, error: e.message || 'Failed to update referral' }
    }
}

/**
 * Fetches the annual fee for a given campus, grade, and academic year.
 * Used for auto-calculating fees in the UI.
 */
export async function getGradeFee(campusName: string, grade: string, academicYear: string = '2026-2027') {
    const user = await getCurrentUser()

    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus') && !user.role.includes('Head') && !user.role.includes('Super'))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const cleanCampusName = campusName.trim()

        // 1. ROBUST CAMPUS LOOKUP
        let campus = await prisma.campus.findUnique({ where: { campusName: cleanCampusName } })

        if (!campus) {
            campus = await prisma.campus.findFirst({
                where: { campusName: { equals: cleanCampusName, mode: 'insensitive' } }
            })
        }

        // If no hyphen match found, try suffix matching but be careful with multiples
        if (!campus && cleanCampusName.includes('-')) {
            const parts = cleanCampusName.split('-')
            const suffix = parts[parts.length - 1].trim()
            if (suffix.length > 3) {
                const campusMatches = await prisma.campus.findMany({
                    where: { campusName: { contains: suffix, mode: 'insensitive' } }
                })

                if (campusMatches.length > 0) {
                    // Try to pick the one that also matches the prefix
                    const prefix = parts[0].trim().toLowerCase()
                    campus = campusMatches.find(c => c.campusName.toLowerCase().includes(prefix)) || campusMatches[0]
                }
            }
        }

        // Final Loose Match (contains anywhere)
        if (!campus) {
            campus = await prisma.campus.findFirst({
                where: { campusName: { contains: cleanCampusName, mode: 'insensitive' } }
            })
        }

        if (!campus) return { success: false, error: 'Campus not found' }

        // 2. GRADE NORMALIZATION & MATCHING
        const normalizeGrade = (g: string) => {
            let s = g.trim().replace(/\s+/g, ' ') // Standardize to single space
            // Roman Numeral Conversion
            const romanMap: Record<string, string> = {
                ' - I': ' - 1', ' - II': ' - 2', ' - III': ' - 3', ' - IV': ' - 4', ' - V': ' - 5',
                ' - VI': ' - 6', ' - VII': ' - 7', ' - VIII': ' - 8', ' - IX': ' - 9', ' - X': ' - 10',
                ' - XI': ' - 11', ' - XII': ' - 12'
            }
            Object.entries(romanMap).forEach(([roman, num]) => {
                if (s.endsWith(roman)) s = s.replace(roman, num)
            })

            // Ensure standard format "Grade - N" or "Mont - N"
            if (s.toLowerCase().includes('grade')) {
                const num = s.toLowerCase().replace(/grade/g, '').replace(/-/g, '').trim()
                return `Grade - ${num}`
            }
            if (s.toLowerCase().includes('mont') && !s.toLowerCase().includes('pre')) {
                const num = s.toLowerCase().replace(/mont/g, '').replace(/-/g, '').trim()
                return `Mont - ${num}`
            }
            return s
        }

        const normalizedGrade = normalizeGrade(grade)
        const targetSimple = grade.toLowerCase().replace(/[^a-z0-9]/g, '')

        let feeRecord = await prisma.gradeFee.findFirst({
            where: {
                campusId: campus.id,
                grade: normalizedGrade,
                academicYear: academicYear
            }
        })

        if (!feeRecord) {
            // Try exact or fuzzy match in all fees for this campus/year
            const allFeesForYear = await prisma.gradeFee.findMany({
                where: { campusId: campus.id, academicYear: academicYear }
            })

            feeRecord = allFeesForYear.find(f =>
                f.grade === grade ||
                f.grade.toLowerCase().replace(/[^a-z0-9]/g, '') === targetSimple
            ) || null
        }

        // Final Year Fallback
        if (!feeRecord) {
            const allYearsFees = await prisma.gradeFee.findMany({
                where: { campusId: campus.id },
                orderBy: { academicYear: 'desc' }
            })
            feeRecord = allYearsFees.find(f =>
                f.grade === grade ||
                f.grade.toLowerCase().replace(/[^a-z0-9]/g, '') === targetSimple
            ) || null
        }

        if (!feeRecord) return { success: false, error: 'Fee record not found' }

        return { success: true, fees: { otp: feeRecord.annualFee_otp, wotp: feeRecord.annualFee_wotp } }
    } catch (e) {
        console.error('Error fetching grade fee:', e)
        return { success: false, error: 'Failed to fetch fee' }
    }
}
