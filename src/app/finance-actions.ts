'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'
import cashfree from '@/lib/cashfree'
import { decrypt } from '@/lib/encryption'
import { notifyRefundProcessed } from '@/lib/notification-helper'

// --- Registration Transactions ---

export async function getRegistrationTransactions(filter: 'All' | 'Recent' = 'All') {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        // Build where clause
        const where: any = {
            OR: [
                { paymentStatus: 'Completed' },
                { paymentStatus: 'Success' },
                { transactionId: { not: null } },
                { settlements: { some: { amount: 25, status: 'Processed' } } }
            ]
        }

        // Campus Head restriction
        if (admin.role.includes('Campus') && (admin as any).campusId) {
            where.campusId = (admin as any).campusId
        }

        // Query 1: Get ALL users who have a processed settlement (Crucial for Refund History)
        const syncedUsersPromise = prisma.user.findMany({
            where: {
                ...(admin.role.includes('Campus') && (admin as any).campusId ? { campusId: (admin as any).campusId } : {}),
                settlements: { some: { amount: 25, status: 'Processed' } }
            },
            select: {
                userId: true, fullName: true, role: true, mobileNumber: true, paymentAmount: true,
                transactionId: true, createdAt: true, assignedCampus: true, referralCode: true, campusId: true,
                payments: {
                    select: { paymentMethod: true, transactionId: true, bankReference: true, paidAt: true, settlementDate: true, adminRemarks: true },
                    where: { paymentStatus: 'Success' },
                    take: 1
                },
                settlements: {
                    where: { amount: 25, status: 'Processed' },
                    select: { amount: true, status: true, bankReference: true, payoutDate: true, remarks: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 500 // Safety limit
        })

        // Query 2: Get recent successful registrations (Limit to keep payload safe)
        const recentSuccessPromise = prisma.user.findMany({
            where: {
                ...(admin.role.includes('Campus') && (admin as any).campusId ? { campusId: (admin as any).campusId } : {}),
                OR: [
                    { paymentStatus: 'Completed' },
                    { paymentStatus: 'Success' },
                    { transactionId: { not: null } }
                ],
                NOT: { settlements: { some: { amount: 25, status: 'Processed' } } } // Don't duplicate
            },
            select: {
                userId: true, fullName: true, role: true, mobileNumber: true, paymentAmount: true,
                transactionId: true, createdAt: true, assignedCampus: true, referralCode: true, campusId: true,
                payments: {
                    select: { paymentMethod: true, transactionId: true, bankReference: true, paidAt: true, settlementDate: true, adminRemarks: true },
                    where: { paymentStatus: 'Success' },
                    take: 1
                },
                settlements: {
                    where: { amount: 25, status: 'Processed' },
                    select: { amount: true, status: true, bankReference: true, payoutDate: true, remarks: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: filter === 'Recent' ? 10 : 500 // Reduced from 3000 to 500 for safety
        })

        const [syncedUsers, recentSuccess] = await Promise.all([syncedUsersPromise, recentSuccessPromise])
        const transactions = [...syncedUsers, ...recentSuccess]

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
    } catch (error: any) {
        console.error('Error fetching registration transactions:', error)
        return { success: false, error: `Failed to fetch transactions: ${error?.message || 'Unknown error'}` }
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
            orderBy: { createdAt: 'desc' },
            take: 1000 // Safety limit
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
    } catch (error: any) {
        console.error('getSettlements error:', error)
        return { success: false, error: `Failed to fetch settlements: ${error?.message || ''}` }
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
                { paymentStatus: 'Success' },
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

export async function processBulkPayouts(payouts: {
    mobile: string,
    amount: number,
    transactionId: string,
    remarks?: string,
    bankName?: string,
    accountNumber?: string,
    ifscCode?: string,
    date?: string
}[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        let successCount = 0
        let failureCount = 0
        const errors: string[] = []

        // Validate for duplicate UTRs before processing (only actual UTRs)
        const utrs = payouts.map(p => p.transactionId).filter(u => u && !u.startsWith('Bulk-'))
        const duplicatesInBatch = utrs.filter((utr, index) => utrs.indexOf(utr) !== index)

        if (duplicatesInBatch.length > 0) {
            return {
                success: false,
                error: `Duplicate UTRs found in CSV: ${[...new Set(duplicatesInBatch)].join(', ')}`,
                processed: 0,
                failed: payouts.length
            }
        }

        const existingCheck = utrs.length > 0 ? await checkExistingUTRs(utrs) : { existing: [] }
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

        const results: { mobile: string, amount: number, transactionId: string, status: 'Success' | 'Failed', message: string }[] = []

        // Process in chunks
        const chunkSize = 100
        for (let i = 0; i < payouts.length; i += chunkSize) {
            const chunk = payouts.slice(i, i + chunkSize)
            const mobiles = chunk.map(p => p.mobile.trim())

            const users = await prisma.user.findMany({
                where: { mobileNumber: { in: mobiles } },
                include: {
                    settlements: {
                        where: { status: 'Pending' }
                    }
                }
            })

            const userMap = new Map(users.map(u => [u.mobileNumber, u]))

            await prisma.$transaction(async (tx) => {
                for (const p of chunk) {
                    const user = userMap.get(p.mobile.trim())

                    if (!user) {
                        failureCount++
                        errors.push(`Mobile ${p.mobile}: User not found`)
                        results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Failed', message: 'User not found' })
                        continue
                    }

                    const settlement = user.settlements.find(s => s.amount === Number(p.amount))
                    if (!settlement) {
                        failureCount++
                        errors.push(`Mobile ${p.mobile}: No pending ₹${p.amount} settlement`)
                        results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Failed', message: 'No pending settlement' })
                        continue
                    }

                    try {
                        // Update User Bank Details if provided
                        if (p.bankName && p.accountNumber) {
                            await tx.user.update({
                                where: { userId: user.userId },
                                data: {
                                    bankName: p.bankName,
                                    accountNumber: p.accountNumber,
                                    ifscCode: p.ifscCode || user.ifscCode,
                                    bankAccountDetails: `${p.bankName} - ${p.accountNumber}`
                                }
                            })
                        }

                        // Parse Date
                        let payoutDate = new Date()
                        if (p.date) {
                            const parts = p.date.split('-')
                            if (parts.length === 3) {
                                payoutDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                            } else {
                                payoutDate = new Date(p.date)
                            }
                            if (isNaN(payoutDate.getTime())) payoutDate = new Date()
                        }

                        // Update Settlement
                        await tx.settlement.update({
                            where: { id: settlement.id },
                            data: {
                                status: 'Processed',
                                bankReference: p.transactionId,
                                remarks: p.remarks || 'Bulk Processed via CSV',
                                processedBy: Number(admin.userId),
                                payoutDate: payoutDate
                            }
                        })

                        await tx.notification.create({
                            data: {
                                userId: user.userId,
                                title: 'Payment Processed',
                                message: `Your payout of ₹${settlement.amount.toLocaleString()} has been processed. Ref: ${p.transactionId}`,
                                type: 'payment',
                                link: '/finance'
                            }
                        })

                        successCount++
                        results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Success', message: 'Processed' })
                    } catch (e: any) {
                        failureCount++
                        errors.push(`Mobile ${p.mobile}: ${e.message}`)
                        results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Failed', message: e.message })
                    }
                }
            })
        }

        await logAction('BULK_UPDATE', 'finance', `Bulk processed ${successCount} payouts.`, 'Bulk')
        revalidatePath('/finance')
        return { success: true, message: `Processed ${successCount} payouts.`, processed: successCount, failed: failureCount, errors, results }
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed' }
    }
}

export async function bulkProcessPayoutsById(settlementIds: number[], transactionId: string, remarks?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const settlements = await prisma.settlement.findMany({
            where: { id: { in: settlementIds }, status: 'Pending' },
            include: { user: true }
        })

        if (settlements.length === 0) {
            return { success: false, error: 'No pending settlements found for the given IDs.' }
        }

        const results = await prisma.$transaction(async (tx) => {
            const processed = []
            for (const s of settlements) {
                const updated = await tx.settlement.update({
                    where: { id: s.id },
                    data: {
                        status: 'Processed',
                        bankReference: transactionId,
                        remarks: remarks || 'Bulk Processed via Selection',
                        processedBy: Number(admin.userId),
                        payoutDate: new Date()
                    }
                })

                // Notify user
                const isRefund = (s.remarks || '').toLowerCase().includes('refund')
                await tx.notification.create({
                    data: {
                        userId: s.userId,
                        title: isRefund ? '💰 Refund Processed' : 'Payment Processed',
                        message: `Your ${isRefund ? 'refund' : 'payout'} of ₹${s.amount.toLocaleString()} has been processed.`,
                        type: isRefund ? 'success' : 'payment',
                        link: '/finance'
                    }
                })
                processed.push(updated)
            }
            return processed
        })

        await logAction('BULK_UPDATE', 'finance', `Bulk processed ${results.length} settlements by ID.`, 'Bulk Selection')
        revalidatePath('/finance')
        return { success: true, message: `Successfully processed ${results.length} payouts.` }
    } catch (error: any) {
        console.error('Bulk Process By ID Error:', error)
        return { success: false, error: error.message || 'Failed to bulk process settlements' }
    }
}


export async function getUsersReadyForRefund() {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const where: any = {
            paymentStatus: { in: ['Success', 'Completed'] },
            paymentAmount: { gt: 0 },
            AND: [
                { accountNumber: { not: null } },
                { accountNumber: { not: '' } },
                { ifscCode: { not: null } },
                { ifscCode: { not: '' } }
            ]
        }

        // Campus Head restriction
        if (admin.role.includes('Campus') && (admin as any).campusId) {
            where.campusId = (admin as any).campusId
        }

        // Find users who have paid but don't have a settlement of 25 yet
        const users = await prisma.user.findMany({
            where,
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                role: true,
                assignedCampus: true,
                campusId: true,
                paymentStatus: true,
                paymentAmount: true,
                transactionId: true,
                createdAt: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                settlements: {
                    where: {
                        amount: 25,
                        status: { not: 'Rejected' }
                    },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 1000
        })

        // Filter out users who already have a settlement
        const eligibleUsers = users.filter(u => u.settlements.length === 0)

        // Enrich with campus names
        const campusIds = Array.from(new Set(eligibleUsers.map(u => u.campusId).filter(Boolean))) as number[]
        const campuses = await prisma.campus.findMany({
            where: { id: { in: campusIds } },
            select: { id: true, campusName: true }
        })
        const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

        const mappedUsers = eligibleUsers.map(u => ({
            ...u,
            campusName: u.campusId ? campusMap.get(u.campusId) || 'Unknown' : 'Not Assigned',
            settlements: undefined // Remove the helper relation
        }))

        return { success: true, data: mappedUsers }
    } catch (error) {
        console.error('Error fetching users ready for refund:', error)
        return { success: false, error: 'Failed to fetch eligible users' }
    }
}

export async function initiateBulkRefunds(userIds: number[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        // Strict validation: Ensure each user is actually eligible before creating settlement
        const eligibleUsers = await prisma.user.findMany({
            where: {
                userId: { in: userIds },
                paymentStatus: { in: ['Success', 'Completed'] },
                AND: [
                    { accountNumber: { not: null } },
                    { accountNumber: { not: '' } },
                    { ifscCode: { not: null } },
                    { ifscCode: { not: '' } }
                ]
            },
            include: {
                settlements: {
                    where: { amount: 25, status: { not: 'Rejected' } }
                }
            }
        })

        const usersToRefund = eligibleUsers.filter(u => u.settlements.length === 0)

        if (usersToRefund.length === 0) {
            return { success: false, error: 'No eligible users found for refund initiation.' }
        }

        // Create settlements in a transaction
        const result = await prisma.$transaction(
            usersToRefund.map(u =>
                prisma.settlement.create({
                    data: {
                        userId: u.userId,
                        amount: 25,
                        status: 'Pending',
                        remarks: 'Registration Fee Refund Request (Auto-Initiated)',
                    }
                })
            )
        )

        await logAction('BULK_CREATE', 'finance', `Initiated registration fee refunds for ${result.length} users.`, 'Bulk Refund')

        revalidatePath('/finance')
        return { success: true, message: `Successfully initiated ${result.length} refund requests.` }
    } catch (error: any) {
        console.error('Error initiating bulk refunds:', error)
        return { success: false, error: error.message || 'Failed to initiate refunds' }
    }
}

export async function syncPastRefunds(records: {
    mobile: string,
    utr: string,
    bankName?: string,
    accountNumber?: string,
    ifscCode?: string,
    date?: string
}[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const results = {
            success: 0,
            skipped: 0,
            alreadyRefunded: 0,
            notFound: 0,
            details: [] as string[]
        }

        // Process in chunks to be database-friendly
        const chunkSize = 100
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize)
            const mobiles = chunk.map(r => r.mobile.trim())

            // 1. Fetch all users for this chunk at once
            const users = await prisma.user.findMany({
                where: { mobileNumber: { in: mobiles } },
                include: {
                    settlements: {
                        where: { amount: 25, status: { not: 'Rejected' } }
                    }
                }
            })

            const userMap = new Map(users.map(u => [u.mobileNumber, u]))

            // 2. Perform updates in a single transaction for the chunk
            await prisma.$transaction(async (tx) => {
                for (const record of chunk) {
                    const mobile = record.mobile.trim()
                    const utr = record.utr.trim()

                    if (!mobile || !utr) {
                        results.skipped++
                        continue
                    }

                    const user = userMap.get(mobile)

                    if (!user) {
                        results.notFound++
                        results.details.push(`${mobile}: User not found`)
                        continue
                    }

                    // --- Parse historical date ---
                    let payoutDate = new Date()
                    if (record.date) {
                        const parts = record.date.split('-')
                        if (parts.length === 3) {
                            payoutDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                        } else {
                            payoutDate = new Date(record.date)
                        }
                        if (isNaN(payoutDate.getTime())) payoutDate = new Date()
                    }

                    // --- Update existing or Create new settlement ---
                    const existingSettlement = user.settlements[0]
                    if (existingSettlement) {
                        await tx.settlement.update({
                            where: { id: existingSettlement.id },
                            data: {
                                status: 'Processed',
                                bankReference: utr,
                                payoutDate: payoutDate,
                                remarks: 'Registration fee refunded'
                            }
                        })

                        // Notify User
                        await notifyRefundProcessed(user.userId, user.fullName)
                        results.alreadyRefunded++ // Count as update/sync
                    } else {
                        await tx.settlement.create({
                            data: {
                                userId: user.userId,
                                amount: 25,
                                status: 'Processed',
                                bankReference: utr,
                                payoutDate: payoutDate,
                                remarks: 'Registration fee refunded'
                            }
                        })

                        // Notify User
                        await notifyRefundProcessed(user.userId, user.fullName)
                        results.success++
                    }
                }
            }, { timeout: 30000 })
        }

        await logAction('BULK_SYNC', 'finance', `Synced ${results.success} past refunds with bank details and dates.`, 'Auto-Sync')
        revalidatePath('/finance')

        return {
            success: true,
            message: `Processed ${records.length} records.`,
            stats: results
        }
    } catch (error: any) {
        console.error('Error syncing past refunds:', error)
        return { success: false, error: error.message || 'Sync failed' }
    }
}
