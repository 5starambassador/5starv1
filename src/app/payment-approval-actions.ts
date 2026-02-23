'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { notifyReferralStatusChanged } from '@/lib/notification-helper'
import { logAction } from '@/lib/audit-logger'

export async function approveManualPayment(orderId: string) {
    try {
        // 1. Auth Check (Must have paymentApproval permission)
        const user = await getCurrentUser()
        if (!user || !(await hasPermission('paymentApproval'))) {
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

        // 3. Update Transaction (Atomic)
        await prisma.$transaction(async (tx) => {
            // Update Payment
            await tx.payment.update({
                where: { orderId: orderId },
                data: {
                    orderStatus: 'SUCCESS',
                    paymentStatus: 'Success',
                    paidAt: new Date(),
                }
            })

            // Update User
            await tx.user.update({
                where: { userId: payment.userId },
                data: {
                    status: 'Active',
                    paymentStatus: 'Success',
                    paymentAmount: payment.orderAmount,
                    transactionId: payment.transactionId
                }
            })
        })

        // 4. CRITICAL: Perform a deep-sync to ensure benefits/slabs/student-records are all in line
        const { syncUserStats } = await import('@/app/sync-actions')
        await syncUserStats(payment.userId)

        // 5. Log Action
        await logAction(
            'PAYMENT_APPROVED',
            'finance',
            `Manually approved payment of ₹${payment.orderAmount} for ${payment.user.fullName} (${payment.user.mobileNumber})`,
            orderId,
            (user as any).adminId || (user as any).userId,
            { amount: payment.orderAmount, utr: payment.transactionId }
        )

        // 5. Revalidate
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
        if (!user || !(await hasPermission('paymentApproval'))) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!reason || reason.trim().length === 0) {
            return { success: false, error: 'Reason for rejection is required' }
        }

        // 2. Fetch Payment
        const paymentData = await prisma.payment.findUnique({
            where: { orderId },
            include: { user: { select: { fullName: true, mobileNumber: true } } }
        })

        if (!paymentData) {
            return { success: false, error: 'Payment not found' }
        }

        // 3. Update Transaction (Atomic)
        await prisma.$transaction(async (tx) => {
            // Update Payment
            await tx.payment.update({
                where: { orderId: orderId },
                data: {
                    orderStatus: 'FAILED',
                    paymentStatus: 'Rejected by Admin',
                    adminRemarks: reason
                } as any
            })

            // Update User Status
            await tx.user.update({
                where: { userId: paymentData.userId },
                data: {
                    paymentStatus: 'Rejected' as any,
                    transactionId: null
                }
            })
        })

        // 4. Log Action
        await logAction(
            'PAYMENT_REJECTED',
            'finance',
            `Rejected payment for ${paymentData.user.fullName}. Reason: ${reason}`,
            orderId,
            (user as any).adminId || (user as any).userId,
            { reason }
        )

        // 5. Notify User
        const { createNotification } = await import('@/app/notification-actions')
        await createNotification({
            userId: paymentData.userId,
            title: '❌ Payment Verification Failed',
            message: `Your payment was rejected: ${reason}. Please resubmit with correct details.`,
            type: 'warning',
            link: '/complete-payment'
        })


        revalidatePath('/superadmin/approvals')
        revalidatePath('/complete-payment')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error("Rejection Error:", error)
        return { success: false, error: 'Failed to reject' }
    }
}

export async function approveBulkManualPayments(orderIds: string[]) {
    try {
        const user = await getCurrentUser()
        if (!user || !(await hasPermission('paymentApproval'))) {
            return { success: false, error: 'Unauthorized' }
        }

        let successCount = 0;
        let failCount = 0;

        // Process sequentially to reuse logic/logging, or optimize with updateMany if possible.
        // updateMany is harder because we need to update User table too based on relation.
        // So loop is safer.
        for (const id of orderIds) {
            const res = await approveManualPayment(id)
            if (res.success) successCount++
            else failCount++
        }

        revalidatePath('/superadmin/approvals')
        revalidatePath('/dashboard')
        return { success: true, message: `Approved ${successCount} payments. Failed: ${failCount}` }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function rejectBulkManualPayments(orderIds: string[], reason: string) {
    try {
        const user = await getCurrentUser()
        if (!user || !(await hasPermission('paymentApproval'))) {
            return { success: false, error: 'Unauthorized' }
        }

        let successCount = 0;
        let failCount = 0;

        for (const id of orderIds) {
            const res = await rejectManualPayment(id, reason)
            if (res.success) successCount++
            else failCount++
        }

        revalidatePath('/superadmin/approvals')
        revalidatePath('/dashboard')
        return { success: true, message: `Rejected ${successCount} payments. Failed: ${failCount}` }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function getPaymentsForExport(search?: string) {
    try {
        const user = await getCurrentUser()
        if (!user || !(await hasPermission('paymentApproval'))) {
            return { success: false, error: 'Unauthorized' }
        }

        const where: any = {
            AND: [
                {
                    OR: [
                        { orderStatus: 'PENDING_APPROVAL' },
                        { paymentStatus: 'Pending Approval' },
                        { orderStatus: 'FAILED' },
                        { paymentStatus: 'Rejected by Admin' }
                    ]
                },
                { paymentMethod: 'MANUAL_QR' }
            ]
        }

        if (search) {
            where.AND.push({
                OR: [
                    { transactionId: { contains: search, mode: 'insensitive' } },
                    { user: { fullName: { contains: search, mode: 'insensitive' } } },
                    { user: { mobileNumber: { contains: search, mode: 'insensitive' } } }
                ]
            })
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                user: {
                    select: { fullName: true, mobileNumber: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: payments }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function getRejectedPayments(search?: string) {
    try {
        const user = await getCurrentUser()
        if (!user || !(await hasPermission('paymentApproval'))) {
            return { success: false, error: 'Unauthorized' }
        }

        const where: any = {
            AND: [
                {
                    OR: [
                        { orderStatus: 'FAILED' },
                        { paymentStatus: 'Rejected by Admin' }
                    ]
                },
                { paymentMethod: 'MANUAL_QR' }
            ]
        }

        if (search) {
            where.AND.push({
                OR: [
                    { transactionId: { contains: search, mode: 'insensitive' } },
                    { user: { fullName: { contains: search, mode: 'insensitive' } } },
                    { user: { mobileNumber: { contains: search, mode: 'insensitive' } } }
                ]
            })
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                user: {
                    select: { fullName: true, mobileNumber: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        })

        return { success: true, data: payments }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
