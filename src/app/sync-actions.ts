'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'

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
            include: { referrals: true }
        })

        if (!user) return { success: false, error: 'User not found' }

        // --- 1. SYNC AS PARENT: Check for children studying in Achariya ---
        const studentRecords = await prisma.student.findMany({
            where: {
                parent: { mobileNumber: user.mobileNumber },
                status: 'Active'
            },
            orderBy: { createdAt: 'desc' }
        })

        const hasKids = studentRecords.length > 0
        let updatedUserDetails: any = {}

        if (hasKids) {
            const latestStudent = studentRecords[0]

            // Only update fields if they were pending or missing to avoid accidental manual override
            updatedUserDetails = {
                benefitStatus: 'Active',
                childInAchariya: true,
                childEprNo: user.childEprNo || latestStudent.admissionNumber,
                childName: user.childName || latestStudent.fullName,
                grade: user.grade || latestStudent.grade,
                studentFee: user.studentFee || latestStudent.annualFee || 60000,
                status: user.status === 'Pending' ? 'Active' : user.status
            }
        }

        // --- 2. SYNC AS AMBASSADOR: Update referral counts and benefits ---
        // Find all confirmed leads where this user is the ambassador
        const confirmedLeadsCount = await prisma.referralLead.count({
            where: {
                userId: user.userId,
                leadStatus: 'Confirmed'
            }
        })

        // Fetch corresponding benefit slab
        const lookupCount = Math.min(confirmedLeadsCount, 5) // Slab logic caps at 5 for now
        const slab = await prisma.benefitSlab.findFirst({
            where: { referralCount: lookupCount }
        })

        // Default slabs if DB table is empty
        const defaultSlabs: Record<number, number> = { 0: 0, 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }
        const slabBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0)

        updatedUserDetails = {
            ...updatedUserDetails,
            confirmedReferralCount: confirmedLeadsCount,
            yearFeeBenefitPercent: slabBenefit,
            // If they have confirmed referrals, they are an Active ambassador
            benefitStatus: confirmedLeadsCount > 0 ? 'Active' : (hasKids ? 'Active' : user.benefitStatus)
        }

        // Apply Updates
        const updatedUser = await prisma.user.update({
            where: { userId: user.userId },
            data: updatedUserDetails
        })

        // --- 3. SYNC REFERRED LEADS: Update lead status if child is now active ---
        // If this user is a parent who was referred by someone, we must confirm that lead too.
        const pendingRefLeads = await prisma.referralLead.findMany({
            where: {
                parentMobile: user.mobileNumber,
                leadStatus: { not: 'Confirmed' }
            }
        })

        if (hasKids && pendingRefLeads.length > 0) {
            for (const lead of pendingRefLeads) {
                await prisma.referralLead.update({
                    where: { leadId: lead.leadId },
                    data: {
                        leadStatus: 'Confirmed',
                        confirmedDate: new Date(),
                        admissionNumber: studentRecords[0].admissionNumber,
                        studentName: studentRecords[0].fullName
                    } as any
                })

                // Recursively sync the Ambassador who referred this user
                await syncUserStats(lead.userId)
            }
        }

        await logAction(
            'UPDATE',
            'sync',
            `Synchronized stats for User ${user.mobileNumber}. Child Active: ${hasKids}. Confirmed Referrals: ${confirmedLeadsCount}.`,
            user.userId.toString(),
            null,
            { autoSync: true }
        )

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
