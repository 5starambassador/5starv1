'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth-service'

export async function getCampuses() {
    try {
        const campuses = await prisma.campus.findMany({
            include: { gradeFees: true },
            orderBy: { campusName: 'asc' }
        })
        return { success: true, campuses }
    } catch (error) {
        console.error('Error fetching campuses:', error)
        return { success: false, error: 'Failed to fetch campuses' }
    }
}

export async function addCampus(data: {
    campusName: string
    campusCode: string
    location: string
    grades: string
    maxCapacity: number
    contactEmail?: string
    contactPhone?: string
    address?: string
    gradeFees?: Array<{ grade: string; annualFee: number }>
}) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const { gradeFees, ...campusData } = data

        const campus = await prisma.campus.create({
            data: {
                ...campusData,
                isActive: true,
                gradeFees: gradeFees ? {
                    create: gradeFees
                } : undefined
            },
            include: { gradeFees: true }
        })
        return { success: true, campus }
    } catch (error: any) {
        console.error('Error adding campus:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'Campus name or code already exists' }
        }
        return { success: false, error: 'Failed to add campus' }
    }
}

export async function updateCampus(id: number, data: any) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const { gradeFees, ...campusData } = data

        // Use transaction for consistency
        await prisma.$transaction(async (tx) => {
            // Update campus basic info
            await tx.campus.update({
                where: { id },
                data: campusData
            })

            // Update grade fees if provided
            if (gradeFees && Array.isArray(gradeFees)) {
                for (const gf of gradeFees) {
                    // Standard practice: first find, then update or create
                    // This avoids composite key (campusId_grade) issues when academicYear is also part of uniqueness
                    const existingGf = await tx.gradeFee.findFirst({
                        where: { campusId: id, grade: gf.grade }
                    })

                    if (existingGf) {
                        await tx.gradeFee.update({
                            where: { id: existingGf.id },
                            data: { annualFee: gf.annualFee }
                        })
                    } else {
                        await tx.gradeFee.create({
                            data: {
                                campusId: id,
                                grade: gf.grade,
                                annualFee: gf.annualFee,
                                academicYear: '2025-2026' // Default or fetch current
                            }
                        })
                    }
                }
            }
        })

        return { success: true }
    } catch (error) {
        console.error('Error updating campus:', error)
        return { success: false, error: 'Failed to update campus' }
    }
}

export async function deleteCampus(id: number, force: boolean = false) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') {
            return { success: false, error: 'Unauthorized' }
        }

        // Check for dependencies
        const hasStudents = await prisma.student.count({
            where: { campusId: id }
        })

        if (hasStudents > 0 && !force) {
            return {
                success: false,
                error: 'Cannot delete campus: Has active students enrolled.',
                requiresForce: true
            }
        }

        const hasTargets = await prisma.campusTarget.count({
            where: { campusId: id }
        })

        // Use transaction for clean cleanup
        await prisma.$transaction(async (tx) => {
            if (hasStudents > 0 && force) {
                // Delete students first
                await tx.student.deleteMany({ where: { campusId: id } })
            }

            if (hasTargets > 0) {
                await tx.campusTarget.deleteMany({ where: { campusId: id } })
            }

            await tx.campus.delete({
                where: { id }
            })
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting campus:', error)
        if (error.code === 'P2003') {
            return { success: false, error: 'Cannot delete: Associated data exists.' }
        }
        return { success: false, error: 'Failed to delete campus' }
    }
}

export async function deleteCampuses(ids: number[], force: boolean = false) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const campusesWithStudents = await prisma.campus.findMany({
            where: {
                id: { in: ids },
                students: { some: {} }
            },
            select: { campusName: true }
        })

        if (campusesWithStudents.length > 0 && !force) {
            const names = campusesWithStudents.map(c => c.campusName).join(', ')
            return {
                success: false,
                error: `Cannot delete: The following campuses have active students: ${names}`,
                requiresForce: true
            }
        }

        await prisma.$transaction(async (tx) => {
            // 1. Force Cleanup if requested
            if (force) {
                await tx.student.deleteMany({
                    where: { campusId: { in: ids } }
                })
            }

            // 2. Cleanup dependencies (Weak entities)
            await tx.campusTarget.deleteMany({
                where: { campusId: { in: ids } }
            })

            // 3. Bulk Delete
            await tx.campus.deleteMany({
                where: { id: { in: ids } }
            })
        })

        revalidatePath('/dashboard')
        revalidatePath('/campus')

        return { success: true }
    } catch (error) {
        console.error('Error deleting campuses:', error)
        return { success: false, error: 'Failed to delete campuses' }
    }
}

// ===================== CAMPUS DASHBOARD FUNCTIONS =====================

export async function getCampusAnalytics(campusName: string) {
    const user = await getCurrentUser()
    if (!user) return null

    // Permission check: Super Admin or assigned Campus Head/Admin
    if (user.role !== 'Super Admin' && user.assignedCampus !== campusName) {
        return null
    }

    try {
        const referrals = await prisma.referralLead.findMany({
            where: { campus: campusName },
            include: { user: true }
        })

        const users = await prisma.user.findMany({
            where: { assignedCampus: campusName }
        })

        // Basic counts
        const totalLeads = referrals.length
        const confirmedLeads = referrals.filter(r => r.leadStatus === 'Confirmed').length
        const pendingLeads = totalLeads - confirmedLeads
        const conversionRate = totalLeads > 0 ? ((confirmedLeads / totalLeads) * 100).toFixed(1) : '0'

        // Ambassadors
        const totalAmbassadors = users.length

        // Total estimated savings/incentives
        const totalEstimatedValue = referrals.reduce((sum, r) => {
            const fee = r.user.studentFee || 60000
            const percent = r.user.yearFeeBenefitPercent || 0
            return sum + (fee * percent / 100)
        }, 0)

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

        // Top performers for this campus
        const userReferralCounts: Record<number, { user: any, count: number }> = {}
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
            totalLeads,
            confirmedLeads,
            pendingLeads,
            conversionRate,
            totalAmbassadors,
            totalEstimatedValue,
            roleBreakdown,
            statusBreakdown,
            topPerformers
        }
    } catch (error) {
        console.error('Error fetching campus analytics:', error)
        return null
    }
}

export async function getCampusReferrals(campusName: string) {
    const user = await getCurrentUser()
    if (!user) return []

    // Permission check
    if (user.role !== 'Super Admin' && user.assignedCampus !== campusName) {
        return []
    }

    try {
        return await prisma.referralLead.findMany({
            where: { campus: campusName },
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        })
    } catch (error) {
        console.error('Error fetching campus referrals:', error)
        return []
    }
}

export async function confirmCampusReferral(leadId: number, campusName: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Permission check
    if (user.role !== 'Super Admin' && user.assignedCampus !== campusName) {
        return { success: false, error: 'Forbidden' }
    }

    // Adapter to match existing confirmReferral logic but with revalidation for campus
    try {
        const lead = await prisma.referralLead.findUnique({
            where: { leadId },
            include: { user: true }
        })

        if (!lead) return { success: false, error: 'Lead not found' }

        await prisma.referralLead.update({
            where: { leadId },
            data: {
                leadStatus: 'Confirmed',
                confirmedDate: new Date()
            }
        })

        // Update User Counts & Benefits
        const userId = lead.userId

        // Use transaction to ensure consistency if possible, or sequential
        // Re-fetch count to be safe

        // 1. Current Year Count (NEW)
        const currentYearStart = new Date(new Date().getFullYear(), 0, 1)
        const currentYearCount = await prisma.referralLead.count({
            where: {
                userId,
                leadStatus: 'Confirmed',
                confirmedDate: { gte: currentYearStart }
            }
        })

        // 2. Lifetime Count
        const count = await prisma.referralLead.count({
            where: { userId, leadStatus: 'Confirmed' }
        })

        // Track 1: Short-term slabs for new/regular users
        // 1: 5%, 2: 10%, 3: 25%, 4: 30%, 5: 50%
        const slabs = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }
        const lookupCount = Math.min(currentYearCount, 5) // Use currentYearCount
        let yearFeeBenefit = slabs[lookupCount as keyof typeof slabs] || 0

        // Track 2: Long-term cumulative for 5-star members
        const user = await prisma.user.findUnique({ where: { userId } })
        let longTermTotal = 0

        if (user?.isFiveStarMember) {
            // DATE-BASED CUMULATIVE CALCULATION matches admin-actions.ts
            // currentYearCount already calculated

            // 2. Prior Years History (Base: 3%)
            const priorYearCount = count - currentYearCount

            // 3. Apply Formula if active this year
            if (currentYearCount >= 1) {
                const cumulativeBase = priorYearCount * 3
                const currentYearBoost = currentYearCount * 5
                longTermTotal = cumulativeBase + currentYearBoost

                if (longTermTotal > yearFeeBenefit) {
                    yearFeeBenefit = longTermTotal
                }
            }
        }

        await prisma.user.update({
            where: { userId },
            data: {
                confirmedReferralCount: count,
                yearFeeBenefitPercent: yearFeeBenefit,
                longTermBenefitPercent: longTermTotal,
                benefitStatus: count >= 1 ? 'Active' : 'Inactive',
                // Sticky 5-star flag
                isFiveStarMember: user?.isFiveStarMember || count >= 5,
                lastActiveYear: new Date().getFullYear()
            }
        })

        revalidatePath('/campus')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error confirming campus referral:', error)
        return { success: false, error: 'Failed' }
    }
}
