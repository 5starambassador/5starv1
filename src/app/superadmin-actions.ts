'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { EmailService } from "@/lib/email-service"
import { logAction } from "@/lib/audit-logger"
import { registerSchema, mobileSchema } from "@/lib/validators"
import { z } from "zod"


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
}

interface CampusComparison {
    campus: string
    totalLeads: number
    confirmed: number
    pending: number
    conversionRate: number
    ambassadors: number
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
    if (timeRange === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateFilter = { createdAt: { gte: d } };
    } else if (timeRange === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateFilter = { createdAt: { gte: d } };
    }

    const totalAmbassadors = await prisma.user.count({ where: dateFilter })

    const totalLeads = await prisma.referralLead.count({ where: dateFilter })

    const totalConfirmed = await prisma.referralLead.count({
        where: { leadStatus: 'Confirmed', ...dateFilter }
    })

    const globalConversionRate = totalLeads > 0
        ? (totalConfirmed / totalLeads) * 100
        : 0

    // Get unique campuses
    const campuses = await prisma.referralLead.findMany({
        where: { campus: { not: null } },
        select: { campus: true },
        distinct: ['campus']
    })

    const totalCampuses = campuses.length

    // Calculate system-wide benefits (simplified)
    const users = await prisma.user.findMany({
        select: {
            studentFee: true,
            yearFeeBenefitPercent: true,
            confirmedReferralCount: true
        }
    })

    const systemWideBenefits = users.reduce((acc, user) => {
        return acc + (user.studentFee * (user.yearFeeBenefitPercent / 100) * user.confirmedReferralCount)
    }, 0)

    // User Role Distribution
    const userRoles = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: dateFilter // Apply date filter if needed, or remove if roles should be all-time
    })

    const userRoleDistribution = userRoles.map(u => ({
        name: u.role,
        value: u._count.role
    }))

    const totalStudents = await prisma.student.count()

    // Keep existing counts for backward compatibility if needed, or derive them
    const staffCount = userRoles.find(u => u.role === 'Staff')?._count.role || 0
    const parentCount = userRoles.find(u => u.role === 'Parent')?._count.role || 0

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
        userRoleDistribution
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
    if (timeRange === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateFilter = { createdAt: { gte: d } };
    } else if (timeRange === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateFilter = { createdAt: { gte: d } };
    }

    // Optimized Aggregation: Fetch all stats in parallel grouping queries
    const [totalLeadsData, confirmedData, pendingData, ambassadorData] = await Promise.all([
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
        // Prisma doesn't support 'distinct count' well in groupBy, so we use findMany distinct
        prisma.referralLead.findMany({
            where: { campus: { not: null } },
            select: { campus: true, userId: true },
            distinct: ['campus', 'userId']
        })
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
                ambassadors: 0
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
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    return users.map(u => ({
        ...u,
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

// Generate unique referral code
function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'ACH'
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
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
    role: 'Parent' | 'Staff'
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

        // Generate unique referral code
        let referralCode = generateReferralCode()
        let attempts = 0
        while (await prisma.user.findFirst({ where: { referralCode } }) && attempts < 10) {
            referralCode = generateReferralCode()
            attempts++
        }

        if (attempts >= 10) {
            return { success: false, error: 'Failed to generate unique referral code. Please try again.' }
        }

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
    assignedCampus?: string
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
            const existing = await prisma.user.findUnique({
                where: { mobileNumber: userData.mobileNumber }
            })

            if (existing) {
                failed++
                errors.push(`${userData.mobileNumber}: Already exists`)
                continue
            }

            let referralCode = generateReferralCode()
            let attempts = 0
            while (await prisma.user.findFirst({ where: { referralCode } }) && attempts < 10) {
                referralCode = generateReferralCode()
                attempts++
            }

            if (attempts >= 10) {
                failed++
                errors.push(`${userData.mobileNumber}: Failed to generate unique code`)
                continue
            }

            await prisma.user.create({
                data: {
                    fullName: userData.fullName,
                    mobileNumber: userData.mobileNumber,
                    role: userData.role,
                    referralCode,
                    childInAchariya: false,
                    assignedCampus: userData.assignedCampus || null,
                    status: 'Active',
                    yearFeeBenefitPercent: 0,
                    longTermBenefitPercent: 0,
                    confirmedReferralCount: 0,
                    isFiveStarMember: false
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
