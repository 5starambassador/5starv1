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
export async function getCampusStats(days: number = 30, academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin ? {} : { campusId: access.campusId }
    const referralWhere: any = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    if (academicYear && academicYear !== 'All') {
        whereClause.academicYear = academicYear
        referralWhere.admittedYear = academicYear
    }

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

        // Audit Logging
        const logUser = user as any
        await prisma.activityLog.create({
            data: {
                adminId: logUser.adminId || (logUser.role.includes('Admin') ? logUser.userId : undefined),
                userId: !logUser.role.includes('Super') ? logUser.userId : undefined,
                action: 'UPDATE',
                module: 'CAMPUS_TARGET',
                targetId: String(access.campusId),
                description: `Updated targets for Campus ${access.campusName || access.campusId}: Leads ${leadTarget}, Admissions ${admissionTarget}`
            }
        }).catch(err => console.error('Audit Log Error:', err))

        return { success: true }
    } catch (error) {
        console.error('updateCampusTargets error:', error)
        return { success: false, error: 'Failed' }
    }
}

// --- Students ---
export async function getCampusStudents(query?: string, academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin ? {} : { campusId: access.campusId }

    if (academicYear && academicYear !== 'All') {
        whereClause.academicYear = academicYear
    }

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
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: students }
    } catch (error) {
        console.error('getCampusStudents Error:', error)
        return { error: 'Failed to fetch students' }
    }
}

// --- Referrals ---
export async function getCampusReferrals(academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    if (academicYear && academicYear !== 'All') {
        whereClause.admittedYear = academicYear
    }

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
export async function getCampusRecentActivity(academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    if (academicYear && academicYear !== 'All') {
        whereClause.admittedYear = academicYear
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

    // User model uses 'assignedCampus' string and 'campusId' Int.
    const andConditions: any[] = []

    // 1. Campus restriction (for non-Super Admin)
    if (!access.isSuperAdmin) {
        const campusName = access.campusName?.trim()
        if (campusName) {
            andConditions.push({
                OR: [
                    { campusId: access.campusId },
                    { assignedCampus: { contains: campusName, mode: 'insensitive' as const } }
                ]
            })
        } else {
            andConditions.push({
                campusId: access.campusId
            })
        }
    }

    // 2. Query search filters
    if (query) {
        andConditions.push({
            OR: [
                { fullName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { mobileNumber: { contains: query, mode: 'insensitive' } },
                { referralCode: { contains: query, mode: 'insensitive' } },
                { childEprNo: { contains: query, mode: 'insensitive' } },
                { empId: { contains: query, mode: 'insensitive' } },
                { childName: { contains: query, mode: 'insensitive' } }
            ]
        })
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {}

    try {
        const users = await prisma.user.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('getCampusUsers Error:', error)
        return { error: 'Failed to fetch users' }
    }
}

// --- Campus Finance Report Data ---
export async function getCampusFinance(days: number = 30, academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    // Calculate date filter
    const dateFilter = days === 0
        ? undefined
        : { gte: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)) }

    const yearFilter = academicYear && academicYear !== 'All' ? { admittedYear: academicYear } : {}

    // For campus-specific filtering, check both campusId and campus name string
    const whereClause: any = access.isSuperAdmin
        ? {
            leadStatus: LeadStatus.Confirmed,
            ...yearFilter,
            ...(dateFilter ? { confirmedDate: dateFilter } : { confirmedDate: { not: null } })
        }
        : {
            leadStatus: LeadStatus.Confirmed,
            ...yearFilter,
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
export async function updateLeadStatus(
    leadId: number,
    newStatus: 'New' | 'Follow-up' | 'Confirmed' | 'Rejected' | 'Closed',
    admissionDetails?: {
        admissionNumber: string
        selectedFeeType: string
        admissionFeeCollected: number
        donationFeeCollected: number
        annualFee: number
        rejectionReason?: string
    }
) {
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

        // Initialize Update Data
        const statusEnum = toLeadStatus(newStatus)
        const updateData: any = { leadStatus: statusEnum }

        if (statusEnum === LeadStatus.Confirmed) {
            const isSpecialCampus = ['ACET', 'AASC', 'ACCHM'].includes(lead.campus || '')

            // If admissionDetails provided, merge them
            const erp = admissionDetails?.admissionNumber || lead.admissionNumber
            const feeType = admissionDetails?.selectedFeeType || lead.selectedFeeType

            // Validate
            if (!erp) {
                return { error: 'Cannot confirm: ERP/Admission Number is required.' }
            }
            if (!isSpecialCampus && !feeType) {
                return { error: 'Cannot confirm: Fee Plan (OTP/WOTP) is required.' }
            }

            // Update Admission Data
            if (admissionDetails) {
                updateData.admissionNumber = admissionDetails.admissionNumber
                updateData.selectedFeeType = admissionDetails.selectedFeeType
                updateData.admissionFeeCollected = admissionDetails.admissionFeeCollected || 0
                updateData.donationFeeCollected = admissionDetails.donationFeeCollected || 0
                updateData.annualFee = admissionDetails.annualFee || 0
            }

            updateData.confirmedDate = new Date()
        } else if (newStatus === 'Rejected' || newStatus === 'Closed') {
            if (newStatus === 'Rejected' && admissionDetails?.rejectionReason) {
                updateData.rejectionReason = admissionDetails.rejectionReason
            }
        }

        await prisma.referralLead.update({
            where: { leadId },
            data: updateData
        })

        // Audit Logging
        const activeUser = access.user as any
        if (activeUser) {
            await prisma.activityLog.create({
                data: {
                    adminId: activeUser.adminId || (activeUser.role.includes('Admin') ? activeUser.userId : undefined),
                    userId: !activeUser.role.includes('Super') ? activeUser.userId : undefined,
                    action: 'UPDATE_STATUS',
                    module: 'REFERRAL_LEAD',
                    targetId: String(leadId),
                    description: `Updated lead ${leadId} status to ${newStatus}`
                }
            }).catch(err => console.error('Audit Log Error:', err))
        }

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

// --- Edit Lead Details (Campus Scoped) ---
export async function updateCampusLeadDetails(
    leadId: number,
    data: {
        studentName: string
        gradeInterested: string
        parentName: string
        parentMobile: string
    }
) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    // Strict Permission Check
    if (!await canEdit('referralTracking')) {
        return { error: 'Permission Denied' }
    }

    try {
        const lead = await prisma.referralLead.findUnique({
            where: { leadId }
        })

        if (!lead) return { error: 'Lead not found' }

        // Campus check
        if (!access.isSuperAdmin && lead.campusId !== access.campusId) {
            if (lead.campus && !lead.campus.toLowerCase().includes((access.campusName || '').toLowerCase())) {
                return { error: 'Unauthorized: Lead not in your campus' }
            }
        }

        await prisma.referralLead.update({
            where: { leadId },
            data: {
                studentName: data.studentName,
                gradeInterested: data.gradeInterested,
                parentName: data.parentName,
                parentMobile: data.parentMobile
            }
        })

        revalidatePath('/campus/referrals')
        return { success: true, message: 'Lead details updated' }
    } catch (error) {
        console.error('updateCampusLeadDetails Error:', error)
        return { error: 'Failed to update lead details' }
    }
}

// --- Ambassador Performance Report ---
export async function getCampusAmbassadorStats(academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    if (academicYear && academicYear !== 'All') {
        whereClause.admittedYear = academicYear
    }

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
export async function getCampusDeadLeads(days: number = 7, academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    if (academicYear && academicYear !== 'All') {
        whereClause.admittedYear = academicYear
    }

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

        return {
            success: true,
            data: deadLeads.map(l => ({
                ...l,
                updatedAt: l.createdAt // Fallback since schema doesn't have updatedAt
            }))
        }

    } catch (error) {
        console.error('getCampusDeadLeads Error:', error)
        return { error: 'Failed to fetch dead leads' }
    }
}

// --- Conversion Funnel Report ---
export async function getCampusConversionStats(academicYear?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin
        ? {}
        : {
            OR: [
                { campusId: access.campusId },
                { campus: { contains: access.campusName || '', mode: 'insensitive' as const } }
            ]
        }

    if (academicYear && academicYear !== 'All') {
        whereClause.admittedYear = academicYear
    }

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

// --- Daily Leaderboard Stats (War Room) ---
export async function getDailyLeaderboardStats() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        const month = todayStart.getMonth() + 1
        const year = todayStart.getFullYear()

        // 1. Get all campuses and their targets
        const campuses = await prisma.campus.findMany({
            where: { isActive: true },
            include: {
                targets: {
                    where: { month, year }
                }
            }
        })

        // 2. Get today's referrals
        const referralsToday = await prisma.referralLead.findMany({
            where: {
                createdAt: { gte: todayStart, lte: todayEnd }
            },
            include: {
                user: { select: { fullName: true, assignedCampus: true } }
            }
        })

        // 3. Get admissions done today (regardless of when they were created)
        const admissionsToday = await prisma.referralLead.findMany({
            where: {
                confirmedDate: { gte: todayStart, lte: todayEnd }
            },
            select: { leadId: true, campus: true, campusId: true, leadStatus: true }
        })

        // 4. Get Summer Camp 2026 referrals
        const summerCampPrograms = await prisma.externalProgram.findMany({
            where: { title: { contains: 'Summer Camp', mode: 'insensitive' } }
        })

        const summerCampLeads = await prisma.programLead.findMany({
            where: {
                programId: { in: summerCampPrograms.map(p => p.id) },
                clickedAt: { gte: todayStart, lte: todayEnd }
            }
        })

        // 5. Calculate branch stats
        const branchStats = campuses.map(campus => {
            const campusReferrals = referralsToday.filter(r => 
                r.campusId === campus.id || 
                (r.campus && r.campus.toLowerCase() === campus.campusName.toLowerCase())
            )
            
            const campusAdmissionsToday = admissionsToday.filter(r => 
                r.campusId === campus.id || 
                (r.campus && r.campus.toLowerCase() === campus.campusName.toLowerCase())
            ).length

            const referrals = campusReferrals.length
            const admissions = campusAdmissionsToday // Use today's admissions regardless of creation date

            const target = campus.targets[0]?.admissionTarget || 5

            // Growth calculation (last 4 hours)
            const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
            const recentReferrals = campusReferrals.filter(r => r.createdAt >= fourHoursAgo).length

            return {
                id: campus.id,
                name: campus.campusName,
                referrals,
                admissions,
                conversion: referrals > 0 ? (admissions / referrals) * 100 : 0,
                target,
                recentReferrals
            }
        })

        // Sort for leaderboard
        const leaderboard = [...branchStats].sort((a, b) => b.referrals - a.referrals)

        // 5. Star Performers Today
        const contributorMap: Record<number, { name: string, branch: string, referrals: number }> = {}
        referralsToday.forEach(r => {
            const userId = r.userId
            if (!contributorMap[userId]) {
                contributorMap[userId] = {
                    name: r.user.fullName,
                    branch: r.user.assignedCampus || 'N/A',
                    referrals: 0
                }
            }
            contributorMap[userId].referrals++
        })

        const starPerformers = Object.values(contributorMap)
            .sort((a, b) => b.referrals - a.referrals)
            .slice(0, 10)

        return {
            success: true,
            data: {
                leaderboard,
                starPerformers,
                branchStats,
                totalReferrals: referralsToday.length,
                summerCampReferrals: summerCampLeads.length,
                date: todayStart.toISOString()
            }
        }
    } catch (error) {
        console.error('getDailyLeaderboardStats Error:', error)
        return { success: false, error: 'Failed to fetch leaderboard' }
    }
}
