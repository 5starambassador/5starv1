'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { EXCLUDED_FROM_SLAB } from '@/lib/reward-constants'

/**
 * Centrally synchronizes a user's status based on student records and referral leads.
 * This is the single source of truth for Parent-Ambassador-Benefit consistency.
 * 
 * @param userId - The ID of the User (Parent/Ambassador) to sync
 */
export async function syncUserStats(userId: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { referrals: true, students: true }
        })

        if (!user) return { success: false, error: 'User not found' }

        // --- 1. ACTIVATION (Standard Compliance) ---
        const hasPaid = user.paymentStatus === 'Success'
        let updatedUserDetails: any = {}

        // --- 2. SYNC AS PARENT: Check for children studying in Achariya ---
        const studentRecords = await prisma.student.findMany({
            where: {
                parentId: user.userId,
                status: 'Active'
            }
        })
        const hasKids = studentRecords.length > 0

        if (hasKids) {
            const latestStudent = studentRecords[0]
            updatedUserDetails = {
                benefitStatus: 'Active',
                childInAchariya: true,
                childEprNo: user.childEprNo || latestStudent.admissionNumber,
                childName: user.childName || latestStudent.fullName,
                grade: user.grade || latestStudent.grade,
                studentFee: user.studentFee || latestStudent.annualFee || 60000,
                // SELF-HEALING: Only move from Pending to Active if financial obligation is met
                status: (user.status === 'Pending' && hasPaid) ? 'Active' : user.status
            }
        }

        // --- 3. SYNC AS AMBASSADOR: Update referral counts and benefits ---
        const confirmedLeadsCount = await prisma.referralLead.count({
            where: {
                userId: user.userId,
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                campus: { notIn: EXCLUDED_FROM_SLAB }
            }
        })

        // Fetch corresponding benefit slab
        const lookupCount = Math.min(confirmedLeadsCount, 5)
        const slab = await prisma.benefitSlab.findFirst({
            where: { referralCount: lookupCount }
        })

        const defaultSlabs: Record<number, number> = { 0: 0, 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }
        const slabBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0)

        // ELITE UPGRADE LOGIC: Determine 5-Star status (Excludes special campuses)
        // Note: confirmedLeadsCount ALREADY excludes EXCLUDED_FROM_SLAB based on the query at line 51
        const nonSpecialConfirmedCount = confirmedLeadsCount

        updatedUserDetails = {
            ...updatedUserDetails,
            confirmedReferralCount: confirmedLeadsCount,
            yearFeeBenefitPercent: slabBenefit,
            benefitStatus: confirmedLeadsCount > 0 ? 'Active' : (hasKids ? 'Active' : user.benefitStatus),
            // ELITE UPGRADE: Auto-flag as 5-Star Member upon reaching milestone
            isFiveStarMember: user.isFiveStarMember || nonSpecialConfirmedCount >= 5
        }

        // Apply Updates
        const updatedUser = await prisma.user.update({
            where: { userId: user.userId },
            data: updatedUserDetails
        })

        // --- 4. RELOAD DATA (Auto-Sync Removed as per policy) ---

        return { success: true, user: updatedUser }

    } catch (error: any) {
        console.error('Error in syncUserStats:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Utility to revalidate all dashboard-related paths
 */
export async function revalidateDashboard() {
    revalidatePath('/superadmin')
    revalidatePath('/superadmin/users')
    revalidatePath('/superadmin/students')
    revalidatePath('/superadmin/verification')
    revalidatePath('/dashboard')
    revalidatePath('/profile')
    revalidatePath('/students')
    revalidatePath('/campus')
}
