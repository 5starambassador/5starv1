'use server'

import prisma, { withRetry } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
// --- PERFORMANCE CACHE (Senior Expert Architecture) ---
let studentCache: any[] | null = null
let lastStudentCacheUpdate: number = 0
const STUDENT_CACHE_TTL = 10 * 60 * 1000 // 10 minutes cache
// -----------------------------------------------------
import cashfree from '@/lib/cashfree'
import { decrypt } from '@/lib/encryption'
import { notifyRefundProcessed } from '@/lib/notification-helper'
import { hasPermission, getScopeFilter } from '@/lib/permission-service'
import { calculateTotalBenefit, ReferralData } from '@/lib/benefit-calculator'
import { getSpecialBonusRate } from '@/lib/reward-constants'
import { normalizeGrade } from '@/lib/utils'
import { syncUserStats } from "./sync-actions"
import { format } from 'date-fns'
// Removed redundant normalizeGrade import to avoid shadowing/mismatch with local helper

// --- Registration Transactions ---

export async function getRegistrationTransactions(
    filter: 'All' | 'Recent' = 'All', 
    academicYear?: string, 
    query?: string,
    page: number = 1,
    pageSize: number = 20,
    tab?: string // NEW: Specific tab filtering
) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        // Build base search filter
        const searchFilter: any = {}
        if (query) {
            searchFilter.OR = [
                { fullName: { contains: query, mode: 'insensitive' } },
                { mobileNumber: { contains: query, mode: 'insensitive' } },
                { referralCode: { contains: query, mode: 'insensitive' } },
                { transactionId: { contains: query, mode: 'insensitive' } },
                { childName: { contains: query, mode: 'insensitive' } },
                { childEprNo: { contains: query, mode: 'insensitive' } },
                { assignedCampus: { contains: query, mode: 'insensitive' } }
            ]
        }

        const paymentStatusFilter = [
            { paymentStatus: 'Completed' },
            { paymentStatus: 'Success' },
            { paymentStatus: 'SUCCESS' },
            { transactionId: { not: null } },
            { settlements: { some: { amount: 25, status: { in: ['Processed', 'SUCCESS', 'Confirmed'] } as any } } }
        ];

        // Ensure users with referrals in the selected year are visible, even without their own payment
        if (academicYear && academicYear !== 'All') {
            paymentStatusFilter.push({ referrals: { some: { academicYear: academicYear } } } as any);
        } else {
            paymentStatusFilter.push({ referrals: { some: {} } } as any);
        }

        // Build where clause
        const baseWhere: any = {
            AND: [
                ...(query ? [searchFilter] : []),
                { OR: paymentStatusFilter }
            ]
        }


        // Project-wide Year Filter (Robust: Includes explicit academicYear, referrals, and date-based payments)
        if (academicYear && academicYear !== 'All') {
            const yr = await prisma.academicYear.findUnique({ where: { year: academicYear } })

            baseWhere.AND.push({
                OR: [
                    { academicYear: academicYear },
                    { referrals: { some: { admittedYear: academicYear } } },
                    ...(yr ? [{
                        payments: {
                            some: {
                                createdAt: { gte: yr.startDate, lte: yr.endDate },
                                NOT: { paymentStatus: 'FAILED' }
                            }
                        }
                    }] : [])
                ]
            });
        }

        // Campus Head restriction
        if (admin.role.includes('Campus') && (admin as any).campusId) {
            baseWhere.campusId = (admin as any).campusId
        }

        // --- NEW: Tab-Specific Strict Filters (Server-Side) ---
        if (tab === 'ready_refund') {
            // Find users who PAID 25 but have NO settlement of 25 yet
            baseWhere.AND.push({
                paymentStatus: { in: ['Success', 'Completed', 'SUCCESS'] },
                paymentAmount: { gt: 0 },
                NOT: {
                    OR: [
                        { bankName: null }, { bankName: '' },
                        { accountNumber: null }, { accountNumber: '' },
                        { ifscCode: null }, { ifscCode: '' }
                    ]
                },
                settlements: {
                    none: {
                        amount: 25,
                        status: { in: ['Processed', 'Pending', 'SUCCESS', 'Confirmed', 'paid', 'PAID'] as any }
                    }
                }
            })
        } else if (tab === 'refund_history') {
            // Find users who have a settlement of 25 that is PROCESSED
            baseWhere.AND.push({
                settlements: {
                    some: {
                        amount: 25,
                        status: { in: ['Processed', 'SUCCESS', 'Confirmed', 'paid', 'PAID'] as any }
                    }
                }
            })
        }

        // Query 1: Get data (We simplify the dual-query logic since tab filtering makes it more focused)
        const transactionsPromise = withRetry(() => prisma.user.findMany({
            where: baseWhere,
            select: {
                userId: true, fullName: true, role: true, mobileNumber: true, paymentAmount: true,
                transactionId: true, createdAt: true, assignedCampus: true, referralCode: true, campusId: true,
                accountNumber: true, bankName: true, ifscCode: true, // MISSING BANK FIELDS ADDED
                payments: {
                    select: { paymentMethod: true, transactionId: true, bankReference: true, paidAt: true, settlementDate: true, adminRemarks: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                settlements: {
                    where: tab === 'refund_history' || tab === 'ready_refund' ? { amount: 25 } : { amount: 25, status: { in: ['Processed', 'SUCCESS', 'Confirmed'] } as any },
                    select: { amount: true, status: true, bankReference: true, payoutDate: true, remarks: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
        }))

        const [transactions, totalCount] = await Promise.all([
            transactionsPromise,
            withRetry(() => prisma.user.count({ where: baseWhere }))
        ])

        // No longer need manual sorting/merging as the single query handles ordering


        // Manual populate campusName
        const campusIds = transactions.map(t => t.campusId).filter(Boolean) as number[]
        const uniqueCampusIds = Array.from(new Set(campusIds))

        const campuses = await withRetry(() => prisma.campus.findMany({
            where: { id: { in: uniqueCampusIds } },
            select: { id: true, campusName: true }
        }))

        const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

        const mappedTransactions = transactions.map(t => {
            const campusName = (t.campusId ? campusMap.get(t.campusId) : null) || t.assignedCampus || 'Not Assigned'
            return {
                ...t,
                campusName, // FLAT FIELD for Refund tables
                campus: t.campusId ? { campusName } : { campusName: 'Not Assigned' } as any // NESTED for RegistrationTable
            }
        })

        return { success: true, data: mappedTransactions, totalCount }
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
                { orderAmount: { equals: 0 } },
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
            take: force ? 100 : 80, // Increased from 50/20 to ensure we catch buried successful payments
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

                    // 5. Sync benefits and status (Ensures status moves to 'Active' and counts update)
                    await syncUserStats(payment.userId)

                    updatedCount++
                }

                // Add a small delay to avoid Cashfree rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            } catch (err: any) {
                const status = err?.response?.status || err?.status
                const is401 = status === 401
                const is404 = status === 404 || String(err?.message).includes('404')
                
                if (is401) {
                    console.error('Sync Error: 401 Unauthorized. Check Cashfree credentials.')
                    return { success: false, error: 'Cashfree Authentication failed. Please check your APP ID and Secret Key.' }
                }

                if (!is404) {
                    console.error(`Failed to sync order ${payment.orderId}:`, err?.message || err)
                }
            }
        }

        // Only revalidate when called as a server action (not during SSR render)
        try { revalidatePath('/finance') } catch { /* silently skip if called during render */ }

        if (updatedCount > 0) {
            await logAction('BULK_UPDATE', 'finance', `Synced ${updatedCount} missing payments from Cashfree.`, 'Sync')
        }

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


export async function getSettlements(
    status: string = 'Pending',
    academicYear?: string,
    query?: string,
    page: number = 1,
    pageSize: number = 20,
    tab?: string
) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    console.log(`[AUDIT] getSettlements requested: status=${status}, year=${academicYear}, page=${page}`)

    try {
        // 1. Fetch Year Record for date-based heuristic (for generic settlements)
        let yearRecord = null
        if (academicYear && academicYear !== 'All' && academicYear !== 'All Time') {
            yearRecord = await prisma.academicYear.findUnique({
                where: { year: academicYear }
            })
        }

        // 2. Build search filter
        const searchFilter = query ? {
            OR: [
                { bankReference: { contains: query, mode: 'insensitive' as any } },
                {
                    user: {
                        OR: [
                            { fullName: { contains: query, mode: 'insensitive' as any } },
                            { mobileNumber: { contains: query, mode: 'insensitive' as any } },
                            { referralCode: { contains: query, mode: 'insensitive' as any } },
                            { childName: { contains: query, mode: 'insensitive' as any } },
                            { childEprNo: { contains: query, mode: 'insensitive' as any } }
                        ]
                    }
                },
                {
                    referralLead: {
                        OR: [
                            { studentName: { contains: query, mode: 'insensitive' as any } },
                            { admissionNumber: { contains: query, mode: 'insensitive' as any } },
                            { parentName: { contains: query, mode: 'insensitive' as any } },
                            { parentMobile: { contains: query, mode: 'insensitive' as any } },
                            { campus: { contains: query, mode: 'insensitive' as any } }
                        ]
                    }
                }
            ]
        } : {}

        // --- NEW: Heuristic for Jan-March 2026 Admission Shares in 2026-2027 ---
        const febMarch2026Heuristic = academicYear === '2026-2027' ? {
            benefitType: 'ADMISSION_SHARE' as any,
            createdAt: {
                gte: new Date('2026-02-01'),
                lte: new Date('2026-04-30')
            }
        } : null

        // 3. Consolidated Query Logic (100% database-level sync)
        const isHistory = status === 'Processed'
        
        const finalWhere: any = {
            AND: [
                { 
                    status: status === 'All' ? undefined : 
                            status === 'Processed' ? { in: ['Processed', 'SUCCESS', 'Confirmed', 'paid', 'PAID'] as any } : 
                            { in: [status, status.toUpperCase()] as any } 
                },
                // --- NEW: Tab-specific Benefit Type Filtering (Ensures only slab rewards are Waivers) ---
                ...(tab === 'waiver_history' ? [{
                    benefitType: { in: ['SLAB_SHARE'] as any }
                }] : tab === 'payout_history' ? [{
                    benefitType: { in: ['ADMISSION_SHARE', 'DONATION_SHARE', 'SPECIAL_BONUS', 'OTHER'] as any },
                    amount: { not: 25 }
                }] : []),
                ...(query ? [searchFilter] : []),
                // --- ENHANCED: History vs Pending Logic ---
                ...(academicYear && academicYear !== 'All' && academicYear !== 'All Time' ? [{
                    OR: isHistory ? [
                        // For History, we strictly look at the Date Range of the cycle (payment date)
                        ...(yearRecord ? [{
                            createdAt: { gte: yearRecord.startDate, lte: yearRecord.endDate }
                        }] : []),
                        ...(febMarch2026Heuristic ? [febMarch2026Heuristic] : [])
                    ] : [
                        // For Pending, we look at lead cycle OR date range (requested date)
                        { referralLead: { academicYear } },
                        { referralLead: { admittedYear: academicYear } },
                        ...(yearRecord ? [{
                            createdAt: { gte: yearRecord.startDate, lte: yearRecord.endDate },
                            referralLeadId: null
                        }] : []),
                        ...(febMarch2026Heuristic ? [febMarch2026Heuristic] : [])
                    ]
                }] : []),
                // Campus Head restriction
                ...(user.role.includes('Campus') && (user as any).campusId ? [{
                    OR: [
                        { user: { campusId: (user as any).campusId } },
                        { referralLead: { campusId: (user as any).campusId } }
                    ]
                }] : [])
            ]
        }

        const [settlementsAll, totalCount] = await Promise.all([
            prisma.settlement.findMany({
                where: finalWhere,
                include: {
                    user: {
                        select: {
                            fullName: true, role: true, mobileNumber: true, bankAccountDetails: true,
                            bankName: true, accountNumber: true, ifscCode: true, referralCode: true, campusId: true
                        }
                    },
                    referralLead: true
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            prisma.settlement.count({
                where: finalWhere
            })
        ])

        // 4. Decrypt bank details (No more JS filtering here to ensure pagination integrity)
        const decryptedSettlements = settlementsAll.map((s: any) => {
            const hasNewDetails = s.user.bankName && s.user.accountNumber && s.user.ifscCode
            let bankDetailsStr = ''
            if (hasNewDetails) {
                bankDetailsStr = `${s.user.bankName} - ${s.user.accountNumber} (${s.user.ifscCode})`
            } else if (s.user.bankAccountDetails) {
                try {
                    bankDetailsStr = decrypt(s.user.bankAccountDetails) || ''
                } catch (e) {
                    bankDetailsStr = 'Encrypted Details'
                }
            }

            return {
                ...s,
                user: {
                    ...s.user,
                    bankAccountDetails: bankDetailsStr,
                    bankName: s.user.bankName,
                    accountNumber: s.user.accountNumber,
                    ifscCode: s.user.ifscCode
                }
            }
        })

        return { success: true, data: decryptedSettlements, totalCount }
    } catch (error: any) {
        console.error('getSettlements error:', error)
        return { success: false, error: `Failed to fetch settlements: ${error?.message || ''}` }
    }
}

export async function getFinanceStats(academicYear?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const year = academicYear && academicYear !== 'All' ? academicYear : undefined;

        // OPTIMIZED: Use database aggregations instead of fetching all records
        // Note: Settlement doesn't have academicYear, so we use its relation or date
        const [settlementStats, revenueStats] = await Promise.all([
            prisma.settlement.aggregate({
                where: { 
                    OR: [
                        { referralLead: { academicYear: year } },
                        { remarks: { contains: year || "" } }
                    ],
                    status: { not: 'Refunded' } 
                },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.referralLead.aggregate({
                where: { 
                    academicYear: year, 
                    OR: [
                        { admissionFeeCollected: { gt: 0 } },
                        { donationFeeCollected: { gt: 0 } }
                    ]
                },
                _sum: { admissionFeeCollected: true, donationFeeCollected: true }
            })
        ])

        const pendingPayouts = await prisma.settlement.aggregate({
            where: { 
                OR: [
                    { referralLead: { academicYear: year } },
                    { remarks: { contains: year || "" } }
                ],
                status: 'Pending' 
            },
            _sum: { amount: true }
        })

        const totalRevenue = (revenueStats._sum.admissionFeeCollected || 0) + (revenueStats._sum.donationFeeCollected || 0)

        return {
            success: true,
            stats: {
                totalRevenue,
                pending: pendingPayouts._sum?.amount || 0,
                processed: (settlementStats._sum?.amount || 0) - (pendingPayouts._sum?.amount || 0),
                totalCount: settlementStats._count?.id || 0
            }
        }
    } catch (error) {
        console.error('getFinanceStats error:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}

export async function processPayout(settlementId: number, transactionId: string, remarks?: string) {
    const admin = await getCurrentUser()
    if (!admin || !await hasPermission('settlements')) return { success: false, error: 'Unauthorized' }

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

        // ⚡ INTEGRATION: Trigger Instant Automations
        try {
            const { automationEngine } = await import('@/lib/automation-engine')
            await automationEngine.processImmediateEvent('ON_SETTLEMENT_PROCESSED', settlement.userId, {
                amount: settlement.amount,
                category: settlement.benefitType || 'OTHER'
            })
        } catch (err) {
            console.error('[AutomationEngine] Trigger failed:', err)
        }

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
    date?: string,
    eprNo?: string // Universal Student ERP/ID
}[]) {
    const admin = await getCurrentUser()
    if (!admin || !await hasPermission('settlements')) return { success: false, error: 'Unauthorized' }

    try {
        let successCount = 0
        let failureCount = 0
        const errors: string[] = []
        const processedUserIds = new Set<number>()

        // 1. Initial ID Validation (Safety First)
        // Only prioritize actual user-provided IDs, ignore system prefixes
        const utrs = payouts.map(p => p.transactionId).filter(u => u && !u.startsWith('Bulk-') && !u.startsWith('ERP-'))
        const duplicatesInBatch = utrs.filter((utr, index) => utrs.indexOf(utr) !== index)

        if (duplicatesInBatch.length > 0) {
            return {
                success: false,
                error: `Duplicate IDs found in CSV: ${[...new Set(duplicatesInBatch)].join(', ')}`,
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
                error: `Transaction IDs already exist in database: ${duplicateList}`,
                processed: 0,
                failed: payouts.length
            }
        }

        const results: { mobile: string, amount: number, transactionId: string, status: 'Success' | 'Failed', message: string }[] = []

        // Process in chunks
        const chunkSize = 100
        for (let i = 0; i < payouts.length; i += chunkSize) {
            const chunk = payouts.slice(i, i + chunkSize)
            
            // Collect lookup keys
            const mobiles = chunk.map(p => p.mobile.trim())
            const eprNos = chunk.map(p => p.eprNo?.trim()).filter(Boolean) as string[]

            // Dual-Level Fetch:
            // Fetch Users (by Mobile) AND ReferralLeads (by Referral admissionNumber)
            const [users, leads] = await Promise.all([
                prisma.user.findMany({
                    where: { mobileNumber: { in: mobiles } },
                    include: {
                        settlements: {
                            where: { status: 'Pending' }
                        }
                    }
                }),
                prisma.referralLead.findMany({
                    where: { admissionNumber: { in: eprNos } },
                    include: {
                        user: {
                            include: {
                                settlements: {
                                    where: { status: 'Pending' }
                                }
                            }
                        }
                    }
                })
            ])

            const userMapByMobile = new Map(users.map(u => [u.mobileNumber, u]))
            const leadMapByEpr = new Map(leads.map(l => [l.admissionNumber!, l]))

            // 2. Process record-by-record for robustness
            for (const p of chunk) {
                const pEpr = p.eprNo?.trim() || ''
                const pMobile = p.mobile.trim()
                const pRemarks = (p.remarks || '').toLowerCase()
                const isWaiver = pRemarks.includes('waiver')

                // Simplified ID Strategy:
                // 1. Check if ERP matches a Referral Student (Highest Precision)
                const matchedLead = pEpr ? leadMapByEpr.get(pEpr) : null
                // 2. Fallback to Mobile match (Ambassador Account)
                const matchedAmbByMobile = userMapByMobile.get(pMobile)

                // The "Target" user for the financial record
                const user = matchedLead?.user || matchedAmbByMobile

                if (!user) {
                    failureCount++
                    results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Failed', message: 'User or Student not found' })
                    continue
                }

                // Senior Expert Logic: Categorical Matching
                const settlement = user.settlements.find((s: any) => {
                    const sAmount = Number(s.amount)
                    const inputAmount = Number(p.amount)
                    if (sAmount !== inputAmount) return false

                    // If we matched via Referral ERP, prioritize settlements linked to that lead
                    if (matchedLead && s.referralLeadId !== matchedLead.leadId && !isWaiver) return false

                    const sType = s.benefitType || ''

                    // Smart Mapping based on User's Template Remarks
                    if (pRemarks.includes('admission')) {
                        return sType === 'ADMISSION_SHARE'
                    }
                    if (pRemarks.includes('donation')) {
                        return sType === 'DONATION_SHARE'
                    }
                    if (pRemarks.includes('slab')) {
                        return sType === 'SLAB_SHARE'
                    }
                    if (pRemarks.includes('refund')) {
                        return sType === 'OTHER' || sAmount === 25
                    }

                    // Fallback to simple amount match if no keywords found
                    return true
                })

                // Hybrid Logic:
                // 1. If waiver and no pending record found -> ALLOW auto-creation.
                // 2. If normal payout and no pending found -> FAIL (Safety Guard).
                if (!settlement && !isWaiver) {
                    failureCount++
                    results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Failed', message: 'No matching pending settlement category found' })
                    continue
                }

                try {
                    // Update inside a focused transaction
                    await prisma.$transaction(async (tx) => {
                        // Update User Bank Details if provided in CSV
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
                            const separator = p.date.includes('-') ? '-' : '/'
                            const parts = p.date.split(separator)
                            if (parts.length === 3) {
                                if (parts[0].length === 4) {
                                    payoutDate = new Date(p.date.replace(/\//g, '-'))
                                } else {
                                    payoutDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                                }
                            } else {
                                payoutDate = new Date(p.date)
                            }
                            if (isNaN(payoutDate.getTime())) payoutDate = new Date()
                        }

                        if (settlement) {
                            // Update existing pending record
                            await tx.settlement.update({
                                where: { id: settlement.id },
                                data: {
                                    status: 'Processed',
                                    bankReference: p.transactionId || `Bulk-${format(new Date(), 'yyyyMMdd')}`,
                                    remarks: p.remarks || settlement.remarks || 'Bulk Processed via CSV',
                                    processedBy: Number(admin.userId),
                                    payoutDate: payoutDate
                                }
                            })
                        } else {
                            // No matching settlement found - record failure
                            throw new Error('No matching pending settlement found for this amount/category')
                        }

                        // Senior Expert Fix: Sync Refund Status if applicable (Maintains DB Parity)
                        const isRefund = (pRemarks || settlement?.remarks || '').toLowerCase().includes('refund') || Number(p.amount) === 25
                        if (isRefund) {
                            const regPayment = await tx.payment.findFirst({
                                where: {
                                    userId: user.userId,
                                    orderStatus: 'SUCCESS',
                                    orderAmount: 25
                                },
                                orderBy: { createdAt: 'asc' }
                            })
                            if (regPayment) {
                                await tx.payment.update({
                                    where: { id: regPayment.id },
                                    data: {
                                        adminRemarks: `REFUNDED via Bulk Import on ${new Date().toISOString()} | Ref: ${p.transactionId}`
                                    }
                                })
                            }
                        }
                    })

                    // Safe Notification (Outside transaction)
                    prisma.notification.create({
                        data: {
                            userId: user.userId,
                            title: isWaiver ? 'Waiver Applied' : 'Payment Processed',
                            message: isWaiver 
                                ? `Your institutional fee waiver of ₹${p.amount.toLocaleString()} has been synced.`
                                : `Your payout of ₹${p.amount.toLocaleString()} has been processed. Ref: ${p.transactionId}`,
                            type: 'payment',
                            link: '/finance'
                        }
                    }).catch(() => {})

                    successCount++
                    results.push({ 
                        mobile: p.mobile, 
                        amount: p.amount, 
                        transactionId: p.transactionId, 
                        status: 'Success', 
                        message: isWaiver ? 'Waiver Synced' : 'Payout Processed' 
                    })

                    processedUserIds.add(user.userId)

                } catch (e: any) {
                    failureCount++
                    errors.push(`Mobile ${p.mobile}: ${e.message}`)
                    results.push({ mobile: p.mobile, amount: p.amount, transactionId: p.transactionId, status: 'Failed', message: e.message })
                }
            }
        }

        await logAction('BULK_UPDATE', 'finance', `Bulk processed ${successCount} financial movements (Payouts/Waivers).`, 'Bulk')
        revalidatePath('/finance')

        // ⚡ INTEGRATION: Trigger Instant Automations
        try {
            const { automationEngine } = await import('@/lib/automation-engine')
            for (const uid of Array.from(processedUserIds)) {
                await automationEngine.processImmediateEvent('ON_SETTLEMENT_PROCESSED', uid)
            }
        } catch (err) {
            console.error('[AutomationEngine] Bulk trigger failed:', err)
        }

        return { success: successCount > 0, message: `Processed ${successCount} records.`, processed: successCount, failed: failureCount, errors, results }
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

        const processed: any[] = []
        for (const s of settlements) {
            try {
                const updated = await prisma.$transaction(async (tx) => {
                    return await tx.settlement.update({
                        where: { id: s.id },
                        data: {
                            status: 'Processed',
                            bankReference: transactionId,
                            remarks: remarks || 'Bulk Processed via Selection',
                            processedBy: Number(admin.userId),
                            payoutDate: new Date()
                        }
                    })
                })

                // Notify user outside transaction
                const isRefund = (s.remarks || '').toLowerCase().includes('refund')
                prisma.notification.create({
                    data: {
                        userId: s.userId,
                        title: isRefund ? '💰 Refund Processed' : 'Payment Processed',
                        message: `Your ${isRefund ? 'refund' : 'payout'} of ₹${s.amount.toLocaleString()} has been processed.`,
                        type: isRefund ? 'success' : 'payment',
                        link: '/finance'
                    }
                }).catch(err => console.error('Notification failed:', err))

                processed.push(updated)
            } catch (err) {
                console.error(`Failed to process settlement ${s.id}:`, err)
            }
        }
        const results = processed

        await logAction('BULK_UPDATE', 'finance', `Bulk processed ${results.length} settlements by ID.`, 'Bulk Selection')
        revalidatePath('/finance')

        // ⚡ INTEGRATION: Trigger Instant Automations
        try {
            const { automationEngine } = await import('@/lib/automation-engine')
            // Collect unique user IDs to avoid double triggers in a bulk batch
            const uniqueUserIds = Array.from(new Set(settlements.map(s => s.userId)))
            for (const uid of uniqueUserIds) {
                await automationEngine.processImmediateEvent('ON_SETTLEMENT_PROCESSED', uid)
            }
        } catch (err) {
            console.error('[AutomationEngine] Bulk trigger failed:', err)
        }

        return { success: true, message: `Successfully processed ${results.length} payouts.` }
    } catch (error: any) {
        console.error('Bulk Process By ID Error:', error)
        return { success: false, error: error.message || 'Failed to bulk process settlements' }
    }
}

export async function getUsersReadyForRefund(academicYear?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        let dateFilter: any = {};
        if (academicYear && academicYear !== 'All') {
            const yearRecord = await prisma.academicYear.findUnique({
                where: { year: academicYear }
            });
            if (yearRecord) {
                dateFilter = {
                    createdAt: {
                        gte: yearRecord.startDate,
                        lte: yearRecord.endDate
                    }
                };
            }
        }

        const where: any = {
            paymentStatus: { in: ['Success', 'Completed'] },
            paymentAmount: { gt: 0 },
            ...(academicYear && academicYear !== 'All' ? { academicYear } : {}),
            AND: [
                { bankName: { not: null } },
                { bankName: { not: '' } },
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
            take: 50000 // SAFETY GUARD: Increased to support large exports
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
    if (!admin || !await hasPermission('settlements')) return { success: false, error: 'Unauthorized' }

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
    utr?: string,
    bankName?: string,
    accountNumber?: string,
    ifscCode?: string,
    date?: string,
    remarks?: string,
    amount?: number,
    childEprNo?: string
}[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const results = {
            success: 0,
            skipped: 0,
            alreadyRefunded: 0,
            notFound: 0,
            details: [] as string[],
            results: [] as { mobile: string, amount: number, transactionId: string, status: 'Success' | 'Skipped' | 'Failed', message: string }[]
        }


        // Process in chunks to be database-friendly
        const chunkSize = 100
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize)

            // Collect unique mobiles so we can batch-fetch users once per chunk
            const searchMobiles = Array.from(new Set(
                chunk.map(r => r.mobile.replace(/\s+/g, '').trim()).filter(Boolean)
            ))

            // 1. Fetch all users for this chunk at once
            const users = await prisma.user.findMany({
                where: { mobileNumber: { in: searchMobiles } },
                include: {
                    settlements: {
                        where: { status: { not: 'Rejected' } },
                        include: { referralLead: true }
                    }
                }
            })

            const userMap = new Map(users.map(u => [u.mobileNumber.replace(/\s+/g, '').trim(), u]))

            // 2. Perform updates record-by-record (allows multiple rows per mobile)
            for (const record of chunk) {
                const normalizedMobile = record.mobile.replace(/\s+/g, '').trim()
                const mobile = record.mobile.trim()
                const utr = record.utr?.trim() || `REF-MANUAL-${Date.now()}`
                const remarks = record.remarks?.trim() || ''
                const amount = record.amount || 0

                if (!mobile) {
                    results.skipped++
                    results.results.push({ mobile, amount: 0, transactionId: utr, status: 'Skipped', message: 'Missing mobile number' })
                    continue
                }

                const user = userMap.get(normalizedMobile)

                if (!user) {
                    results.notFound++
                    results.details.push(`${mobile}: User not found`)
                    results.results.push({ mobile, amount: 0, transactionId: utr, status: 'Failed', message: 'User not found' })
                    continue
                }

                try {
                    // Smart Categorization logic
                    const lowerRemarks = remarks.toLowerCase()
                    let detectedType: any = 'OTHER'
                    if (lowerRemarks.includes('admission')) detectedType = 'ADMISSION_SHARE'
                    else if (lowerRemarks.includes('donation')) detectedType = 'DONATION_SHARE'
                    else if (lowerRemarks.includes('slab')) detectedType = 'SLAB_SHARE'
                    else if (lowerRemarks.includes('special') || lowerRemarks.includes('bonus')) detectedType = 'SPECIAL_BONUS'
                    else if (lowerRemarks.includes('refund') || lowerRemarks.includes('registration')) detectedType = 'OTHER'

                    // --- Parse historical date ---
                    let payoutDate = new Date()
                    if (record.date) {
                        const separator = record.date.includes('-') ? '-' : '/'
                        const parts = record.date.split(separator)
                        if (parts.length === 3) {
                            if (parts[0].length === 4) {
                                payoutDate = new Date(record.date.replace(/\//g, '-'))
                            } else {
                                payoutDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                            }
                        } else {
                            payoutDate = new Date(record.date)
                        }
                        if (isNaN(payoutDate.getTime())) payoutDate = new Date()
                    }

                    // Global UTR Safeguard: Ensure this UTR isn't already used for someone else
                    const existingWithUtr = await prisma.settlement.findFirst({
                        where: { bankReference: utr },
                        select: { userId: true, amount: true, id: true }
                    })

                    if (existingWithUtr && existingWithUtr.userId !== user.userId) {
                        results.results.push({ mobile, amount, transactionId: utr, status: 'Failed', message: 'Duplicate UTR: This reference is already used for another user' })
                        continue
                    }

                    // High Precision Match: Look for pending first, then processed by type and amount
                    // We prioritize records that EXACTLY match the type and amount if possible
                    // NEW: If Child EPR is provided, prioritize matching the specific referral
                    const targetErp = record.childEprNo?.trim().toUpperCase()

                    const pendingMatch = user.settlements.find(s => {
                        if (s.status !== 'Pending' || Math.abs(s.amount - amount) >= 1) return false;
                        if (s.benefitType !== detectedType && s.benefitType && detectedType !== 'OTHER') return false;
                        if (targetErp && s.referralLead?.admissionNumber?.toUpperCase() === targetErp) return true;
                        if (targetErp) return false; // Strict match mode
                        return true;
                    })
                    
                    const processedMatch = user.settlements.find(s => {
                        if (s.status !== 'Processed' && s.bankReference !== utr) return false;
                        if (Math.abs(s.amount - amount) >= 1) return false;
                        if (s.benefitType !== detectedType && s.benefitType && detectedType !== 'OTHER') return false;
                        if (targetErp && s.referralLead?.admissionNumber?.toUpperCase() === targetErp) return true;
                        if (targetErp) return false; // Strict match mode
                        return true;
                    })

                    // Fallback: Just look for ANY pending if amount is 25 (legacy support)
                    const legacyMatch = (amount === 25 && !pendingMatch && !targetErp) ? user.settlements.find(s => s.status === 'Pending' && s.amount === 25) : null

                    const targetSettlement = pendingMatch || legacyMatch || processedMatch

                    await prisma.$transaction(async (tx) => {
                        if (targetSettlement) {
                            await tx.settlement.update({
                                where: { id: targetSettlement.id },
                                data: {
                                    status: 'Processed',
                                    bankReference: utr,
                                    payoutDate: payoutDate,
                                    remarks: remarks || targetSettlement.remarks,
                                    benefitType: targetSettlement.benefitType || (detectedType as any)
                                }
                            })
                        } else {
                            // Create new processed record if no match found
                            await tx.settlement.create({
                                data: {
                                    userId: user.userId,
                                    amount: amount,
                                    status: 'Processed',
                                    bankReference: utr,
                                    payoutDate: payoutDate,
                                    remarks: remarks || (targetErp ? `Synced processed payout for ERP: ${targetErp}` : 'Sync processed payout'),
                                    benefitType: detectedType as any
                                }
                            })
                        }
                    })

                    if (targetSettlement && targetSettlement.status === 'Processed') {
                        results.alreadyRefunded++
                        results.results.push({ mobile, amount, transactionId: utr, status: 'Success', message: `Updated: ${remarks || 'Paid'}` })
                    } else {
                        results.success++
                        results.results.push({ mobile, amount, transactionId: utr, status: 'Success', message: `Synced: ${remarks || 'Paid'}` })
                        // Only notify if it was a new sync or moved from pending
                        notifyRefundProcessed(user.userId, user.fullName).catch(err => console.error('Notification failed:', err))
                    }

                } catch (recordError: any) {
                    console.error(`Error processing record for ${mobile}:`, recordError)
                    results.results.push({ mobile, amount, transactionId: utr, status: 'Failed', message: recordError.message || 'Database error' })
                }
            }
        }

        await logAction('BULK_SYNC', 'finance', `Synced ${results.success + results.alreadyRefunded} payouts.`, 'Auto-Sync')
        revalidatePath('/finance')

        return {
            success: true,
            message: `Processed ${records.length} records. Success: ${results.success}, Updated: ${results.alreadyRefunded}`,
            stats: results,
            results: results.results
        }
    } catch (error: any) {
        console.error('Error syncing past refunds:', error)
        return { success: false, error: error.message || 'Sync failed' }
    }
}

/**
 * Identifies ambassadors with earned benefits that have not yet been settled.
 * Distinguishes between Group A (Waiver) and Group B (Payout).
 */
export async function getAccruedPayoutLiabilities(
    yearFilter: string = 'All', 
    search?: string, 
    adminCampusId?: number,
    page: number = 1,
    pageSize: number = 20,
    mode?: 'A' | 'B'
) {
    try {
        const admin = await getCurrentUser()
        if (!admin) return { success: false, error: 'Unauthorized' }

        // 0. Fetch campuses first for scope and name mapping
        const campuses = await prisma.campus.findMany({
            select: { id: true, campusName: true }
        })
        
        const campusNameMap = new Map()
        campuses.forEach(c => campusNameMap.set(c.id, c.campusName))

        // SENIOR EXPERT: In Finance, Campus Heads MUST see any ambassador who has a referral in their campus
        // even if the ambassador themselves belongs to a different campus (e.g. Staff/Global).
        const effectiveAdminCampusId = admin.role.includes('Campus') ? (admin as any).campusId : null

        const financeScopeFilter = effectiveAdminCampusId ? {
            OR: [
                { campusId: Number(effectiveAdminCampusId) }, // Ambassadors assigned to this campus (ID match)
                { assignedCampus: campusNameMap.get(Number(effectiveAdminCampusId)) }, // Ambassadors assigned by name (string match)
                { referrals: { some: { campusId: Number(effectiveAdminCampusId) } } } // Ambassadors with referrals TO this campus
            ]
        } : {}

        // 0. Build search filter
        const searchFilter = search ? {
            OR: [
                { fullName: { contains: search, mode: 'insensitive' as any } },
                { mobileNumber: { contains: search, mode: 'insensitive' as any } },
                { referralCode: { contains: search, mode: 'insensitive' as any } },
                { childName: { contains: search, mode: 'insensitive' as any } },
                { childEprNo: { contains: search, mode: 'insensitive' as any } },
                {
                    referrals: {
                        some: {
                            OR: [
                                { studentName: { contains: search, mode: 'insensitive' as any } },
                                { admissionNumber: { contains: search, mode: 'insensitive' as any } },
                                { parentName: { contains: search, mode: 'insensitive' as any } },
                                { parentMobile: { contains: search, mode: 'insensitive' as any } },
                                { campus: { contains: search, mode: 'insensitive' as any } }
                            ]
                        }
                    }
                }
            ]
        } : {}

        // 1. Fetch AcademicYear record for date boundaries
        let dateRangeFilter: any = {}

        if (yearFilter !== 'All') {
            const yearRecord = await prisma.academicYear.findUnique({
                where: { year: yearFilter }
            })

            dateRangeFilter = yearRecord ? {
                createdAt: {
                    gte: yearRecord.startDate,
                    lte: yearRecord.endDate
                }
            } : {
                createdAt: { gte: new Date('2025-01-01') } // Fallback
            }
        }

        // SENIOR FIX (Data Restoration): Use a simpler but more inclusive filter
        // If query is for a specific year, prioritize academicYear/admittedYear fields first.
        const referralYearFilter = yearFilter !== 'All' ? {
            academicYear: yearFilter
        } : {}

        // --- NEW: DOUBLE-DECOUPLED STRATEGY (P1017 ELIMINATION) ---
        // Step A: Get IDs matching conditions (Year Filter & Mode)
        // SENIOR EXPERT NOTE: Mode MUST be strict.
        const [refUsers, achariyaUsers] = await Promise.all([
            prisma.referralLead.findMany({
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    ...referralYearFilter,
                    // Apply Mode Filter early to identifiers
                    ...(mode === 'A' ? { user: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } : {}),
                    ...(mode === 'B' ? { user: { NOT: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } } : {})
                },
                select: { userId: true },
                distinct: ['userId']
            }),
            prisma.user.findMany({
                where: { 
                    role: { in: ['Parent', 'Staff'] } as any,
                    childInAchariya: true,
                    // If mode is B, this pool is irrelevant
                    ...(mode === 'B' ? { userId: -1 } : {})
                },
                select: { userId: true },
                take: mode === 'B' ? 1 : 5000 // Only fetch for Group A or general view
            })
        ])

        let eligibleUserIds: number[] = Array.from(new Set([
            ...refUsers.map(r => r.userId)
            // achariyaUsers REMOVED: Ledger should only show people with activities (referrals/settlements).
        ]))

        // Step A.5: Add users who already have settlements (even if they have no referrals in current year)
        if (yearFilter === 'All') {
            const usersWithSettlements = await prisma.settlement.findMany({
                where: {
                    AND: [
                        mode === 'A' ? 
                            { user: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } :
                            { user: { NOT: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } },
                        { amount: { gt: 25 } } // Exclude registration refunds
                    ]
                },
                select: { userId: true },
                distinct: ['userId']
            })
            eligibleUserIds = Array.from(new Set([...eligibleUserIds, ...usersWithSettlements.map(s => s.userId)]))
        } else {
             // For a specific year, we might want to see those who were paid in this cycle
             const yearRecord = await prisma.academicYear.findUnique({ where: { year: yearFilter } })
             if (yearRecord) {
                 const usersPaidInCycle = await prisma.settlement.findMany({
                     where: {
                         createdAt: { gte: yearRecord.startDate, lte: yearRecord.endDate },
                         amount: { gt: 25 }, // Exclude registration refunds
                         ...(mode === 'A' ? 
                            { user: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } :
                            { user: { NOT: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } }
                         )
                     },
                     select: { userId: true },
                     distinct: ['userId']
                 })
                 eligibleUserIds = Array.from(new Set([...eligibleUserIds, ...usersPaidInCycle.map(s => s.userId)]))
             }
        }

        // Step B: Handle Search (Decoupled & Strict)
        if (search) {
            const [userSearchIds, referralSearchIds] = await Promise.all([
                prisma.user.findMany({
                    where: {
                        userId: { in: eligibleUserIds },
                        OR: [
                            { fullName: { contains: search, mode: 'insensitive' as any } },
                            { mobileNumber: { contains: search, mode: 'insensitive' as any } },
                            { referralCode: { contains: search, mode: 'insensitive' as any } },
                            { childName: { contains: search, mode: 'insensitive' as any } },
                            { childEprNo: { contains: search, mode: 'insensitive' as any } }
                        ]
                    },
                    select: { userId: true }
                }),
                prisma.referralLead.findMany({
                    where: {
                        userId: { in: eligibleUserIds },
                        OR: [
                            { studentName: { contains: search, mode: 'insensitive' as any } },
                            { admissionNumber: { contains: search, mode: 'insensitive' as any } },
                            { parentName: { contains: search, mode: 'insensitive' as any } },
                            { parentMobile: { contains: search, mode: 'insensitive' as any } },
                            { campus: { contains: search, mode: 'insensitive' as any } }
                        ]
                    },
                    select: { userId: true },
                    distinct: ['userId']
                })
            ])

            eligibleUserIds = Array.from(new Set([
                ...userSearchIds.map(u => u.userId),
                ...referralSearchIds.map(r => r.userId)
            ]))
        }

        // Step C: Handle Finance Scope (Campus Admin filter)
        if (effectiveAdminCampusId) {
            const campusAmbassadors = await prisma.user.findMany({
                where: {
                    userId: { in: eligibleUserIds },
                    OR: [
                        { campusId: effectiveAdminCampusId }, // Ambassadors assigned to this campus (ID match)
                        { assignedCampus: campusNameMap.get(effectiveAdminCampusId) },
                        { referrals: { some: { campusId: effectiveAdminCampusId } } }
                    ]
                },
                select: { userId: true }
            })
            eligibleUserIds = campusAmbassadors.map(u => u.userId)
        }

        // --- FINAL RESTRAINT: If mode is specified, verify current set remains strictly in mode ---
        // This prevents "dirty" data if the Step A identifications were too broad.
        if (mode === 'A' || mode === 'B') {
            const strictUsers = await prisma.user.findMany({
                where: {
                    userId: { in: eligibleUserIds },
                    ...(mode === 'A' ? { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } : {}),
                    ...(mode === 'B' ? { NOT: { role: { in: ['Parent', 'Staff'] } as any, childInAchariya: true } } : {})
                },
                select: { userId: true }
            })
            eligibleUserIds = strictUsers.map(u => u.userId)
        }

        const allLeads = await prisma.referralLead.findMany({
            where: { 
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                ...(yearFilter && yearFilter !== 'All' ? { academicYear: yearFilter } : {}),
                ...(eligibleUserIds.length > 0 ? { userId: { in: eligibleUserIds } } : { userId: -1 }) // -1 ensures empty if no matches
            },
            select: { userId: true },
            take: 50000, // Expanded limit for SuperAdmin totals and large exports
            orderBy: { createdAt: 'desc' }
        })

        // 1. PAGING: Total Count & Clamped Set (Group-Aware)
        // Use eligibleUserIds for count if they represent the ambassadors, 
        // but we need those with Confirmed leads (or Group A base pool).
        const ambassadorsWithLeads = Array.from(new Set(allLeads.map(l => l.userId)))
        
        // Group A also includes Parent/Staff with childInAchariya even if 0 referrals (potential waivers)
        const finalPool = mode === 'A' ? 
            Array.from(new Set([...ambassadorsWithLeads, ...eligibleUserIds])) : 
            ambassadorsWithLeads

        const totalAmbassadorsWithRewards = finalPool.length
        const uniqueUserIds = finalPool.slice((page - 1) * pageSize, page * pageSize)
        
        // 2. Fetch Detailed User Objects
        const [users, slabs, gradeFees, allCampuses] = await Promise.all([
            prisma.user.findMany({ where: { userId: { in: uniqueUserIds } } }),
            prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } }),
            prisma.gradeFee.findMany({ where: { academicYear: yearFilter && yearFilter !== 'All' ? yearFilter : '2026-2027' } }),
            prisma.campus.findMany({ select: { id: true, campusName: true } })
        ])

        const userIds = users.map(u => u.userId)
        
        // 3. BULK FETCH RELATED DATA
        const [allSettlements, allReferrals] = await Promise.all([
            prisma.settlement.findMany({
                where: { userId: { in: userIds } }
            }),
            prisma.referralLead.findMany({
                where: {
                    userId: { in: userIds },
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    ...referralYearFilter,
                    ...(effectiveAdminCampusId ? { campusId: effectiveAdminCampusId } : {})
                },
                include: {
                    student: {
                        select: { studentId: true, fullName: true, grade: true, campusId: true, annualFee: true, baseFee: true, createdAt: true, campus: { select: { campusName: true } } }
                    }
                }
            })
        ])

              // Collect all IDs for the surgical student lookup pool
        const studentIdsToFetch = new Set<number>()
        allReferrals.forEach((r: any) => { 
            if (r.student?.studentId) studentIdsToFetch.add(r.student.studentId) 
        })
        users.forEach((u: any) => { 
            if (u.students) u.students.forEach((s: any) => studentIdsToFetch.add(s.studentId)) 
        })
        const childEprs = users.map(u => u.childEprNo?.trim()?.toUpperCase()).filter(Boolean) as string[]

        // Surgical Student Fetch: Only fetch students linked to these ambassadors
        const allStudents = await prisma.student.findMany({
            where: { 
                OR: [
                    { parentId: { in: userIds } },
                    { admissionNumber: { in: childEprs } },
                    { studentId: { in: Array.from(studentIdsToFetch) } }
                ],
                status: { in: ['Active', 'ACTIVE'] } as any 
            },
            include: { campus: { select: { id: true, campusName: true } }, parent: { select: { mobileNumber: true } } }
        })

        // 4. PREPARE LOOKUP MAPS (O(1) Complexity)
        const campusMap = new Map<number, string>(allCampuses.map(c => [c.id, c.campusName]))
        const settlementMap = new Map<number, any[]>()
        const referralMap = new Map<number, any[]>()
        const eprMap = new Map<string, any>()
        const mobileMap = new Map<string, any[]>()
        const gradeFeeMap = new Map<string, number>()

        allSettlements.forEach(s => {
            if (!settlementMap.has(s.userId)) settlementMap.set(s.userId, [])
            settlementMap.get(s.userId)!.push(s)
        })

        allReferrals.forEach(r => {
            if (!referralMap.has(r.userId)) referralMap.set(r.userId, [])
            referralMap.get(r.userId)!.push(r)
        })

        const studentByParentMap = new Map<number, any[]>()
        const studentByNameMap = new Map<string, any>()
        
        allStudents.forEach(s => {
            if (s.admissionNumber) eprMap.set(s.admissionNumber.toUpperCase(), s)
            if (s.parent?.mobileNumber) {
                if (!mobileMap.has(s.parent.mobileNumber)) mobileMap.set(s.parent.mobileNumber, [])
                mobileMap.get(s.parent.mobileNumber)!.push(s)
            }
            if (s.parentId) {
                if (!studentByParentMap.has(s.parentId)) studentByParentMap.set(s.parentId, [])
                studentByParentMap.get(s.parentId)!.push(s)
            }
            studentByNameMap.set(s.fullName.trim().toUpperCase(), s)
        })

        const normalizeGrade = (g: string) => {
            if (!g) return 'GRADE1'
            let n = g.toUpperCase().trim()
            
            // 1. Remove ALL non-alphanumeric (removes spaces, hyphens, dots)
            n = n.replace(/[^A-Z0-9]/g, '')
            
            // 2. Standardize common prefixes
            n = n.replace('MONTESSORI', 'MONT')
            n = n.replace('PREMONT', 'PREMONT')
            
            // 3. Handle Roman numeral variations (if any survived stripping)
            n = n.replace(/IIIII/g, '5')
            n = n.replace(/IIII/g, '4')
            n = n.replace(/III/g, '3')
            n = n.replace(/II/g, '2')
            n = n.replace(/I/g, '1')
            
            return n
        }

        gradeFees.forEach(gf => {
            const fee = gf.annualFee_otp || gf.annualFee_wotp || 0
            if (fee > 0) {
                const key = gf.campusId + '-' + normalizeGrade(gf.grade)
                gradeFeeMap.set(key, fee)
            }
        })

        const liabilities: any[] = []

        for (const u of (users as any[])) {
            // OPTIMIZED: Use Map for O(1) lookup
            const myStudents = studentByParentMap.get(u.userId) || []
            u.students = myStudents
            
            // 1. INTEL LOGIC: Identify Ambassador's own child first 
            // (Used for Group A fee source AND as a guard to exclude self-referrals)
            let actualChildFee = u.studentFee || 0 // Used for benefit calculation
            let displayChildFee: number | undefined = undefined // Used for UI display
            let childName = undefined
            let childGrade = undefined
            let childCampus = undefined
            let linkedStudent = undefined

            if (u.childInAchariya) {
                // Priority 1: Verified EPR Number (Source of Truth after verification)
                if (u.childEprNo) {
                    linkedStudent = eprMap.get(u.childEprNo.toUpperCase())
                }

                // Priority 2: Direct parent-child link (Database relation)
                if (!linkedStudent && u.students && u.students.length > 0) {
                    linkedStudent = u.students[0]
                }

                // Priority 3: Mobile Number Match (Diagnostic Fallback)
                if (!linkedStudent && u.mobileNumber) {
                    const mobileMatches = mobileMap.get(u.mobileNumber)
                    if (mobileMatches && mobileMatches.length > 0) {
                        linkedStudent = mobileMatches[0]
                    }
                }

                // Priority 4: Fuzzy Name Match (Fallback for split-accounts/mislinked parents)
                if (!linkedStudent && u.childName) {
                    linkedStudent = studentByNameMap.get(u.childName.trim().toUpperCase())
                }

                if (linkedStudent) {
                    const studentFee = (linkedStudent as any).annualFee || (linkedStudent as any).baseFee || gradeFeeMap.get(linkedStudent.campusId + '-' + normalizeGrade(linkedStudent.grade)) || actualChildFee
                    actualChildFee = studentFee
                    displayChildFee = studentFee
                    childName = linkedStudent.fullName
                    childGrade = linkedStudent.grade
                    childCampus = (linkedStudent.campus as any)?.campusName || undefined
                } else {
                    // FALLBACK: Use data from User Profile if no Student record is linked
                    childName = u.childName || undefined
                    childGrade = u.grade || undefined
                    
                    const cId = (u as any).childCampusId || (u as any).campusId
                    childCampus = cId ? campusMap.get(cId) : undefined
                    
                    // Try to resolve the fee based on the profile grade/campus
                    const rawGrade = u.grade || 'Grade-1'
                    const normGrade = normalizeGrade(rawGrade)
                    const key = cId + '-' + normGrade
                    let profileFee = gradeFeeMap.get(key)
                    
                    // AUDIT GUARD: Handle "MONT" naming split manually if direct key fails
                    if (!profileFee && normGrade.startsWith('MONT')) {
                        // Attempt lookup with and without hyphen if table naming is inconsistent
                        const altKey = cId + '-' + normGrade.replace('-', '')
                        profileFee = gradeFeeMap.get(altKey)
                    }
                    
                    displayChildFee = profileFee || u.studentFee || 0
                    actualChildFee = displayChildFee
                }
            }

            // 2. Self-Referral Guard: Identify student IDs and names already linked to this ambassador
            const ownStudentIds = (u.students || []).map((s: any) => s.studentId)
            if (linkedStudent) ownStudentIds.push(linkedStudent.studentId)

            const normalizedOwnChild = childName?.trim().toUpperCase() || u.childName?.trim().toUpperCase()
            const isGroupAEligible = (u.role === 'Parent' || u.role === 'Staff') && u.childInAchariya === true

            // 3. Map ReferralLeads to ReferralData for the calculator
            const userReferrals = referralMap.get(u.userId) || []
            const currentReferrals: ReferralData[] = userReferrals
                .filter((r: any) => {
                    // 🚨 SENIOR AUDIT GUARD: Exclude Self-Referrals (Own Children)
                    // Policy: Own children not allowed as referrals.
                    // REFINED: We only skip if the student record is ALREADY linked to this parent as their child.
                    // This allows NEW admissions (even siblings) to count for the current cycle.

                    // 1. [RELAXED] Allowing mobile match as many ambassadors register for their leads.
                    // if (r.parentMobile === u.mobileNumber) return false

                    // 2. STAGE 2 GUARD: Check if the referred student is already linked to the ambassador as THEIR child.
                    if (r.student?.studentId && ownStudentIds.includes(r.student.studentId)) return false

                    // 3. [RELAXED] Potential false positives on name match.
                    // if (normalizedOwnChild && r.studentName?.trim().toUpperCase() === normalizedOwnChild) return false

                    // 4. [RELAXED] ERP check handled by studentId above for admitted students.
                    // if (r.admissionNumber && u.childEprNo && r.admissionNumber.trim().toUpperCase() === u.childEprNo.trim().toUpperCase()) return false

                    return true
                })
                .map((r: any) => {
                    const campusName = r.campus || (r.campusId ? campusNameMap.get(r.campusId) : null)
                    const normGradeValue = normalizeGrade(r.gradeInterested || 'Grade-1')
                    const isMontOrPreMont = normGradeValue.includes('MONT') || normGradeValue.includes('PREMONT');
                    const gradeLookup = isMontOrPreMont ? normGradeValue : normalizeGrade('Grade-1');
                    
                    const gradeKey = r.campusId + '-' + gradeLookup
                    const gFeeFromTable = gradeFeeMap.get(gradeKey) 
                    const specialBonusRate = getSpecialBonusRate(campusName)
                    
                    return {
                        id: r.leadId,
                        studentName: r.studentName,
                        admissionNumber: r.admissionNumber,
                        campusId: r.campusId || 0,
                        campusName: campusName || undefined,
                        campus: campusName || undefined, // Added for frontend compatibility
                        grade: r.gradeInterested || 'Grade-1',
                        gradeInterested: r.gradeInterested || 'Grade-1', // Added for frontend compatibility
                        actualFee: Number(r.annualFee) || 0,
                        campusGrade1Fee: Number(gFeeFromTable) || 0,  // Renamed in logic to use the specific grade fee
                        admissionFeeCollected: Number(r.admissionFeeCollected) || 0,
                        donationFeeCollected: Number(r.donationFeeCollected) || 0,
                        specialBonusRate: Number(specialBonusRate) || 0,
                        createdAt: r.createdAt,
                        confirmedDate: r.confirmedDate,
                        studentCreatedAt: r.student?.createdAt,
                        // Fix (Senior Audit): Differentiate missing data by Group
                        feeDataMissing: (isGroupAEligible && !actualChildFee && !specialBonusRate) || 
                                       (!isGroupAEligible && !gFeeFromTable && !specialBonusRate)
                    }
                })

            const calcResult = calculateTotalBenefit(currentReferrals, {
                role: u.role as any,
                childInAchariya: u.childInAchariya,
                studentFee: actualChildFee,
                isFiveStarLastYear: u.isFiveStarMember
            }, slabs as any)

            // FIX (Audit P0-#2): Split settled amounts by settlement type
            // Cash payouts (Admission + Donation) must NOT reduce the waiver balance and vice versa.
            const userSettlements = settlementMap.get(u.userId) || []
            const validSettlements = userSettlements.filter((s: any) => {
                if (s.status !== 'Processed') return false
                const remarks = (s.remarks || '').toLowerCase()
                const isRefund = remarks.includes('registration') || remarks.includes('refund') || s.amount === 25
                return !isRefund
            })

            // 4. PREPARE TYPE-AWARE FIFO POOLS (Unlinked Settlements)
            const genericSettlements = validSettlements.filter((s: any) => !s.referralLeadId)
            let runningAdm = genericSettlements.filter((s: any) => s.benefitType === 'ADMISSION_SHARE').reduce((acc: number, s: any) => acc + (s.amount || 0), 0)
            let runningDon = genericSettlements.filter((s: any) => s.benefitType === 'DONATION_SHARE').reduce((acc: number, s: any) => acc + (s.amount || 0), 0)
            let runningSlab = genericSettlements.filter((s: any) => s.benefitType === 'SLAB_SHARE').reduce((acc: number, s: any) => acc + (s.amount || 0), 0)
            let runningGreedy = genericSettlements.filter((s: any) => !s.benefitType || s.benefitType === 'OTHER' || s.benefitType === 'SPECIAL_BONUS').reduce((acc: number, s: any) => acc + (s.amount || 0), 0)

            const specialBonus = calcResult.specialBonusShare
            const profitShares = calcResult.admissionShare + calcResult.donationShare
            const slabRewards = calcResult.slabShare + (calcResult as any).longTermBaseAmount || 0
            const totalAllEarnings = specialBonus + profitShares + slabRewards

            let finalPayoutEarned = 0
            let finalWaiverEarned = 0
            const isGroupAEligible_OldPlace = true; // Placeholder for clean diff

            if (isGroupAEligible && childName && (displayChildFee ?? 0) > 0) {
                finalWaiverEarned = slabRewards || 0
                finalPayoutEarned = (totalAllEarnings || 0) - finalWaiverEarned
            } else {
                finalPayoutEarned = totalAllEarnings || 0
            }

            const totalSettled = validSettlements.reduce((acc: number, s: any) => acc + (s.amount || 0), 0)
            let rem = totalSettled
            const payoutSettled = Math.min(finalPayoutEarned, rem); rem -= payoutSettled
            const waiverSettled = Math.min(finalWaiverEarned, rem)

            const payoutOutstanding = finalPayoutEarned - payoutSettled
            const waiverOutstanding = finalWaiverEarned - waiverSettled

            const sortedRef = [...currentReferrals].sort((a: any, b: any) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )

            let stdRunningCount = 0
            // ONE PASS FOR ENRICHMENT AND FIFO
            const enrichedReferrals = sortedRef.map((r: any, idx: number) => {
                const count = idx + 1
                const admFee = r.admissionFeeCollected || 0
                const donFee = r.donationFeeCollected || 0

                const isAdmissionSettled = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'ADMISSION_SHARE' && s.status === 'Processed')
                const isDonationSettled = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'DONATION_SHARE' && s.status === 'Processed')
                const isSlabSettled = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'SLAB_SHARE' && s.status === 'Processed')
                const isSpecialBonusSettled = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'SPECIAL_BONUS' && s.status === 'Processed')

                const isAdmissionPending = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'ADMISSION_SHARE' && s.status === 'Pending')
                const isDonationPending = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'DONATION_SHARE' && s.status === 'Pending')
                const isSlabPending = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'SLAB_SHARE' && s.status === 'Pending')
                const isSpecialBonusPending = userSettlements.some((s: any) => s.referralLeadId === r.id && s.benefitType === 'SPECIAL_BONUS' && s.status === 'Pending')

                let slabPercent = 0
                const hasSpecialBonus = (r.specialBonusRate || 0) > 0
                
                if (hasSpecialBonus) {
                    slabPercent = 0
                } else {
                    stdRunningCount++
                    const currentStdCount = stdRunningCount
                    
                    if (u.isFiveStarMember) {
                        slabPercent = 5
                    } else {
                        const getSlabPercent = (c: number) => {
                            const slab = slabs.find((s: any) => s.referralCount === Math.min(c, 5)) || slabs[slabs.length - 1]
                            return slab?.yearFeeBenefitPercent || 0
                        }
                        slabPercent = Math.max(0, getSlabPercent(currentStdCount) - (currentStdCount === 1 ? 0 : getSlabPercent(currentStdCount - 1)))
                    }
                }

                const slabBase = isGroupAEligible ? (actualChildFee || 0) : (r.campusGrade1Fee || 0)
                const referralSlabValue = Math.round((slabBase * slabPercent) / 100)
                const admShareValue = hasSpecialBonus ? 0 : Math.round(admFee * 0.8)
                const donShareValue = hasSpecialBonus ? 0 : Math.round(donFee * 0.5)

                // Virtual FIFO consumption
                const admVirtual = !isAdmissionSettled ? Math.min(admShareValue, runningAdm) : 0
                runningAdm -= admVirtual
                const donVirtual = !isDonationSettled ? Math.min(donShareValue, runningDon) : 0
                runningDon -= donVirtual
                const slabVirtual = !isSlabSettled ? Math.min(referralSlabValue, runningSlab) : 0
                runningSlab -= slabVirtual

                const specialBonusValue = r.specialBonusRate || 0
                const specialVirtual = !isSpecialBonusSettled ? Math.min(specialBonusValue, runningGreedy) : 0
                runningGreedy -= specialVirtual

                const referralTotal = admShareValue + donShareValue + referralSlabValue + specialBonusValue
                let virtuallyPaidAmount = admVirtual + donVirtual + slabVirtual + specialVirtual

                // Count DB-settled amounts (e.g. paid via Release button) that virtual FIFO didn't cover
                const dbSettledValue =
                    (isAdmissionSettled ? admShareValue : 0) +
                    (isDonationSettled ? donShareValue : 0) +
                    (isSlabSettled ? referralSlabValue : 0) +
                    (isSpecialBonusSettled ? specialBonusValue : 0)
                const totalEffectivePaid = virtuallyPaidAmount + dbSettledValue

                let payoutStatus = 'PENDING'
                if (totalEffectivePaid >= referralTotal && referralTotal > 0) payoutStatus = 'PAID'
                else if (totalEffectivePaid > 0) payoutStatus = 'PARTIAL'

                return {
                    ...r,
                    slabPercent,
                    admShareValue,
                    donShareValue,
                    referralSlabValue,
                    specialBonusValue,
                    virtuallyPaidAmount,
                    dbSettledValue,
                    totalEffectivePaid,
                    payoutStatus,
                    // BUTTONS: Disable if database settled OR virtually settled
                    isAdmissionReady: admShareValue > 0 && !isAdmissionSettled && !isAdmissionPending && admVirtual <= 0,
                    isDonationReady: donShareValue > 0 && !isDonationSettled && !isDonationPending && donVirtual <= 0,
                    isSlabReady: referralSlabValue > 0 && !isSlabSettled && !isSlabPending && slabVirtual <= 0,
                    isSpecialBonusReady: specialBonusValue > 0 && !isSpecialBonusSettled && !isSpecialBonusPending && specialVirtual <= 0,
                    isAdmissionSettled: isAdmissionSettled || (admVirtual > 0 && admVirtual >= admShareValue),
                    isDonationSettled: isDonationSettled || (donVirtual > 0 && donVirtual >= donShareValue),
                    isSlabSettled: isSlabSettled || (slabVirtual > 0 && slabVirtual >= referralSlabValue),
                    isSpecialBonusSettled: isSpecialBonusSettled || (specialVirtual > 0 && specialVirtual >= specialBonusValue),
                    isAdmissionPending,
                    isDonationPending,
                    isSlabPending,
                    isSpecialBonusPending
                }
            })

            const missingFeeReferrals = currentReferrals.filter((r: any) => r.feeDataMissing)
            const hasMissingFeeData = (missingFeeReferrals.length > 0) || (isGroupAEligible && !displayChildFee && slabs.length > 0)
            const missingFeeCampuses = Array.from(new Set(missingFeeReferrals.map((r: any) => r.campusName || `Campus ID ${r.campusId}`)))

            let latestReferralTime = 0
                for (const r of currentReferrals) {
                    // Check Entry Date
                    const time1 = r.createdAt ? new Date(r.createdAt).getTime() : 0
                    if (!isNaN(time1) && time1 > latestReferralTime) latestReferralTime = time1

                    // Check Confirmation Date
                    const time2 = r.confirmedDate ? new Date(r.confirmedDate).getTime() : 0
                    if (!isNaN(time2) && time2 > latestReferralTime) latestReferralTime = time2

                    // Check Admission/Sync Date (Student Creation)
                    const time3 = r.studentCreatedAt ? new Date(r.studentCreatedAt).getTime() : 0
                    if (!isNaN(time3) && time3 > latestReferralTime) latestReferralTime = time3
                }

            const isNew = latestReferralTime > (Date.now() - 48 * 60 * 60 * 1000)

            if (isGroupAEligible) {
                // Unified record for Group A (Staff/Parents)
                // Only show if they have referrals in THIS specific year (prevents year bleed-through)
                if (currentReferrals.length > 0) {
                    const totalOutstanding = totalAllEarnings - totalSettled
                    liabilities.push({
                        userId: u.userId,
                        ledgerId: `${u.userId}-A`,
                        // user: u, // REMOVED: Potential circular ref / serialization overhead
                        fullName: u.fullName,
                        mobileNumber: u.mobileNumber,
                        referralCode: u.referralCode || undefined,
                        role: u.role,
                        confirmedReferralCount: currentReferrals.length,
                        benefitPercent: (calcResult as any).tierPercent || 0,
                        campusName: (u as any).assignedCampus || 'N/A',
                        totalEarned: totalAllEarnings,
                        totalSettled: totalSettled,
                        outstanding: totalOutstanding,
                        remainingAmount: totalOutstanding,
                        childName,
                        childEprNo: (u as any).childEprNo || undefined,
                        childGrade,
                        childCampus,
                        childFee: displayChildFee,
                        breakdown: calcResult.breakdown,
                        referrals: enrichedReferrals,
                        slabShare: slabRewards,
                        admissionShare: calcResult.admissionShare,
                        donationShare: calcResult.donationShare,
                        specialBonusShare: calcResult.specialBonusShare,
                        appBonusPercent: calcResult.appBonusPercent,
                        hasMissingFeeData,
                        missingFeeCampuses,
                        academicYear: (u as any).academicYear,
                        aadharNo: (u as any).aadharNo,
                        address: (u as any).address,
                        bankName: (u as any).bankName,
                        accountNumber: (u as any).accountNumber,
                        ifscCode: (u as any).ifscCode,
                        bankAccountDetails: (u as any).bankAccountDetails,
                        type: 'Unified',
                        group: 'Group A',
                        isNew,
                        latestActivityDate: latestReferralTime
                    })
                }
            } else if (currentReferrals.length > 0) {
                // Group B for others (Friends/Alumni/Others) - only if they have referrals this year
                liabilities.push({
                    userId: u.userId,
                    ledgerId: `${u.userId}-B`,
                    // user: u, // REMOVED: Potential circular ref / serialization overhead
                    fullName: u.fullName,
                    mobileNumber: u.mobileNumber,
                    referralCode: u.referralCode || undefined,
                    role: u.role,
                    confirmedReferralCount: currentReferrals.length,
                    benefitPercent: (calcResult as any).tierPercent || 0,
                    campusName: (u as any).assignedCampus || 'N/A',
                    totalEarned: finalPayoutEarned,
                    totalSettled: payoutSettled,
                    outstanding: payoutOutstanding,
                    remainingAmount: payoutOutstanding,
                    childName: undefined,
                    childEprNo: undefined,
                    childGrade: undefined,
                    childCampus: undefined,
                    childFee: undefined,
                    breakdown: calcResult.breakdown,
                    referrals: enrichedReferrals,
                    slabShare: slabRewards,
                    admissionShare: calcResult.admissionShare,
                    donationShare: calcResult.donationShare,
                    specialBonusShare: calcResult.specialBonusShare,
                    appBonusPercent: calcResult.appBonusPercent,
                    hasMissingFeeData,
                    missingFeeCampuses,
                    academicYear: (u as any).academicYear,
                    aadharNo: (u as any).aadharNo,
                    address: (u as any).address,
                    bankName: (u as any).bankName,
                    accountNumber: (u as any).accountNumber,
                    ifscCode: (u as any).ifscCode,
                    bankAccountDetails: (u as any).bankAccountDetails,
                    type: 'Payout',
                    group: 'Group B',
                    isNew,
                    latestActivityDate: latestReferralTime
                })
            }
        }

        // --- ENHANCEMENT: EXPLICIT SORT BY LATEST ACTIVITY ---
        liabilities.sort((a, b) => (b.latestActivityDate || 0) - (a.latestActivityDate || 0))

        return { success: true, data: liabilities, totalCount: totalAmbassadorsWithRewards }

    } catch (error: any) {
        console.error('Error fetching accrued liabilities:', error)
        return { success: false, error: error.message || 'Failed to fetch liabilities' }
    }
}


/**
 * Bulk creates pending settlement records for a list of users.
 */
export async function bulkInitiateSettlements(requests: { userId: number, amount: number, referralBreakdown?: string }[]) {
    const admin = await getCurrentUser()
    if (!admin || !await hasPermission('settlements')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const results = await prisma.$transaction(async (tx) => {
            const created = []
            for (const req of requests) {
                const s = await tx.settlement.create({
                    data: {
                        userId: req.userId,
                        amount: req.amount,
                        status: 'Pending',
                        remarks: req.referralBreakdown
                            ? `[BREAKDOWN:${req.referralBreakdown}] Auto-generated by ${admin.fullName}`
                            : `Auto-generated from Liability Ledger by ${admin.fullName}`
                    }
                })
                created.push(s)
            }
            return created
        })

        if (results.length > 0) {
            await logAction('BULK_CREATE', 'finance', `Bulk initiated ${results.length} settlements from Liability Ledger.`, 'Bulk')
        }

        revalidatePath('/finance')
        return { success: true, count: results.length }
    } catch (error: any) {
        console.error('Error in bulkInitiateSettlements:', error)
        return { success: false, error: error.message }
    }
}

export async function bulkRecordWaiverAdjustments(requests: { userId: number, amount: number, childName?: string, childEprNo?: string, referralBreakdown?: string }[]) {
    const admin = await getCurrentUser()
    if (!admin || !await hasPermission('settlements')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const results = await prisma.$transaction(async (tx) => {
            const created = []
            for (const req of requests) {
                const s = await tx.settlement.create({
                    data: {
                        userId: req.userId,
                        amount: req.amount,
                        status: 'Processed',
                        remarks: req.referralBreakdown
                            ? `[BREAKDOWN:${req.referralBreakdown}] [ERP:${req.childEprNo || 'N/A'}] Institutional Fee Waiver Applied for ${req.childName || 'Child'}`
                            : `[ERP:${req.childEprNo || 'N/A'}] Institutional Fee Waiver Applied for ${req.childName || 'Child'} (Cycle 2026-2027)`,
                        bankReference: `WAIVER-${Date.now()}-${req.userId}`,
                        processedBy: Number(admin.userId),
                        payoutDate: new Date()
                    }
                })
                created.push(s)
            }
            return created
        })

        if (results.length > 0) {
            await logAction('BULK_CREATE', 'finance', `Bulk recorded ${results.length} waiver adjustments with breakdown persistence.`, 'Bulk')
        }

        revalidatePath('/finance')
        return { success: true, count: results.length }
    } catch (error: any) {
        console.error('Error in bulkRecordWaiverAdjustments:', error)
        return { success: false, error: error.message }
    }
}

/**
 * NEW: Releases a specific granular benefit (Part Payout)
 */
export async function releaseGranularBenefit(data: {
    userId: number,
    amount: number,
    benefitType: 'ADMISSION_SHARE' | 'DONATION_SHARE' | 'SLAB_SHARE' | 'SPECIAL_BONUS',
    referralLeadId: number,
    remarks?: string
}) {
    const admin = await getCurrentUser()
    if (!admin || !await hasPermission('settlements')) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // FIX (Audit P1-#7): Validate amount before creating settlement
        if (!data.amount || data.amount <= 0) {
            return { success: false, error: 'Invalid amount: must be greater than ₹0' }
        }

        // Guard: Prevent double-release — FIX (Audit P1-#6): include userId in filter
        const existing = await (prisma.settlement as any).findFirst({
            where: {
                userId: data.userId,
                referralLeadId: data.referralLeadId,
                benefitType: data.benefitType,
                status: { in: ['Pending', 'Processed'] }
            }
        })

        if (existing) {
            return { success: false, error: 'This specific benefit has already been initiated or processed.' }
        }

        // Create the settlement
        const settlement = await (prisma.settlement as any).create({
            data: {
                userId: data.userId,
                amount: data.amount,
                status: 'Pending',
                benefitType: data.benefitType,
                referralLeadId: data.referralLeadId,
                remarks: data.remarks || `${data.benefitType.replace('_', ' ')} for Student #${data.referralLeadId}`
            }
        })

        await logAction('CREATE', 'finance', `Initiated part-payout: ${data.benefitType} (₹${data.amount}) for referral #${data.referralLeadId}`, String(settlement.id))

        revalidatePath('/finance')
        return { success: true, message: 'Part payout initiated successfully.' }
    } catch (error: any) {
        console.error('Error in releaseGranularBenefit:', error)
        return { success: false, error: error.message }
    }
}
