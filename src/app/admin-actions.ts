'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'

export async function getAllReferrals() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Admin')) return []

    return await prisma.referralLead.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' }
    })
}

export async function getAdminAnalytics() {
    const user = await getCurrentUser()
    if (!user || !user.role.includes('Admin')) return null

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
        avgReferralsPerAmbassador,
        totalEstimatedValue,
        campusDistribution,
        roleBreakdown,
        statusBreakdown,
        topPerformers
    }
}

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

        // Slabs (Current Year)
        // 1->5, 2->10, 3->25 (Jump), 4->30, 5->50
        const slabs = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 };
        const yearFeeBenefit = slabs[lookupCount as keyof typeof slabs] || 0;

        // Long Term Benefit Logic
        // Prereq: Must be Five Star Member (5 referrals in previous year)
        // AND Must have at least 1 referral this year
        let longTermTotal = 0;
        const user = await prisma.user.findUnique({ where: { userId } });

        if (user?.isFiveStarMember && count >= 1) {
            // Base 15% + (5% per referral)
            // 1->20, 2->25...
            longTermTotal = 15 + (count * 5);
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
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Failed' }
    }
}

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
                campus: { select: { campusName: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, students }
    } catch (error) {
        console.error('getAdminStudents error:', error)
        return { success: false, error: 'Failed to fetch students' }
    }
}
