'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { logAction } from '@/lib/audit-logger'
import { syncUserStats } from './sync-actions'
import { revalidatePath } from 'next/cache'

/**
 * Expert Reconciliation Tool:
 * Scans the database for users who have paid but are missing student records,
 * or have pending benefits that should be active.
 */
export async function reconcileAllUsers() {
    const admin = await getCurrentUser()
    const allowedRoles = ['Super Admin', 'Finance Admin']
    if (!admin || !allowedRoles.some(r => admin.role.includes(r))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 1. Find potential candidate users
        // Users who are registered as needing a student record, have paid, but have 0 students
        const targetUsers = await prisma.user.findMany({
            where: {
                paymentStatus: 'Success',
                childInAchariya: true,
                students: { none: {} }
            },
            select: { userId: true, mobileNumber: true, fullName: true }
        })

        // 2. Find users who have confirmed referrals but might not have been synced
        const unSyncedAmbassadors = await prisma.user.findMany({
            where: {
                referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] } } },
                benefitStatus: { not: 'Active' }
            },
            select: { userId: true }
        })

        const allTargetIds = Array.from(new Set([
            ...targetUsers.map(u => u.userId),
            ...unSyncedAmbassadors.map(u => u.userId)
        ]))

        if (allTargetIds.length === 0) {
            return { success: true, count: 0, message: 'No users require reconciliation.' }
        }

        let fixedCount = 0
        const errors = []

        // 3. Process in batches
        for (const userId of allTargetIds) {
            try {
                const res = await syncUserStats(userId)
                if (res.success) {
                    fixedCount++
                } else {
                    errors.push(`User ${userId}: ${res.error}`)
                }
            } catch (err: any) {
                errors.push(`User ${userId}: ${err.message}`)
            }
        }

        await logAction('BULK_UPDATE', 'sync', `Master reconciliation fixed ${fixedCount} users. Errors: ${errors.length}`, 'System')

        revalidatePath('/finance')
        revalidatePath('/superadmin')

        return {
            success: true,
            totalFound: allTargetIds.length,
            fixedCount,
            errors: errors.slice(0, 10) // Return first 10 errors for feedback
        }

    } catch (error: any) {
        console.error('Reconciliation Master Error:', error)
        return { success: false, error: error.message }
    }
}
