'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'
import { hasModuleAccess } from '@/lib/permissions'

export async function approveManualPayment(orderId: string) {
    try {
        // 1. Auth Check (Must have paymentApproval permission)
        const user = await getCurrentUser()
        if (!user || !require('@/lib/permissions').hasModuleAccess(user.role, 'paymentApproval')) {
            return { success: false, error: 'Unauthorized' }
        }

        // 2. Fetch Payment
        const payment = await prisma.payment.findUnique({
            where: { orderId: orderId },
            include: { user: true }
        })

        if (!payment) {
            return { success: false, error: 'Payment record not found' }
        }

        if (payment.orderStatus !== 'PENDING_APPROVAL') {
            return { success: false, error: 'Payment is not in pending state' }
        }

        // 3. Update Transaction (Atomic-ish)
        // Update Payment
        await prisma.payment.update({
            where: { orderId: orderId },
            data: {
                orderStatus: 'SUCCESS', // Standard Cashfree Success Status
                paymentStatus: 'Success',
                paidAt: new Date(),
            }
        })

        // Update User
        await prisma.user.update({
            where: { userId: payment.userId },
            data: {
                status: 'Active',
                paymentStatus: 'Success',
                paymentAmount: payment.orderAmount,
                transactionId: payment.transactionId
            }
        })

        // 4. Revalidate
        revalidatePath('/superadmin/approvals')
        revalidatePath('/superadmin/finance')
        revalidatePath('/dashboard')

        return { success: true }
    } catch (error: any) {
        console.error("Approval Error:", error)
        return { success: false, error: error.message || 'Failed to approve' }
    }
}

export async function rejectManualPayment(orderId: string, reason: string) {
    try {
        // 1. Auth Check
        const user = await getCurrentUser()
        if (!user || !require('@/lib/permissions').hasModuleAccess(user.role, 'paymentApproval')) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!reason || reason.trim().length === 0) {
            return { success: false, error: 'Reason for rejection is required' }
        }

        // 2. Update Payment to Failed with Remarks
        const payment = await prisma.payment.update({
            where: { orderId: orderId },
            data: {
                orderStatus: 'FAILED',
                paymentStatus: 'Rejected by Admin',
                adminRemarks: reason
            } as any
        })

        // Update User Status to 'Rejected' (was 'Pending') to show reason clearly
        await prisma.user.update({
            where: { userId: payment.userId },
            data: {
                paymentStatus: 'Rejected' as any, // Cast as any if enum not yet refreshed
                transactionId: null
            }
        })

        revalidatePath('/superadmin/approvals')
        revalidatePath('/complete-payment')
        return { success: true }
    } catch (error: any) {
        console.error("Rejection Error:", error)
        return { success: false, error: 'Failed to reject' }
    }
}
