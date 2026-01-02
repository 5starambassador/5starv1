'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { EmailService } from "@/lib/email-service"
import { logAction } from "@/lib/audit-logger"
import { registerSchema, mobileSchema } from "@/lib/validators"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { hasModuleAccess, getDataScope } from "@/lib/permissions"
import { generateSmartReferralCode } from "@/lib/referral-service"


// Type definitions
type Campus = string
type Role = 'Staff' | 'Parent'
type LeadStatus = 'New' | 'Follow-up' | 'Confirmed'

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
    if (!user || !user.role.includes('Super Admin')) {
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

    const [
        totalAmbassadors,
        totalLeads,
        totalConfirmed,
        prevAmbassadors,
        prevLeads,
        prevConfirmed
    ] = await Promise.all([
        prisma.user.count({ where: dateFilter }),
        prisma.referralLead.count({ where: dateFilter }),
        prisma.referralLead.count({ where: { leadStatus: 'Confirmed', ...dateFilter } }),
        prevDateFilter ? prisma.user.count({ where: prevDateFilter }) : Promise.resolve(undefined),
        prevDateFilter ? prisma.referralLead.count({ where: prevDateFilter }) : Promise.resolve(undefined),
        prevDateFilter ? prisma.referralLead.count({ where: { leadStatus: 'Confirmed', ...prevDateFilter } }) : Promise.resolve(undefined),
    ])

    const globalConversionRate = totalLeads > 0
        ? (totalConfirmed / totalLeads) * 100
        : 0

    // Get unique campuses
    const campusesWithLeads = await prisma.referralLead.findMany({
        where: { campus: { not: null } },
        select: { campus: true },
        distinct: ['campus']
    })
    const totalCampuses = campusesWithLeads.length

    // Calculate system-wide benefits
    const activeUsers = await prisma.user.findMany({
        where: dateFilter,
        select: {
            studentFee: true,
            yearFeeBenefitPercent: true,
            confirmedReferralCount: true
        }
    })

    const systemWideBenefits = activeUsers.reduce((acc, u) => {
        return acc + (u.studentFee * (u.yearFeeBenefitPercent / 100) * u.confirmedReferralCount)
    }, 0)

    // Previous benefits
    let prevBenefits;
    if (prevDateFilter) {
        const prevUsers = await prisma.user.findMany({
            where: prevDateFilter,
            select: {
                studentFee: true,
                yearFeeBenefitPercent: true,
                confirmedReferralCount: true
            }
        })
        prevBenefits = prevUsers.reduce((acc, u) => {
            return acc + (u.studentFee * (u.yearFeeBenefitPercent / 100) * u.confirmedReferralCount)
        }, 0)
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
    const staffCount = userRoles.find(u => u.role === 'Staff')?._count.role || 0
    const parentCount = userRoles.find(u => u.role === 'Parent')?._count.role || 0

    // --- Phase 2: Enhanced Analytics ---
    const avgLeadsPerAmbassador = totalAmbassadors > 0
        ? Number((totalLeads / totalAmbassadors).toFixed(2))
        : 0

    const totalEstimatedRevenue = totalConfirmed * 60000 // Standard fee

    const conversionFunnel = [
        { stage: 'Site Visitors', count: totalLeads * 3 }, // Estimated from trends
        { stage: 'Total Leads', count: totalLeads },
        { stage: 'Follow-ups', count: Math.round(totalLeads * 0.6) }, // Estimated process
        { stage: 'Admissions', count: totalConfirmed }
    ]

    return {
        totalAmbassadors,
        totalLeads,
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
        prevConfirmed,
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
    if (!user || !user.role.includes('Super Admin')) {
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
    if (!user || !user.role.includes('Super Admin')) {
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
    const [totalLeadsData, confirmedData, pendingData, ambassadorData, prevLeadsData, prevConfirmedData] = await Promise.all([
        // 1. Total Leads per Campus
        prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, ...dateFilter },
            _count: { _all: true }
        }),
        // 2. Confirmed Leads per Campus
        prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, leadStatus: 'Confirmed', ...dateFilter },
            _count: { _all: true }
        }),
        // 3. Pending Leads per Campus
        prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, leadStatus: { in: ['New', 'Follow-up'] }, ...dateFilter },
            _count: { _all: true }
        }),
        // 4. Unique Ambassadors per Campus
        prisma.referralLead.findMany({
            where: { campus: { not: null } },
            select: { campus: true, userId: true },
            distinct: ['campus', 'userId']
        }),
        // 5. Previous Leads
        prevDateFilter ? prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, ...prevDateFilter },
            _count: { _all: true }
        }) : Promise.resolve([]),
        // 6. Previous Confirmed
        prevDateFilter ? prisma.referralLead.groupBy({
            by: ['campus'],
            where: { campus: { not: null }, leadStatus: 'Confirmed', ...prevDateFilter },
            _count: { _all: true }
        }) : Promise.resolve([]),
    ]);

    // Map aggregations to CampusComparison objects
    const campusMap = new Map<string, CampusComparison>();

    // Helper to get or create entry
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
                prevConfirmed: 0
            });
        }
        return campusMap.get(campus)!;
    };

    // Populate Data
    totalLeadsData.forEach(item => {
        if (item.campus) getEntry(item.campus).totalLeads = item._count._all;
    });

    confirmedData.forEach(item => {
        if (item.campus) getEntry(item.campus).confirmed = item._count._all;
    });

    pendingData.forEach(item => {
        if (item.campus) getEntry(item.campus).pending = item._count._all;
    });

    prevLeadsData.forEach(item => {
        if (item.campus) getEntry(item.campus).prevLeads = item._count._all;
    });

    prevConfirmedData.forEach(item => {
        if (item.campus) getEntry(item.campus).prevConfirmed = item._count._all;
    });

    // Count unique ambassadors manually from the distinct list
    ambassadorData.forEach(item => {
        if (item.campus) {
            const entry = getEntry(item.campus);
            entry.ambassadors += 1; // Increment count
        }
    });

    // Calculate Conversion Rates
    const comparison = Array.from(campusMap.values()).map(c => {
        c.conversionRate = c.totalLeads > 0
            ? Number(((c.confirmed / c.totalLeads) * 100).toFixed(2))
            : 0;
        return c;
    });

    // Sort by total leads descending
    return comparison.sort((a, b) => b.totalLeads - a.totalLeads)
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
            where: { assignedCampus: campusName, role: { not: 'Staff' } },
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
    if (!user || !user.role.includes('Super Admin')) {
        throw new Error('Unauthorized')
    }

    const users = await prisma.user.findMany({
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
            empId: true
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

/**
 * Retrieves all administrator records.
 * @returns Array of Admin records
 */
export async function getAllAdmins() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Super Admin')) {
        throw new Error('Unauthorized')
    }

    return await prisma.admin.findMany({
        orderBy: { createdAt: 'desc' }
    })
}

/**
 * Retrieves all registered students with parent, ambassador, and campus details.
 * @returns Array of Student records with inclusions
 */
export async function getAllStudents() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Super Admin')) {
        throw new Error('Unauthorized')
    }

    return await prisma.student.findMany({
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

    const updatedUser = await prisma.user.update({
        where: { userId },
        data: { assignedCampus: campus }
    })

    await logAction('UPDATE', 'user', `Assigned user ${userId} to campus: ${campus}`, userId.toString())

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

    const updatedAdmin = await prisma.admin.update({
        where: { adminId },
        data: {
            role,
            assignedCampus: campus
        }
    })

    await logAction('UPDATE', 'admin', `Updated admin ${adminId} role to ${role}`, adminId.toString())

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
    await prisma.referralLead.deleteMany({
        where: { userId }
    })

    return await prisma.user.delete({
        where: { userId }
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
    role: 'Parent' | 'Staff' | 'Alumni'
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

        await logAction('CREATE', 'user', `Created new user: ${data.mobileNumber}`, newUser.userId.toString(), { role: data.role })

        // Send Welcome Email
        await EmailService.sendWelcomeEmail(data.mobileNumber, data.fullName, data.role)

        return { success: true, user: newUser }
    } catch (error) {
        console.error('Add user error:', error)
        return { success: false, error: 'Failed to add user' }
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
    role: 'Parent' | 'Staff'
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

            const existing = await prisma.user.findUnique({
                where: { mobileNumber: userData.mobileNumber }
            })

            if (existing) {
                failed++
                errors.push(`${userData.mobileNumber}: Already exists`)
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
    role: 'CampusHead' | 'CampusAdmin'
    assignedCampus: string
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

        const newAdmin = await prisma.admin.create({
            data: {
                adminName: data.adminName,
                adminMobile: data.adminMobile,
                role: data.role,
                assignedCampus: data.assignedCampus
            }
        })

        await logAction('CREATE', 'admin', `Created new admin: ${data.adminMobile}`, newAdmin.adminId.toString(), { role: data.role })

        return { success: true, admin: newAdmin }
    } catch (error) {
        console.error('Add admin error:', error)
        return { success: false, error: 'Failed to add admin' }
    }
}

// ===================== DELETE ADMIN =====================
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
                    role: adminData.role,
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
export async function updateUserStatus(userId: number, status: 'Active' | 'Inactive') {
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
export async function updateAdminStatus(adminId: number, status: 'Active' | 'Inactive') {
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
