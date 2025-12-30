'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'

/**
 * User requests their account to be deleted
 */
export async function requestAccountDeletion() {
    const user = await getCurrentUser()
    if (!user || !('userId' in user)) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.user.update({
            where: { userId: Number(user.userId) },
            data: {
                status: 'Deletion Requested',
                deletionRequestedAt: new Date()
            }
        })

        await logAction('UPDATE', 'user', `Account deletion requested by ${user.fullName}`, String(user.userId))
        revalidatePath('/profile')
        return { success: true }
    } catch (error) {
        console.error('Request Deletion Error:', error)
        return { success: false, error: 'Failed to request deletion' }
    }
}

/**
 * Super Admin fetches all deletion requests
 */
export async function getDeletionRequests() {
    const admin = await getCurrentUser()
    if (!admin || !('role' in admin) || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const requests = await prisma.user.findMany({
            where: { status: 'Deletion Requested' },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                role: true,
                deletionRequestedAt: true,
                referralCode: true,
                createdAt: true
            },
            orderBy: { deletionRequestedAt: 'desc' }
        })

        return { success: true, data: requests }
    } catch (error) {
        console.error('Get Deletion Requests Error:', error)
        return { success: false, error: 'Failed to fetch requests' }
    }
}

/**
 * Super Admin approves deletion (Data scrubbing / Soft delete)
 */
export async function approveDeletion(userId: number) {
    const admin = await getCurrentUser()
    if (!admin || !('role' in admin) || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // We do a "soft delete" - scrub personal data but keep the record 
        // to maintain database integrity (referrals, students linked).
        await prisma.user.update({
            where: { userId },
            data: {
                status: 'Deleted',
                fullName: 'Deleted User',
                mobileNumber: `DELETED-${userId}-${Date.now()}`, // Unique dummy number
                email: null,
                address: null,
                profileImage: null,
                bankAccountDetails: null,
                aadharNo: null,
                empId: null,
                childEprNo: null,
                password: null, // Clear password so they can't login
            }
        })

        await logAction('DELETE', 'user', `Account deletion APPROVED for user ID ${userId}`, String(userId))
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Approve Deletion Error:', error)
        return { success: false, error: 'Failed to approve deletion' }
    }
}

/**
 * Super Admin rejects deletion
 */
export async function rejectDeletion(userId: number) {
    const admin = await getCurrentUser()
    if (!admin || !('role' in admin) || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.user.update({
            where: { userId },
            data: {
                status: 'Active',
                deletionRequestedAt: null
            }
        })

        await logAction('UPDATE', 'user', `Account deletion REJECTED for user ID ${userId}`, String(userId))
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Reject Deletion Error:', error)
        return { success: false, error: 'Failed to reject deletion' }
    }
}
