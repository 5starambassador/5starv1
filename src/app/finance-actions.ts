'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'
import cashfree from '@/lib/cashfree'
import { decrypt } from '@/lib/encryption'

// --- Registration Transactions ---

export async function getRegistrationTransactions(filter: 'All' | 'Recent' = 'All') {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        // Build where clause
        const where: any = {
            OR: [
                { paymentStatus: 'Completed' },
                { transactionId: { not: null } }
            ]
        }

        // Campus Head restriction
        if (admin.role.includes('Campus') && (admin as any).campusId) {
            where.campusId = (admin as any).campusId
        }

        const transactions = await prisma.user.findMany({
            where,
            select: {
                userId: true,
                fullName: true,
                role: true,
                mobileNumber: true,
                paymentAmount: true,
                transactionId: true,
                createdAt: true,
                assignedCampus: true,
                referralCode: true,
                campusId: true,
                // New Finance Fields (Payment Table)
                // @ts-ignore: Payment property exists but IDE cache is stale
                payments: {
                    select: {
                        paymentMethod: true,
                        transactionId: true, // Use this for UTR if not in User
                        bankReference: true,
                        paidAt: true,
                        settlementDate: true,
                        adminRemarks: true
                    },
                    where: { paymentStatus: 'Success' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' },
            take: filter === 'Recent' ? 10 : 1000
        })

        // Manual populate campusName since relation is missing in schema
        const campusIds = transactions.map(t => t.campusId).filter(Boolean) as number[]
        const uniqueCampusIds = Array.from(new Set(campusIds))

        const campuses = await prisma.campus.findMany({
            where: { id: { in: uniqueCampusIds } },
            select: { id: true, campusName: true }
        })

        const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

        const mappedTransactions = transactions.map(t => ({
            ...t,
            campus: t.campusId ? { campusName: campusMap.get(t.campusId) || '' } : undefined
        }))

        return { success: true, data: mappedTransactions }
    } catch (error) {
        console.error('Error fetching registration transactions:', error)
        return { success: false, error: 'Failed to fetch transactions' }
    }
}

// AUTO-SYNC UPDATE: 'force' param allows lightweight check on load vs heavy check on button click
export async function syncMissingPayments(force: boolean = false) {
    const admin = await getCurrentUser()
    const allowedRoles = ['Super Admin', 'Finance Admin']
    if (!admin || !allowedRoles.some(r => admin.role.includes(r))) {
        return { success: false, error: 'Unauthorized' }
    }

    if (!cashfree) {
        console.error('Sync Error: Cashfree SDK not initialized')
        return { success: false, error: 'Cashfree SDK not initialized. Check server environment variables.' }
    }

    try {
        let whereClause: any = { orderId: { not: '' } }

        if (force) {
            // FORCE MODE: Last 50 relevant orders, ignore status, just excluding explicitly failed ones to be safe
            whereClause.NOT = { paymentStatus: 'FAILED' }
        } else {
            // SMART MODE: Only target records that look "broken"
            whereClause.OR = [
                // Case 1: Amount is zero or missing
                { paymentAmount: { equals: 0 } },
                { paymentAmount: null },
                // Case 2: Transaction ID is missing
                { transactionId: null },
                // Case 3: Stuck in "Pending" despite having an orderId
                { paymentStatus: { in: ['PENDING', 'Pending'] } },
                { paymentStatus: null }
            ]
            // We still exclude explicitly failed ones
            whereClause.NOT = { paymentStatus: 'FAILED' }
        }

        // @ts-ignore: Payment property exists but IDE cache is stale
        const targetPayments = await prisma.payment.findMany({
            where: whereClause,
            take: force ? 50 : 20, // Smart sync takes fewer to be lighter
            orderBy: { createdAt: 'desc' }
        })

        if (targetPayments.length === 0) {
            return { success: true, count: 0, message: 'All payments are up to date.' }
        }

        let updatedCount = 0

        for (const payment of targetPayments) {
            try {
                // 2. Fetch from Cashfree
                const response = await cashfree.PGOrderFetchPayments(payment.orderId)
                const cfPayments = response.data
                const successPayment = cfPayments?.find((p: any) => p.payment_status === "SUCCESS")

                if (successPayment) {
                    const txId = successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : undefined
                    const method = successPayment.payment_group
                    const bankRef = successPayment.bank_reference
                    const paidAt = successPayment.payment_completion_time ? new Date(successPayment.payment_completion_time) : new Date()
                    const amount = Number(successPayment.payment_amount || payment.orderAmount || 0)

                    // 3. Update Payment record
                    // @ts-ignore: Payment property exists but IDE cache is stale
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            paymentStatus: 'Success', // Normalize to mixed case
                            transactionId: txId,
                            paymentMethod: method,
                            bankReference: bankRef,
                            paidAt: paidAt,
                            gatewayResponse: successPayment as any
                        }
                    })

                    // 4. Update User record (for table fallback/sync)
                    await prisma.user.update({
                        where: { userId: payment.userId },
                        data: {
                            paymentStatus: 'Success',
                            transactionId: txId,
                            paymentAmount: amount
                        }
                    })

                    updatedCount++
                }

                // Add a small delay to avoid Cashfree rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            } catch (err: any) {
                console.error(`Failed to sync order ${payment.orderId}:`, err?.message || err)
            }
        }

        revalidatePath('/finance')
        return {
            success: true,
            count: updatedCount,
            message: `Successfully synced ${updatedCount} payments from Cashfree.`
        }
    } catch (error: any) {
        console.error('Master Sync Error:', error)
        return { success: false, error: `Synchronization failed: ${error?.message || 'Unknown error'}` }
    }
}


export async function getSettlements(status: string = 'Pending') {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const whereClause: any = {}
        if (status !== 'All') {
            whereClause.status = status
        }

        // Campus Head restriction
        if (user.role.includes('Campus') && (user as any).campusId) {
            const userIdList = await prisma.user.findMany({
                where: { campusId: (user as any).campusId },
                select: { userId: true }
            })
            const userIds = userIdList.map(u => u.userId)
            whereClause.userId = { in: userIds }
        }

        const settlements = await prisma.settlement.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        fullName: true,
                        role: true,
                        mobileNumber: true,
                        bankAccountDetails: true,
                        bankName: true,
                        accountNumber: true,
                        ifscCode: true,
                        referralCode: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Decrypt bank details before returning
        // Prefer the new individual fields if fully present, otherwise fallback to legacy encrypted blob
        const decryptedSettlements = settlements.map(s => {
            const hasNewDetails = s.user.bankName && s.user.accountNumber && s.user.ifscCode

            // Construct a display string for backward compatibility or ease of use in UI
            let bankDetailsStr = ''
            if (hasNewDetails) {
                bankDetailsStr = `${s.user.bankName} - ${s.user.accountNumber} (${s.user.ifscCode})`
            } else if (s.user.bankAccountDetails) {
                bankDetailsStr = decrypt(s.user.bankAccountDetails) || ''
            }

            return {
                ...s,
                user: {
                    ...s.user,
                    bankAccountDetails: bankDetailsStr, // Keep compatibility with UI that expects this string
                    // Also pass raw fields if needed by new UI logic
                    bankName: s.user.bankName,
                    accountNumber: s.user.accountNumber,
                    ifscCode: s.user.ifscCode
                }
            }
        })

        return { success: true, data: decryptedSettlements }
    } catch (error) {
        console.error('Get Settlements Error:', error)
        return { success: false, error: 'Failed to fetch settlements' }
    }
}

export async function getFinanceStats() {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const whereSettlement: any = {}
        const whereUser: any = {
            OR: [
                { paymentStatus: 'Completed' },
                { transactionId: { not: null } }
            ]
        }

        if (admin.role.includes('Campus') && (admin as any).campusId) {
            // Fetch users in this campus to filter settlements
            const campusUsers = await prisma.user.findMany({
                where: { campusId: (admin as any).campusId },
                select: { userId: true }
            })
            const userIds = campusUsers.map(u => u.userId)
            whereSettlement.userId = { in: userIds }
            whereUser.campusId = (admin as any).campusId
        }

        const [pending, processedCount, totalCount, revenueAgg] = await Promise.all([
            prisma.settlement.aggregate({
                where: { status: 'Pending', ...whereSettlement },
                _sum: { amount: true }
            }),
            prisma.settlement.aggregate({
                where: { status: 'Processed', ...whereSettlement },
                _sum: { amount: true }
            }),
            prisma.settlement.count({ where: whereSettlement }),
            prisma.user.aggregate({
                where: whereUser,
                _sum: { paymentAmount: true }
            })
        ])

        return {
            success: true,
            stats: {
                pending: pending._sum.amount || 0,
                processed: processedCount._sum.amount || 0,
                totalCount,
                totalRevenue: revenueAgg._sum.paymentAmount || 0
            }
        }
    } catch (error) {
        return { success: false, error: 'Failed to fetch stats' }
    }
}

export async function processPayout(settlementId: number, transactionId: string, remarks?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Update Settlement
        const settlement = await prisma.settlement.update({
            where: { id: settlementId },
            data: {
                status: 'Processed',
                bankReference: transactionId,
                remarks: remarks || 'Processed via Admin Portal',
                processedBy: Number(admin.userId), // explicit casting if needed, though schema might use adminId differently.
                // Note: Schema has processedBy as Int? - assuming it links to user ID for now.
                payoutDate: new Date()
            },
            include: { user: true }
        })

        // 2. Check if this is a registration fee refund
        const isRefund = (settlement.remarks || '').toLowerCase().includes('refund')

        if (isRefund) {
            // Find the user's registration payment and mark it as refunded
            const registrationPayment = await prisma.payment.findFirst({
                where: {
                    userId: settlement.userId,
                    orderStatus: 'SUCCESS',
                    orderAmount: 25 // Registration fee amount
                },
                orderBy: { createdAt: 'asc' } // Get the first/oldest payment
            })

            if (registrationPayment) {
                await prisma.payment.update({
                    where: { id: registrationPayment.id },
                    data: {
                        adminRemarks: `REFUNDED via Settlement #${settlementId} on ${new Date().toISOString()} | Ref: ${transactionId} | ${settlement.remarks || ''}`
                    }
                })
            }
        }

        // 3. Log Action
        await logAction('UPDATE', 'finance', `Processed payout of ₹${settlement.amount} for ${settlement.user.fullName}`, String(settlementId))

        // 4. Create In-App Notification
        await prisma.notification.create({
            data: {
                userId: settlement.userId,
                title: isRefund ? '💰 Refund Processed' : 'Payment Processed',
                message: isRefund
                    ? `Your registration fee refund of ₹${settlement.amount.toLocaleString()} has been processed.`
                    : `Your payout of ₹${settlement.amount.toLocaleString()} has been processed. transaction Ref: ${transactionId}`,
                type: isRefund ? 'success' : 'payment',
                link: '/finance'
            }
        })

        // 5. Send Email
        if (settlement.user.email) {
            await EmailService.sendPaymentConfirmation(
                settlement.user.email,
                settlement.user.fullName,
                settlement.amount,
                transactionId
            )
        }

        revalidatePath('/finance')
        return { success: true, message: 'Payout processed successfully' }
    } catch (error: any) {
        console.error('Process Payout Error:', error)
        return { success: false, error: error.message || 'Failed to process payout' }
    }
}

// Check for existing UTRs in database
export async function checkExistingUTRs(utrs: string[]) {
    'use server'
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized', existing: [] }

    try {
        const existing = await prisma.settlement.findMany({
            where: {
                bankReference: { in: utrs, not: null }
            },
            select: {
                bankReference: true,
                id: true,
                user: { select: { fullName: true } }
            }
        })

        return {
            success: true,
            existing: existing.map(s => ({
                utr: s.bankReference,
                settlementId: s.id,
                userName: s.user.fullName
            }))
        }
    } catch (error: any) {
        console.error('Check UTR Error:', error)
        return { success: false, error: error.message, existing: [] }
    }
}

export async function processBulkPayouts(payouts: { id: number, transactionId: string, remarks?: string }[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        let successCount = 0
        let failureCount = 0
        const errors: string[] = []

        // Validate for duplicate UTRs before processing
        const utrs = payouts.map(p => p.transactionId).filter(Boolean)
        const duplicatesInBatch = utrs.filter((utr, index) => utrs.indexOf(utr) !== index)

        if (duplicatesInBatch.length > 0) {
            return {
                success: false,
                error: `Duplicate UTRs found in CSV: ${[...new Set(duplicatesInBatch)].join(', ')}`,
                processed: 0,
                failed: payouts.length
            }
        }

        // Check against existing database records
        const existingCheck = await checkExistingUTRs(utrs)
        if (existingCheck.existing && existingCheck.existing.length > 0) {
            const duplicateList = existingCheck.existing
                .map(e => `${e.utr} (Settlement #${e.settlementId} - ${e.userName})`)
                .join(', ')
            return {
                success: false,
                error: `UTRs already exist in database: ${duplicateList}`,
                processed: 0,
                failed: payouts.length
            }
        }

        const results: { id: number, transactionId: string, status: 'Success' | 'Failed', message: string }[] = []

        // Process each payout
        for (const p of payouts) {
            try {
                // Check if already processed to avoid double processing
                const existing = await prisma.settlement.findUnique({ where: { id: p.id } })
                if (!existing || existing.status === 'Processed') {
                    failureCount++
                    const msg = `Settlement #${p.id}: Already processed or not found`
                    errors.push(msg)
                    results.push({ id: p.id, transactionId: p.transactionId, status: 'Failed', message: msg })
                    continue
                }

                await prisma.settlement.update({
                    where: { id: p.id },
                    data: {
                        status: 'Processed',
                        bankReference: p.transactionId,
                        remarks: p.remarks || 'Bulk Processed via CSV',
                        processedBy: Number(admin.userId),
                        payoutDate: new Date()
                    }
                })

                await prisma.notification.create({
                    data: {
                        userId: existing.userId,
                        title: 'Payment Processed',
                        message: `Your payout of ₹${existing.amount.toLocaleString()} has been processed. Ref: ${p.transactionId}`,
                        type: 'payment',
                        link: '/finance'
                    }
                })

                results.push({ id: p.id, transactionId: p.transactionId, status: 'Success', message: 'Processed successfully' })
                successCount++
            } catch (e: any) {
                console.error(`Failed to process settlement ${p.id}`, e)
                const msg = e.message || 'Unknown error'
                failureCount++
                errors.push(`Settlement #${p.id}: ${msg}`)
                results.push({ id: p.id, transactionId: p.transactionId, status: 'Failed', message: msg })
            }
        }

        await logAction('BULK_UPDATE', 'finance', `Bulk processed ${successCount} payouts. Failed: ${failureCount}`, 'Bulk')

        revalidatePath('/finance')
        return {
            success: true,
            message: `Processed ${successCount} payouts. Failed: ${failureCount}`,
            processed: successCount,
            failed: failureCount,
            errors: errors.length > 0 ? errors : undefined,
            results
        }

    } catch (error: any) {
        console.error('Bulk Process Error:', error)
        return { success: false, error: error.message || 'Failed to bulk process' }
    }
}
