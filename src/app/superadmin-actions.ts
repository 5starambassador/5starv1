'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { EmailService } from "@/lib/email-service"
import { logAction } from "@/lib/audit-logger"
import { registerSchema, mobileSchema } from "@/lib/validators"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { hasModuleAccess, getDataScope, getPrismaScopeFilter } from "@/lib/permissions"
import { hasPermission } from "@/lib/permission-service"
import { generateSmartReferralCode } from "@/lib/referral-service"
import { UserRole, AdminRole, AccountStatus, LeadStatus, Prisma } from "@prisma/client"
import { revalidatePath } from 'next/cache'
import { toAdminRole, toLeadStatus, toUserRole, toAccountStatus } from "@/lib/enum-utils"


interface SystemAnalytics {
    totalAmbassadors: number
    totalLeads: number
    totalConfirmed: number
    globalConversionRate: number
    totalCampuses: number
    systemWideBenefits: number
    totalStudents: number
    staffCount: number
    parentCount: number
    userRoleDistribution: { name: string; value: number }[]
    // Comparison metrics
    prevAmbassadors?: number
    prevLeads?: number
    prevConfirmed?: number
    prevBenefits?: number
    // New metrics for Phase 2
    avgLeadsPerAmbassador: number
    totalEstimatedRevenue: number
    conversionFunnel: { stage: string; count: number }[]
}

interface CampusComparison {
    campus: string
    totalLeads: number
    confirmed: number
    pending: number
    conversionRate: number
    ambassadors: number
    prevLeads?: number
    prevConfirmed?: number
    roleDistribution?: { name: string; value: number }[]
    totalStudents?: number
    staffCount?: number
    parentCount?: number
    systemWideBenefits?: number
    prevBenefits?: number
}

interface UserRecord {
    userId: number
    fullName: string
    mobileNumber: string
    role: string
    assignedCampus: string | null
    campusId: number | null
    grade: string | null
    studentFee: number
    status: string
    referralCount: number
    createdAt: Date
}

/**
 * Fetches global system analytics with optional time range filtering.
 * Requires Super Admin privileges.
 * 
 * @param timeRange - Filter window: '7d', '30d', or 'all'
 * @returns SystemAnalytics object containing KPI metrics
 */
export async function getSystemAnalytics(timeRange: '7d' | '30d' | 'all' = 'all'): Promise<SystemAnalytics> {
    const user = await getCurrentUser()
    const canAccess = await hasPermission('analytics')
    if (!user || !canAccess) {
        throw new Error('Unauthorized')
    }

    // Date Filter
    let dateFilter: { createdAt?: { gte: Date } } = {};
    let prevDateFilter: { createdAt?: { gte: Date; lt: Date } } | undefined;

    if (timeRange === '7d') {
        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { gte: start } };
        prevDateFilter = { createdAt: { gte: prevStart, lt: start } };
    } else if (timeRange === '30d') {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const prevStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { gte: start } };
        prevDateFilter = { createdAt: { gte: prevStart, lt: start } };
    }

    const scopeFilterUsers = getPrismaScopeFilter(user, 'userManagement')
    const scopeFilterLeads = getPrismaScopeFilter(user, 'analytics')

    const [
        totalAmbassadors,
        totalLeads,
        totalConfirmedRecords,
        prevAmbassadors,
        prevLeads,
        prevConfirmedRecords,
        legacyLeadSummary,
        totalActiveCampuses
    ] = await Promise.all([
        prisma.user.count({ where: { ...dateFilter, ...scopeFilterUsers } }),
        prisma.referralLead.count({ where: { ...dateFilter, ...scopeFilterLeads } }),
        prisma.referralLead.count({ where: { leadStatus: LeadStatus.Confirmed, ...dateFilter, ...scopeFilterLeads } }),
        prevDateFilter ? prisma.user.count({ where: { ...prevDateFilter, ...scopeFilterUsers } }) : Promise.resolve(undefined),
        prevDateFilter ? prisma.referralLead.count({ where: { ...prevDateFilter, ...scopeFilterLeads } }) : Promise.resolve(undefined),
        prevDateFilter ? prisma.referralLead.count({ where: { leadStatus: LeadStatus.Confirmed, ...prevDateFilter, ...scopeFilterLeads } }) : Promise.resolve(undefined),
        prisma.user.aggregate({
            where: { ...dateFilter, ...scopeFilterUsers },
            _sum: { confirmedReferralCount: true }
        }),
        prisma.campus.count({ where: { isActive: true } })
    ])

    // Use legacy count if it's higher (fallback for imported data missing detailed lead records)
    const legacyConfirmedCount = legacyLeadSummary._sum.confirmedReferralCount || 0
    const totalConfirmed = Math.max(totalConfirmedRecords, legacyConfirmedCount)
    const totalCampuses = totalActiveCampuses

    // Total Leads should at least be equal to confirmed if no detailed leads exist
    const finalTotalLeads = Math.max(totalLeads, totalConfirmed)

    const globalConversionRate = finalTotalLeads > 0
        ? (totalConfirmed / finalTotalLeads) * 100
        : 0

    // Calculate system-wide benefits
    // Optimized: Calculate system-wide benefits via DB Aggregation (O(1) memory)
    const result: any[] = await prisma.$queryRaw`
        SELECT SUM("studentFee" * ("yearFeeBenefitPercent" / 100.0) * "confirmedReferralCount") as total
        FROM "User"
        WHERE "confirmedReferralCount" > 0
        ${dateFilter.createdAt ? Prisma.sql`AND "createdAt" >= ${dateFilter.createdAt.gte}` : Prisma.empty}
    `
    const systemWideBenefits = result[0]?.total ? Number(result[0].total) : 0

    // Previous benefits
    let prevBenefits;
    if (prevDateFilter && prevDateFilter.createdAt) {
        const prevResult: any[] = await prisma.$queryRaw`
            SELECT SUM("studentFee" * ("yearFeeBenefitPercent" / 100.0) * "confirmedReferralCount") as total
            FROM "User"
            WHERE "confirmedReferralCount" > 0
            AND "createdAt" >= ${prevDateFilter.createdAt.gte}
            AND "createdAt" < ${prevDateFilter.createdAt.lt}
        `
        prevBenefits = prevResult[0]?.total ? Number(prevResult[0].total) : 0
    }

    // User Role Distribution
    const userRoles = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: dateFilter
    })

    const userRoleDistribution = userRoles.map(u => ({
        name: u.role,
        value: u._count.role
    }))

    const totalStudents = await prisma.student.count()
    const staffCount = userRoles.find(u => u.role === UserRole.Staff)?._count.role || 0
    const parentCount = userRoles.find(u => u.role === UserRole.Parent)?._count.role || 0

    // --- Phase 2: Enhanced Analytics ---
    const avgLeadsPerAmbassador = totalAmbassadors > 0 ? Number((finalTotalLeads / totalAmbassadors).toFixed(2)) : 0
    const totalEstimatedRevenue = totalConfirmed * 60000
    const conversionFunnel = [
        { stage: 'Site Visitors', count: finalTotalLeads * 3 },
        { stage: 'Total Leads', count: finalTotalLeads },
        { stage: 'Follow-ups', count: Math.round(finalTotalLeads * 0.6) },
        { stage: 'Admissions', count: totalConfirmed }
    ]

    return {
        totalAmbassadors,
        totalLeads: finalTotalLeads,
        totalConfirmed,
        globalConversionRate: Number(globalConversionRate.toFixed(2)),
        totalCampuses,
        systemWideBenefits: Math.round(systemWideBenefits),
        totalStudents,
        staffCount,
        parentCount,
        userRoleDistribution,
        prevAmbassadors,
        prevLeads,
        prevConfirmed: prevConfirmedRecords,
        prevBenefits,
        avgLeadsPerAmbassador,
        totalEstimatedRevenue,
        conversionFunnel
    }
}

/**
 * Fetches growth trends for users matched within the requested time range.
 * 
 * @param timeRange - Window to analyze
 * @returns Array of date/count pairs for charting
 */
export async function getUserGrowthTrend(timeRange: '7d' | '30d' | 'all' = '30d') {
    const user = await getCurrentUser()
    if (!user || !await hasPermission('analytics')) {
        throw new Error('Unauthorized')
    }

    // Determine days
    const days = timeRange === '7d' ? 7 : timeRange === 'all' ? 90 : 30; // 'all' defaults to 90 days for trends

    // Get users created in range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const users = await prisma.user.findMany({
        where: {
            createdAt: {
                gte: startDate
            }
        },
        select: {
            createdAt: true
        }
    })

    // Group by date
    const trendMap = new Map<string, number>()

    // Initialize days with 0
    for (let i = 0; i < days; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        trendMap.set(dateStr, 0)
    }

    users.forEach(u => {
        const dateStr = u.createdAt.toISOString().split('T')[0]
        if (trendMap.has(dateStr)) {
            trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1)
        }
    })

    // Convert to array and sort by date
    const trend = Array.from(trendMap.entries())
        .map(([date, count]) => ({ date, users: count }))
        .sort((a, b) => a.date.localeCompare(b.date))

    // Format date for display (e.g., "Dec 25")
    return trend.map(t => {
        const [y, m, d] = t.date.split('-')
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
        return {
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            users: t.users
        }
    })
}

/**
 * Compares performance across all campuses.
 * 
 * @param timeRange - Analysis window
 * @returns Array of campus-specific performance metrics
 */
export async function getCampusComparison(timeRange: '7d' | '30d' | 'all' = 'all'): Promise<CampusComparison[]> {
    const user = await getCurrentUser()
    if (!user || !await hasPermission('campusPerformance')) {
        throw new Error('Unauthorized')
    }

    // Date filtering
    let dateFilter: { createdAt?: { gte: Date } } = {};
    let prevDateFilter: { createdAt?: { gte: Date; lt: Date } } | undefined;

    if (timeRange === '7d') {
        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { gte: start } };
        prevDateFilter = { createdAt: { gte: prevStart, lt: start } };
    } else if (timeRange === '30d') {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const prevStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { gte: start } };
        prevDateFilter = { createdAt: { gte: prevStart, lt: start } };
    }

    // Optimized Aggregation: Fetch all stats in parallel grouping queries
    const [
        allCampuses,
        totalLeadsData,
        confirmedData,
        pendingData,
        ambassadorData,
        prevLeadsData,
        prevConfirmedData,
        roleDistributionData,
        campusStudentsData,
        campusUsersData,
        currentBenefitsData,
        prevBenefitsData
    ] = await Promise.all([
        prisma.campus.findMany({
            where: { isActive: true },
            select: { campusName: true, id: true }
        }),
        prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, ...dateFilter },
            _count: { _all: true }
        }),
        prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, leadStatus: 'Confirmed', ...dateFilter },
            _count: { _all: true }
        }),
        prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, leadStatus: { in: [LeadStatus.New, LeadStatus.Follow_up] }, ...dateFilter },
            _count: { _all: true }
        }),
        prisma.referralLead.findMany({
            where: { campus: { not: null } },
            select: { campus: true, userId: true },
            distinct: ['campus', 'userId']
        }),
        prevDateFilter ? prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, ...prevDateFilter },
            _count: { _all: true }
        }) : Promise.resolve([]),
        prevDateFilter ? prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, leadStatus: 'Confirmed', ...prevDateFilter },
            _count: { _all: true }
        }) : Promise.resolve([]),
        prisma.referralLead.findMany({
            where: { campus: { not: null }, ...dateFilter },
            select: {
                campus: true,
                user: { select: { role: true } }
            }
        }),
        prisma.student.groupBy({
            by: ['campusId'],
            _count: { _all: true }
        }),
        prisma.user.groupBy({
            by: ['assignedCampus', 'role'],
            where: { assignedCampus: { not: null } },
            _count: { _all: true }
        }),
        prisma.user.findMany({
            where: {
                assignedCampus: { not: null },
                ...dateFilter,
                confirmedReferralCount: { gt: 0 }
            },
            select: {
                assignedCampus: true,
                studentFee: true,
                yearFeeBenefitPercent: true,
                confirmedReferralCount: true
            }
        }),
        prevDateFilter ? prisma.user.findMany({
            where: {
                assignedCampus: { not: null },
                ...prevDateFilter,
                confirmedReferralCount: { gt: 0 }
            },
            select: {
                assignedCampus: true,
                studentFee: true,
                yearFeeBenefitPercent: true,
                confirmedReferralCount: true
            }
        }) : Promise.resolve([])
    ]);

    const campusMap = new Map<string, CampusComparison>();
    const getEntry = (campus: string) => {
        if (!campusMap.has(campus)) {
            campusMap.set(campus, {
                campus,
                totalLeads: 0,
                confirmed: 0,
                pending: 0,
                conversionRate: 0,
                ambassadors: 0,
                prevLeads: 0,
                prevConfirmed: 0,
                roleDistribution: [],
                totalStudents: 0,
                staffCount: 0,
                parentCount: 0,
                systemWideBenefits: 0,
                prevBenefits: 0
            });
        }
        return campusMap.get(campus)!;
    };

    allCampuses.forEach(c => getEntry(c.campusName));

    totalLeadsData.forEach(item => { if (item.campus) getEntry(item.campus).totalLeads = item._count._all; });
    confirmedData.forEach(item => { if (item.campus) getEntry(item.campus).confirmed = item._count._all; });
    pendingData.forEach(item => { if (item.campus) getEntry(item.campus).pending = item._count._all; });
    prevLeadsData.forEach(item => { if (item.campus) getEntry(item.campus).prevLeads = item._count._all; });
    prevConfirmedData.forEach(item => { if (item.campus) getEntry(item.campus).prevConfirmed = item._count._all; });

    // Previously this counted users with leads. Switching to count all Staff/Parents as ambassadors 
    // to match top-level card logic and show "live" imported data correctly.
    campusUsersData.forEach(u => {
        if (u.assignedCampus) {
            const entry = getEntry(u.assignedCampus);
            entry.ambassadors += u._count._all;
        }
    });

    const roleStats = new Map<string, Map<string, number>>();
    roleDistributionData.forEach(item => {
        if (item.campus && item.user?.role) {
            if (!roleStats.has(item.campus)) roleStats.set(item.campus, new Map());
            const m = roleStats.get(item.campus)!;
            m.set(item.user.role, (m.get(item.user.role) || 0) + 1);
        }
    });

    roleStats.forEach((roles, campus) => {
        const entry = getEntry(campus);
        entry.roleDistribution = Array.from(roles.entries()).map(([name, value]) => ({ name, value }));
    });

    const idToName = new Map(allCampuses.map(c => [c.id, c.campusName]));
    campusStudentsData.forEach(item => {
        const name = idToName.get(item.campusId);
        if (name) getEntry(name).totalStudents = item._count._all;
    });

    campusUsersData.forEach(u => {
        if (u.assignedCampus) {
            const entry = getEntry(u.assignedCampus);
            if (u.role === 'Staff') entry.staffCount = (entry.staffCount || 0) + u._count._all;
            else if (u.role === 'Parent') entry.parentCount = (entry.parentCount || 0) + u._count._all;
        }
    });

    currentBenefitsData.forEach(u => {
        if (u.assignedCampus) {
            const entry = getEntry(u.assignedCampus);

            // Heuristic fallback: if we have NO leads in the table for this campus 
            // but the user has confirmed counts, we trust the user counts.
            if (u.confirmedReferralCount > 0) {
                // We add it to the entry if it's currently 0 to avoid double counting 
                // but since the lead table is empty, this will ignite the 0s.
                // If some leads exist, we take the MAX to be safe.
                if (entry.confirmed < u.confirmedReferralCount) {
                    const diff = u.confirmedReferralCount - entry.confirmed;
                    entry.confirmed += diff;
                    // Ensure total leads is at least equal to confirmed
                    if (entry.totalLeads < entry.confirmed) entry.totalLeads = entry.confirmed;
                }
            }

            entry.systemWideBenefits = (entry.systemWideBenefits || 0) + (u.studentFee * (u.yearFeeBenefitPercent / 100) * u.confirmedReferralCount);
        }
    });

    prevBenefitsData.forEach(u => {
        if (u.assignedCampus) {
            const entry = getEntry(u.assignedCampus);
            entry.prevBenefits = (entry.prevBenefits || 0) + (u.studentFee * (u.yearFeeBenefitPercent / 100) * u.confirmedReferralCount);
        }
    });

    const comparison = Array.from(campusMap.values()).map(c => {
        c.conversionRate = c.totalLeads > 0 ? Number(((c.confirmed / c.totalLeads) * 100).toFixed(2)) : 0;
        return c;
    });

    return comparison.sort((a, b) => b.totalLeads - a.totalLeads);
}

// ===================== CAMPUS DRILL DOWN =====================
export async function getCampusDetails(campusName: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 1. Top Ambassadors in this campus
        const topAmbassadors = await prisma.user.findMany({
            where: { assignedCampus: campusName, role: { not: UserRole.Staff } },
            orderBy: { confirmedReferralCount: 'desc' },
            take: 5,
            select: {
                fullName: true,
                mobileNumber: true,
                confirmedReferralCount: true,
                referralCode: true
            }
        })

        // 2. Recent Leads for this campus
        const recentLeads = await prisma.referralLead.findMany({
            where: { campus: campusName },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                student: {
                    select: { fullName: true } // Referrer details
                }
            }
        })

        return { success: true, topAmbassadors, recentLeads }
    } catch (error) {
        console.error('Get campus details error:', error)
        return { success: false, error: 'Failed to fetch details' }
    }
}
export async function getAllUsers(): Promise<UserRecord[]> {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    const scopeFilter = getPrismaScopeFilter(user, 'userManagement')

    const users = await prisma.user.findMany({
        where: {
            ...scopeFilter,
            referralCode: { not: null }
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            role: true,
            assignedCampus: true,
            campusId: true,
            grade: true,
            studentFee: true,
            status: true,
            confirmedReferralCount: true,
            referralCode: true,
            createdAt: true,
            empId: true,
            isFiveStarMember: true,
            transactionId: true,
            paymentAmount: true
        },
        orderBy: { createdAt: 'desc' }
    })

    // Fetch all campuses to map IDs to Names
    const campuses = await prisma.campus.findMany({ select: { id: true, campusName: true } })
    const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

    return users.map(u => ({
        ...u,
        assignedCampus: u.assignedCampus || (u.campusId ? campusMap.get(u.campusId) || null : null),
        referralCount: u.confirmedReferralCount
    }))
}

export async function getAllAdmins() {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    const scopeFilter = getPrismaScopeFilter(user, 'adminManagement')

    return await prisma.admin.findMany({
        where: scopeFilter,
        orderBy: { createdAt: 'desc' }
    })
}

/**
 * Retrieves all registered students with parent, ambassador, and campus details.
 * @returns Array of Student records with inclusions
 */
export async function getAllStudents() {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    const scopeFilter = getPrismaScopeFilter(user, 'studentManagement')

    return await prisma.student.findMany({
        where: scopeFilter,
        include: {
            parent: { select: { fullName: true, mobileNumber: true } },
            ambassador: { select: { fullName: true, mobileNumber: true, referralCode: true, role: true } },
            campus: { select: { campusName: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

/**
 * Assigns a user to a specific campus location.
 * Logs action to audit trail.
 * 
 * @param userId - Target user ID
 * @param campus - Campus name or null
 * @returns Updated user record
 */
export async function assignUserToCampus(userId: number, campus: string | null) {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Super Admin')) {
        throw new Error('Unauthorized')
    }

    const previousUser = await prisma.user.findUnique({ where: { userId } })

    const updatedUser = await prisma.user.update({
        where: { userId },
        data: { assignedCampus: campus }
    })

    await logAction('UPDATE', 'user', `Assigned user ${userId} to campus: ${campus}`, userId.toString(), null, { previous: previousUser, next: updatedUser })

    return updatedUser
}

/**
 * Updates an administrator's role and campus assignment.
 * 
 * @param adminId - Admin ID to update
 * @param role - New role name
 * @param campus - Campus name or null
 */

export async function updateAdminRole(adminId: number, role: string, campus: string | null) {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Super Admin')) {
        throw new Error('Unauthorized')
    }

    const previousAdmin = await prisma.admin.findUnique({ where: { adminId } })

    const updatedAdmin = await prisma.admin.update({
        where: { adminId },
        data: {
            role: toAdminRole(role),
            assignedCampus: campus
        }
    })

    await logAction('UPDATE', 'admin', `Updated admin ${adminId} role to ${role}`, adminId.toString(), null, { previous: previousAdmin, next: updatedAdmin })

    return updatedAdmin
}

/**
 * Permanently deletes a user and their associated referral leads.
 * @param userId - ID of the user to delete.
 * @returns Object indicating success or failure.
 */
export async function deleteUser(userId: number) {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Super Admin')) {
        throw new Error('Unauthorized')
    }

    // Delete all referrals first due to foreign key constraint
    return await prisma.$transaction(async (tx) => {
        await tx.referralLead.deleteMany({
            where: { userId }
        })

        return await tx.user.delete({
            where: { userId }
        })
    })
}



// ===================== ADD USER =====================
/**
 * Creates a new user (Staff or Parent) in the system.
 * Handles duplicate checks, referral code generation, and welcome emails.
 * 
 * @param data - New user details
 * @returns Success status and user object or error message
 */
export async function addUser(data: {
    fullName: string
    mobileNumber: string
    role: UserRole
    childInAchariya?: string
    childName?: string
    assignedCampus?: string
}) {
    const admin = await getCurrentUser()
    const allowedRoles = ['Super Admin', 'Admission Admin', 'Campus Head']

    if (!admin || !allowedRoles.includes(admin.role)) {
        return { success: false, error: 'Unauthorized: Insufficient permissions' }
    }

    try {
        // Check if mobile number already exists
        const existing = await prisma.user.findUnique({
            where: { mobileNumber: data.mobileNumber }
        })

        if (existing) {
            return { success: false, error: 'Mobile number already registered' }
        }

        // Generate Smart Referral Code using shared service
        const referralCode = await generateSmartReferralCode(data.role)

        const newUser = await prisma.user.create({
            data: {
                fullName: data.fullName,
                mobileNumber: data.mobileNumber,
                role: data.role,
                referralCode,
                childInAchariya: data.childInAchariya === 'Yes',
                childName: data.childName || null,
                assignedCampus: data.assignedCampus || null,
                status: 'Active',
                yearFeeBenefitPercent: 0,
                longTermBenefitPercent: 0,
                confirmedReferralCount: 0,
                isFiveStarMember: false
            }
        })

        await logAction('CREATE', 'user', `Created new user: ${data.mobileNumber}`, newUser.userId.toString(), null, { role: data.role })

        // Send Welcome Email
        await EmailService.sendWelcomeEmail(data.mobileNumber, data.fullName, data.role)

        return { success: true, user: newUser }
    } catch (error) {
        console.error('Add user error:', error)
        return { success: false, error: 'Failed to add user' }
    }
}

/**
 * Updates an existing user's details.
 * @param userId - ID of the user to update.
 * @param data - Updated user fields.
 */
export async function updateUser(userId: number, data: {
    fullName?: string
    mobileNumber?: string
    role?: UserRole
    assignedCampus?: string
    empId?: string
    childEprNo?: string
    isFiveStarMember?: boolean
    yearFeeBenefitPercent?: number
    longTermBenefitPercent?: number
}) {
    const admin = await getCurrentUser()
    const allowedRoles = ['Super Admin', 'Admission Admin', 'Campus Head']

    if (!admin || !allowedRoles.includes(admin.role)) {
        return { success: false, error: 'Unauthorized: Insufficient permissions' }
    }

    try {
        const previousUser = await prisma.user.findUnique({ where: { userId } })

        const updatedUser = await prisma.user.update({
            where: { userId },
            data: {
                ...data
            }
        })

        await logAction('UPDATE', 'user', `Updated user: ${userId}`, userId.toString(), null, {
            previous: previousUser,
            next: updatedUser
        })

        return { success: true, user: updatedUser }
    } catch (error) {
        console.error('Update user error:', error)
        return { success: false, error: 'Failed to update user' }
    }
}

// ===================== DELETE USER (with return object) =====================
export async function removeUser(userId: number) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Only Super Admin can delete users' }
    }

    try {
        await prisma.referralLead.deleteMany({ where: { userId } })
        await prisma.user.delete({ where: { userId } })

        await logAction('DELETE', 'user', `Deleted user: ${userId}`, userId.toString())

        return { success: true }
    } catch (error) {
        console.error('Delete user error:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}

// ===================== BULK ADD USERS =====================
export async function bulkAddUsers(users: Array<{
    fullName: string
    mobileNumber: string
    role: UserRole
    email: string
    assignedCampus: string
    empId?: string
    childEprNo?: string
}>) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) {
        return { success: false, error: 'Unauthorized', added: 0, failed: 0 }
    }

    let added = 0
    let failed = 0
    const errors: string[] = []

    for (const userData of users) {
        try {
            // Validation
            if (!userData.assignedCampus) {
                failed++
                errors.push(`${userData.mobileNumber}: Missing campus`)
                continue
            }
            if (!userData.email) {
                failed++
                errors.push(`${userData.mobileNumber}: Missing email`)
                continue
            }
            // Role-based validation
            if (userData.role === 'Staff' && !userData.empId) {
                failed++
                errors.push(`${userData.mobileNumber}: Staff requires EMP.ID`)
                continue
            }
            if (userData.role === 'Parent' && !userData.childEprNo) {
                failed++
                errors.push(`${userData.mobileNumber}: Parent requires Student ERP No`)
                continue
            }

            if (userData.role === 'Staff' && userData.empId) {
                const existingEmp = await prisma.user.findFirst({ where: { empId: userData.empId } })
                if (existingEmp) {
                    failed++
                    errors.push(`${userData.mobileNumber}: EMP ID ${userData.empId} already exists`)
                    continue
                }
            }
            if (userData.role === 'Parent' && userData.childEprNo) {
                const existingErp = await prisma.user.findFirst({ where: { childEprNo: userData.childEprNo } })
                if (existingErp) {
                    failed++
                    errors.push(`${userData.mobileNumber}: Student ERP ${userData.childEprNo} already exists`)
                    continue
                }
            }

            const existing = await prisma.user.findUnique({
                where: { mobileNumber: userData.mobileNumber }
            })

            if (existing) {
                failed++
                errors.push(`${userData.mobileNumber}: Mobile Number already exists`)
                continue
            }

            const referralCode = await generateSmartReferralCode(userData.role)

            await prisma.user.create({
                data: {
                    fullName: userData.fullName,
                    mobileNumber: userData.mobileNumber,
                    role: userData.role,
                    email: userData.email,
                    referralCode,
                    childInAchariya: false,
                    assignedCampus: userData.assignedCampus,
                    status: 'Active',
                    yearFeeBenefitPercent: 0,
                    longTermBenefitPercent: 0,
                    confirmedReferralCount: 0,

                    isFiveStarMember: false,
                    empId: userData.empId || null,
                    childEprNo: userData.childEprNo || null
                }
            })
            added++
        } catch {
            failed++
            errors.push(`${userData.mobileNumber}: Failed to add`)
        }
    }

    return { success: true, added, failed, errors }
}

// ===================== ADD ADMIN =====================
export async function addAdmin(data: {
    adminName: string
    adminMobile: string
    role: 'Campus Head' | 'Campus Admin' | 'Admission Admin' | 'Finance Admin' | 'Super Admin'
    assignedCampus?: string | null
    password?: string
}) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Only Super Admin can add admins' }
    }

    try {
        const existing = await prisma.admin.findUnique({
            where: { adminMobile: data.adminMobile }
        })

        if (existing) {
            return { success: false, error: 'Mobile number already registered for admin' }
        }

        const password = data.password || data.adminMobile
        const hashedPassword = await bcrypt.hash(password, 10)

        const newAdmin = await prisma.admin.create({
            data: {
                adminName: data.adminName,
                adminMobile: data.adminMobile,
                role: toAdminRole(data.role),
                assignedCampus: data.assignedCampus || null,
                password: hashedPassword
            }
        })

        await logAction('CREATE', 'admin', `Created new admin: ${data.adminMobile}`, newAdmin.adminId.toString(), null, { role: data.role })

        return { success: true, admin: newAdmin }
    } catch (error) {
        console.error('Add admin error:', error)
        return { success: false, error: 'Failed to add admin' }
    }
}

export async function updateAdmin(adminId: number, data: {
    adminName?: string
    adminMobile?: string
    role?: 'Campus Head' | 'Campus Admin' | 'Admission Admin' | 'Finance Admin' | 'Super Admin'
    assignedCampus?: string
}) {
    const requester = await getCurrentUser()
    if (!requester || requester.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized: Only Super Admin can edit admins' }
    }

    try {
        const previousAdmin = await prisma.admin.findUnique({ where: { adminId } })
        if (!previousAdmin) return { success: false, error: 'Admin not found' }

        const updateData: any = {
            adminName: data.adminName,
            adminMobile: data.adminMobile,
            role: data.role ? toAdminRole(data.role) : undefined,
            assignedCampus: data.assignedCampus
        }

        // Clean undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

        const updatedAdmin = await prisma.admin.update({
            where: { adminId },
            data: updateData
        })

        await logAction('UPDATE', 'admin', `Updated admin: ${adminId}`, adminId.toString(), null, {
            previous: previousAdmin,
            next: updatedAdmin
        })

        return { success: true, admin: updatedAdmin }
    } catch (error) {
        console.error('Update admin error:', error)
        return { success: false, error: 'Failed to update admin' }
    }
}

/**
 * Deletes an administrator account. Prevents self-deletion.
 * @param adminId - ID of the admin to delete.
 * @returns Object indicating success or failure.
 */
export async function deleteAdmin(adminId: number) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Only Super Admin can delete admins' }
    }

    if ('adminId' in admin && admin.adminId === adminId) {
        return { success: false, error: 'Cannot delete yourself' }
    }

    try {
        await prisma.admin.delete({ where: { adminId } })
        await logAction('DELETE', 'admin', `Deleted admin: ${adminId}`, adminId.toString())
        return { success: true }
    } catch (error) {
        console.error('Delete admin error:', error)
        return { success: false, error: 'Failed to delete admin' }
    }
}

/**
 * Resets a user or admin's password. Super Admin only.
 */
export async function adminResetPassword(targetId: number, targetType: 'user' | 'admin', newPassword: string) {
    const admin = await getCurrentUser()
    const canReset = admin && hasModuleAccess(admin.role, 'passwordReset')

    if (!canReset || !admin) {
        return { success: false, error: 'Unauthorized: Insufficient permissions' }
    }

    // Check Data Scope
    const scope = getDataScope(admin.role, 'passwordReset')
    if (scope === 'campus' && admin.assignedCampus) {
        // Verify target belongs to same campus
        if (targetType === 'user') {
            const targetUser = await prisma.user.findUnique({
                where: { userId: targetId },
                select: { assignedCampus: true }
            })
            if (!targetUser || targetUser.assignedCampus !== admin.assignedCampus) {
                return { success: false, error: 'Unauthorized: User belongs to different campus' }
            }
        } else {
            const targetAdmin = await prisma.admin.findUnique({
                where: { adminId: targetId },
                select: { assignedCampus: true }
            })
            if (!targetAdmin || targetAdmin.assignedCampus !== admin.assignedCampus) {
                return { success: false, error: 'Unauthorized: Admin belongs to different campus' }
            }
        }
    } else if (scope === 'none') {
        return { success: false, error: 'Unauthorized: Access denied' }
    }

    if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        if (targetType === 'user') {
            await prisma.user.update({
                where: { userId: targetId },
                data: { password: hashedPassword }
            })
            await logAction('UPDATE', 'user', `Admin reset password for user ${targetId}`, targetId.toString())
        } else {
            await prisma.admin.update({
                where: { adminId: targetId },
                data: { password: hashedPassword }
            })
            await logAction('UPDATE', 'admin', `Admin reset password for admin ${targetId}`, targetId.toString())
        }

        return { success: true }
    } catch (error) {
        console.error('Admin reset password error:', error)
        return { success: false, error: 'Failed to reset password' }
    }
}


// ===================== BULK ADD ADMINS =====================
export async function bulkAddAdmins(admins: Array<{
    adminName: string
    adminMobile: string
    role: 'CampusHead' | 'CampusAdmin'
    assignedCampus: string
}>) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Only Super Admin can bulk add admins', added: 0, failed: 0 }
    }

    let added = 0
    let failed = 0
    const errors: string[] = []

    for (const adminData of admins) {
        try {
            const existing = await prisma.admin.findUnique({
                where: { adminMobile: adminData.adminMobile }
            })

            if (existing) {
                failed++
                errors.push(`${adminData.adminMobile}: Already exists`)
                continue
            }

            await prisma.admin.create({
                data: {
                    adminName: adminData.adminName,
                    adminMobile: adminData.adminMobile,
                    role: toAdminRole(adminData.role),
                    assignedCampus: adminData.assignedCampus
                }
            })
            added++
        } catch {
            failed++
            errors.push(`${adminData.adminMobile}: Failed to add`)
        }
    }

    return { success: true, added, failed, errors }
}

// ===================== UPDATE USER STATUS =====================
/**
 * Toggles a user's account status (Active/Inactive).
 * @param userId - Target user ID.
 * @param status - New status.
 * @returns Object indicating success.
 */
export async function updateUserStatus(userId: number, status: AccountStatus) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.user.update({
            where: { userId },
            data: { status }
        })
        return { success: true }
    } catch (error) {
        console.error('Update user status error:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

// ===================== UPDATE ADMIN STATUS =====================
/**
 * Toggles an administrator's account status (Active/Inactive).
 * @param adminId - Target admin ID.
 * @param status - New status.
 * @returns Object indicating success.
 */
export async function updateAdminStatus(adminId: number, status: AccountStatus) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Only Super Admin can update admin status' }
    }

    try {
        await prisma.admin.update({
            where: { adminId },
            data: { status }
        })
        return { success: true }
    } catch (error) {
        console.error('Update admin status error:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

// ===================== AUTOMATED WEEKLY KPI REPORTS =====================
/**
 * Generates a comprehensive KPI report for the last 7 days and emails it to the Super Admin.
 * This can be triggered manually or via a scheduled cron job.
 */
export async function triggerWeeklyKPIReport(email?: string) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Only Super Admin can trigger reports' }
    }

    try {
        const stats = await getSystemAnalytics('7d')
        const campusComparison = await getCampusComparison('7d')

        const reportDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })

        const htmlBody = `
            <h2>Performance Summary (Last 7 Days)</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #F9FAFB;">
                    <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: left;">Metric</th>
                    <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: right;">Value</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #E5E7EB;">Total Leads Generated</td>
                    <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">${stats.totalLeads}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #E5E7EB;">Confirmed Admissions</td>
                    <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #059669;">${stats.totalConfirmed}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #E5E7EB;">Global Conversion Rate</td>
                    <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">${stats.globalConversionRate}%</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #E5E7EB;">Referral Velocity (Leads/User)</td>
                    <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">${stats.avgLeadsPerAmbassador}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #E5E7EB;">Est. Revenue Pipeline (New)</td>
                    <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #D97706;">₹${(stats.totalEstimatedRevenue / 100000).toFixed(1)}L</td>
                </tr>
            </table>

            <h2>Campus Breakdown</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #F9FAFB;">
                    <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: left;">Campus</th>
                    <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: center;">Leads</th>
                    <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: center;">Admissions</th>
                    <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: right;">Conversion</th>
                </tr>
                ${campusComparison.slice(0, 5).map(c => `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E5E7EB;">${c.campus}</td>
                        <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: center;">${c.totalLeads}</td>
                        <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: center;">${c.confirmed}</td>
                        <td style="padding: 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">${c.conversionRate}%</td>
                    </tr>
                `).join('')}
            </table>
            <p style="text-align: right; font-size: 11px; margin-top: 10px;">Top 5 campuses by lead volume</p>
        `

        const targetEmail = email || (admin as any).adminMobile + '@mock.com' // Fallback or search in DB

        await EmailService.sendReportEmail(
            targetEmail,
            `Weekly Performance Report: ${reportDate} 📊`,
            htmlBody,
            'Weekly KPI Summary'
        )

        return { success: true }
    } catch (error) {
        console.error('Weekly report trigger error:', error)
        return { success: false, error: 'Failed to generate report' }
    }
}
