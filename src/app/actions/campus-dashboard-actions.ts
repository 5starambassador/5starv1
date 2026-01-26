'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { canEdit, hasPermission } from '@/lib/permission-service'
import { LeadStatus } from '@prisma/client'
import { toLeadStatus } from '@/lib/enum-utils'

// --- Helper: Verify Campus Admin Access ---
async function verifyCampusAccess() {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    // Role check: "CampusHead" is the schema value, "Campus Admin" might be used in UI
    // Role check: Allow "CampusHead", "Campus Head", "Campus Admin"
    if (!user.role.includes('Campus') && user.role !== 'Super Admin') {
        return { error: 'Access Denied: Campus Admin Role Required' }
    }

    if (user.role === 'Super Admin') {
        return { user, campusId: undefined, isSuperAdmin: true }
    }

    // For Campus Admin, we need their assigned campus
    if (!user.assignedCampus) {
        return { error: 'No Campus Assigned to your account' }
    }

    // Resolve campusId from the string name
    const campus = await prisma.campus.findUnique({
        where: { campusName: user.assignedCampus }
    })

    if (!campus) {
        return { error: `Assigned Campus '${user.assignedCampus}' not found in system` }
    }

    return { user, campusId: campus.id, isSuperAdmin: false, campusName: campus.campusName }
}

// --- Stats ---
export async function getCampusStats(days: number = 30) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }
    const referralWhere = access.isSuperAdmin ? {} : { campusId: access.campusId }

    // Calculate date filter
    const dateFilter = days === 0
        ? undefined
        : { gte: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)) }

    const prevDateFilter = days === 0
        ? undefined
        : {
            gte: new Date(Date.now() - (days * 2 * 24 * 60 * 60 * 1000)),
            lt: new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
        }

    try {
        const [
            totalStudents,
            periodLeads,
            leadsNew,
            leadsFollowup,
            leadsConfirmed,
            prevPeriodLeads,
            prevLeadsConfirmed
        ] = await Promise.all([
            prisma.student.count({ where: whereClause }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                }
            }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    leadStatus: LeadStatus.New,
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                }
            }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    leadStatus: LeadStatus.Follow_up,
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                }
            }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    leadStatus: LeadStatus.Confirmed,
                    ...(dateFilter ? { confirmedDate: dateFilter } : { confirmedDate: { not: null } })
                }
            }),
            // Comparison data
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    ...(prevDateFilter ? { createdAt: prevDateFilter } : {})
                }
            }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    leadStatus: LeadStatus.Confirmed,
                    ...(prevDateFilter ? { confirmedDate: prevDateFilter } : { confirmedDate: { not: null } })
                }
            })
        ])

        return {
            success: true,
            stats: {
                totalStudents,
                newReferrals: periodLeads,
                pendingAdmissions: leadsNew + leadsFollowup,
                confirmedAdmissions: leadsConfirmed,
                leadsNew,
                leadsFollowup,
                leadsConfirmed,
                // Comparison metrics
                prevNewReferrals: prevPeriodLeads,
                prevConfirmedAdmissions: prevLeadsConfirmed
            }
        }
    } catch (error) {
        console.error('getCampusStats Error:', error)
        return { error: 'Failed to fetch stats' }
    }
}

export async function getCampusTargets() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    try {
        const target = await prisma.campusTarget.findUnique({
            where: {
                campusId_month_year: {
                    campusId: access.campusId || 0,
                    month,
                    year
                }
            }
        })
        return { success: true, target }
    } catch (error) {
        console.warn('Targets not found or error:', error)
        return { success: false }
    }
}

export async function updateCampusTargets(leadTarget: number, admissionTarget: number) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Logic: Only Super Admin or someone with settings access can change targets
    if (user.role !== 'Super Admin' && !await hasPermission('settings')) {
        return { success: false, error: 'Permission Denied: Cannot update targets' }
    }

    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    try {
        await prisma.campusTarget.upsert({
            where: {
                campusId_month_year: {
                    campusId: access.campusId || 0,
                    month,
                    year
                }
            },
            update: { leadTarget, admissionTarget },
            create: {
                campusId: access.campusId || 0,
                month,
                year,
                leadTarget,
                admissionTarget
            }
        })
        return { success: true }
    } catch (error) {
        console.error('updateCampusTargets error:', error)
        return { success: false, error: 'Failed' }
    }
}

// --- Students ---
export async function getCampusStudents(query?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin ? {} : { campusId: access.campusId }

    if (query) {
        whereClause.OR = [
            { fullName: { contains: query, mode: 'insensitive' } },
            { rollNumber: { contains: query, mode: 'insensitive' } },
        ]
    }

    try {
        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                parent: { select: { fullName: true, mobileNumber: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Increased from 50 to show more history
        })
        return { success: true, data: students }
    } catch (error) {
        console.error('getCampusStudents Error:', error)
        return { error: 'Failed to fetch students' }
    }
}

// --- Referrals ---
export async function getCampusReferrals() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }

    try {
        const referrals = await prisma.referralLead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { fullName: true, role: true } } } // Referred By
        })
        return { success: true, data: referrals }
    } catch (error) {
        console.error('getCampusReferrals Error:', error)
        return { error: 'Failed to fetch referrals' }
    }
}

// --- Recent Activity Feed ---
export async function getCampusRecentActivity() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    try {
        // Get recent referrals (last 10)
        const recentLeads = await prisma.referralLead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 50, // Increased from 10 to show more history
            include: { user: { select: { fullName: true } } }
        })

        // Get recent confirmations
        const recentConfirmations = await prisma.referralLead.findMany({
            where: { ...whereClause, leadStatus: LeadStatus.Confirmed, confirmedDate: { not: null } },
            orderBy: { confirmedDate: 'desc' },
            take: 5,
            include: { user: { select: { fullName: true } } }
        })

        // Build activity feed
        const activities = [
            ...recentLeads.map(lead => ({
                type: 'new_lead',
                message: `New lead: ${lead.studentName || lead.parentName}`,
                by: lead.user?.fullName,
                time: lead.createdAt
            })),
            ...recentConfirmations.map(lead => ({
                type: 'confirmed',
                message: `Admission confirmed: ${lead.studentName || lead.parentName}`,
                by: lead.user?.fullName,
                time: lead.confirmedDate
            }))
        ]

        // Sort by time and take top 10
        activities.sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())

        return { success: true, data: activities.slice(0, 50) }
    } catch (error) {
        console.error('getCampusRecentActivity Error:', error)
        return { error: 'Failed to fetch recent activity' }
    }
}

// --- Users ---
export async function getCampusUsers(query?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    // User model uses 'assignedCampus' string.
    // If Super Admin, fetch all. If Campus Admin, fetch where assignedCampus == campusName
    const whereClause: any = access.isSuperAdmin
        ? {}
        : { assignedCampus: access.campusName }

    // Ensure we don't fetch users with no assigned campus if we are strictly looking for campus users,
    // although for Super Admin it's fine.
    // Also, usually we filter by Role or other criteria, but "User Management" implies all users in that campus.

    if (query) {
        whereClause.OR = [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { mobileNumber: { contains: query, mode: 'insensitive' } },
            { referralCode: { contains: query, mode: 'insensitive' } }
        ]
    }

    try {
        const users = await prisma.user.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 1000 // Increased from 50 to ensure diverse roles (Staff, etc.) are included
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('getCampusUsers Error:', error)
        return { error: 'Failed to fetch users' }
    }
}

// --- Campus Finance Report Data ---
export async function getCampusFinance(days: number = 30) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    // Calculate date filter
    const dateFilter = days === 0
        ? undefined
        : { gte: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)) }

    // For campus-specific filtering, check both campusId and campus name string
    const whereClause = access.isSuperAdmin
        ? {
            leadStatus: LeadStatus.Confirmed,
            ...(dateFilter ? { confirmedDate: dateFilter } : { confirmedDate: { not: null } })
        }
        : {
            leadStatus: LeadStatus.Confirmed,
            ...(dateFilter ? { confirmedDate: dateFilter } : { confirmedDate: { not: null } }),
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    try {
        // Get all referrals with ambassador info for finance calculation
        const referrals = await prisma.referralLead.findMany({
            where: whereClause,
            include: {
                user: { select: { fullName: true, role: true, yearFeeBenefitPercent: true } },
                student: { select: { baseFee: true } }
            }
        })

        // Calculate estimated benefits per referral
        const financeData = referrals.map(r => {
            const baseFee = r.student?.baseFee || 150000 // Default base fee
            const benefitPercent = r.user?.yearFeeBenefitPercent || 5
            const estimatedBenefit = (baseFee * benefitPercent) / 100

            return {
                ambassadorName: r.user?.fullName || 'Unknown',
                role: r.user?.role || 'Unknown',
                studentName: r.studentName || 'N/A',
                parentName: r.parentName,
                baseFee: baseFee,
                benefitPercent: benefitPercent,
                estimatedBenefit: estimatedBenefit,
                status: r.leadStatus,
                confirmedDate: r.confirmedDate
            }
        })

        const totalBenefits = financeData.reduce((sum, r) => sum + r.estimatedBenefit, 0)

        return {
            success: true,
            data: financeData,
            summary: {
                totalConfirmed: referrals.length,
                totalBenefits,
                campusName: access.campusName || 'All Campuses'
            }
        }
    } catch (error) {
        console.error('getCampusFinance Error:', error)
        return { error: 'Failed to fetch finance data' }
    }
}

// --- Update Lead Status ---
export async function updateLeadStatus(leadId: number, newStatus: 'New' | 'Follow-up' | 'Confirmed') {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    // Strict Permission Check
    if (!await canEdit('referralTracking')) {
        return { error: 'Permission Denied: You do not have edit rights for leads' }
    }

    try {
        // Verify the lead belongs to this campus
        const lead = await prisma.referralLead.findUnique({
            where: { leadId },
            include: { user: true }
        })

        if (!lead) {
            return { error: 'Lead not found' }
        }

        // Campus check (unless Super Admin)
        if (!access.isSuperAdmin && lead.campusId !== access.campusId) {
            // Also check by campus name string
            if (lead.campus && !lead.campus.toLowerCase().includes((access.campusName || '').toLowerCase())) {
                return { error: 'This lead does not belong to your campus' }
            }
        }

        // Update the lead status
        const statusEnum = toLeadStatus(newStatus)
        const updateData: any = { leadStatus: statusEnum }
        if (statusEnum === LeadStatus.Confirmed) {
            updateData.confirmedDate = new Date()
        }

        await prisma.referralLead.update({
            where: { leadId },
            data: updateData
        })

        // If confirming, also update the ambassador's count and benefits
        if (statusEnum === LeadStatus.Confirmed) {
            const userId = lead.userId
            const count = await prisma.referralLead.count({
                where: { userId, leadStatus: LeadStatus.Confirmed }
            })

            // Get benefit slab
            const lookupCount = Math.min(count, 5)
            const slab = await prisma.benefitSlab.findFirst({
                where: { referralCount: lookupCount }
            })

            const defaultSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }
            const yearFeeBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0)

            await prisma.user.update({
                where: { userId },
                data: {
                    confirmedReferralCount: count,
                    yearFeeBenefitPercent: yearFeeBenefit,
                    benefitStatus: count >= 1 ? 'Active' : 'Inactive',
                    lastActiveYear: 2025
                }
            })
        }

        revalidatePath('/campus/referrals')
        revalidatePath('/campus')

        return { success: true, message: `Lead status updated to ${newStatus}` }
    } catch (error) {
        console.error('updateLeadStatus Error:', error)
        return { error: 'Failed to update lead status' }
    }
}

// --- Ambassador Performance Report ---
export async function getCampusAmbassadorStats() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }

    try {
        // Fetch all referrals for this campus to aggregate
        const referrals = await prisma.referralLead.findMany({
            where: whereClause,
            include: { user: { select: { userId: true, fullName: true, role: true, mobileNumber: true } } }
        })

        // Aggregate by User
        const statsMap = new Map<number, {
            ambassadorName: string,
            role: string,
            mobile: string,
            totalLeads: number,
            confirmedLeads: number,
            pendingLeads: number,
            lastActive: Date
        }>()

        referrals.forEach(ref => {
            const userId = ref.userId
            if (!statsMap.has(userId)) {
                statsMap.set(userId, {
                    ambassadorName: ref.user?.fullName || 'Unknown',
                    role: ref.user?.role || 'Unknown',
                    mobile: ref.user?.mobileNumber || '-',
                    totalLeads: 0,
                    confirmedLeads: 0,
                    pendingLeads: 0,
                    lastActive: new Date(0) // Epoch
                })
            }

            const stat = statsMap.get(userId)!
            stat.totalLeads++
            if (ref.leadStatus === LeadStatus.Confirmed) stat.confirmedLeads++
            if (ref.leadStatus === LeadStatus.New || ref.leadStatus === LeadStatus.Follow_up) stat.pendingLeads++
            if (new Date(ref.createdAt) > stat.lastActive) stat.lastActive = new Date(ref.createdAt)
        })

        // Convert to Array & Sort by Confirmed Count (Desc), then Total Leads
        const performanceData = Array.from(statsMap.values()).sort((a, b) => {
            if (b.confirmedLeads !== a.confirmedLeads) return b.confirmedLeads - a.confirmedLeads
            return b.totalLeads - a.totalLeads
        })

        return { success: true, data: performanceData }

    } catch (error) {
        console.error('getCampusAmbassadorStats Error:', error)
        return { error: 'Failed to fetch ambassador stats' }
    }
}

// --- Dead Leads Report (Action Required) ---
export async function getCampusDeadLeads(days: number = 7) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }

    // Dead Lead Definition: Status is NOT 'Confirmed' or 'Closed' or 'Rejected'
    // AND createdAt is older than X days (Schema doesn't have updatedAt for ReferralLead yet)
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

    try {
        const deadLeads = await prisma.referralLead.findMany({
            where: {
                ...whereClause,
                leadStatus: {
                    notIn: [LeadStatus.Confirmed, LeadStatus.Closed, LeadStatus.Rejected, LeadStatus.Admitted]
                },
                createdAt: { lt: cutoffDate }
            },
            include: { user: { select: { fullName: true, mobileNumber: true } } },
            orderBy: { createdAt: 'asc' } // Oldest first (most urgent)
        })

        return { success: true, data: deadLeads }

    } catch (error) {
        console.error('getCampusDeadLeads Error:', error)
        return { error: 'Failed to fetch dead leads' }
    }
}

// --- Conversion Funnel Report ---
export async function getCampusConversionStats() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }

    try {
        // Group by Status
        const statusGroups = await prisma.referralLead.groupBy({
            by: ['leadStatus'],
            where: whereClause,
            _count: { leadId: true }
        })

        // Format for UI
        const funnelData = statusGroups.map(group => ({
            status: group.leadStatus,
            count: group._count.leadId
        }))

        // Sort roughly by funnel stage
        const funnelOrder = [LeadStatus.New, LeadStatus.Interested, LeadStatus.Contacted, LeadStatus.Follow_up, LeadStatus.Confirmed, LeadStatus.Admitted, LeadStatus.Closed, LeadStatus.Rejected]
        funnelData.sort((a, b) => funnelOrder.indexOf(a.status) - funnelOrder.indexOf(b.status))

        return { success: true, data: funnelData }

    } catch (error) {
        console.error('getCampusConversionStats Error:', error)
        return { error: 'Failed to fetch conversion stats' }
    }
}
