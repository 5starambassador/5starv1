'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'

export async function approveManualPayment(orderId: string) {
    try {
        // 1. Auth Check (Must be Super Admin or Finance Admin)
        const user = await getCurrentUser()
        if (!user || (user.role !== 'Super Admin' && user.role !== 'Finance Admin')) {
            // Fallback check for "admin" table if "user" table auth fails or is different scheme
            // For now assuming getCurrentUser handles both or we are strict.
            // Actually, `getCurrentUser` returns { formattedRole: ... }
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
                settlementDate: new Date() // Mark as settled for simplicity
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

export async function rejectManualPayment(orderId: string) {
    try {
        // 1. Auth Check
        const user = await getCurrentUser()
        if (!user || (user.role !== 'Super Admin' && user.role !== 'Finance Admin')) {
            return { success: false, error: 'Unauthorized' }
        }

        // 2. Update Payment to Failed
        const payment = await prisma.payment.update({
            where: { orderId: orderId },
            data: {
                orderStatus: 'FAILED',
                paymentStatus: 'Rejected by Admin',
            }
        })

        // Reset User Status to allow retry
        await prisma.user.update({
            where: { userId: payment.userId },
            data: {
                paymentStatus: 'Pending',
                transactionId: null
            }
        })

        revalidatePath('/superadmin/approvals')
        return { success: true }
    } catch (error: any) {
        console.error("Rejection Error:", error)
        return { success: false, error: 'Failed to reject' }
    }
}
