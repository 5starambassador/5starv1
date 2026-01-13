'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'
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
                campusId: true
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
                        referralCode: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Decrypt bank details before returning
        const decryptedSettlements = settlements.map(s => ({
            ...s,
            user: {
                ...s.user,
                bankAccountDetails: s.user.bankAccountDetails ? decrypt(s.user.bankAccountDetails) : null
            }
        }))

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

        // 2. Log Action
        await logAction('UPDATE', 'finance', `Processed payout of ₹${settlement.amount} for ${settlement.user.fullName}`, String(settlementId))

        // 3. Create In-App Notification
        await prisma.notification.create({
            data: {
                userId: settlement.userId,
                title: 'Payment Processed',
                message: `Your payout of ₹${settlement.amount.toLocaleString()} has been processed. transaction Ref: ${transactionId}`,
                type: 'payment',
                link: '/finance' // Or dashboard
            }
        })

        // 4. Send Email
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

export async function processBulkPayouts(payouts: { id: number, transactionId: string, remarks?: string }[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        let successCount = 0
        let failureCount = 0

        // We process sequentially or in parallel batches. 
        // A transaction for ALL might be too aggressive if one fails. 
        // Let's do partial success strategy but return stats.

        for (const p of payouts) {
            try {
                // Check if already processed to avoid double processing
                const existing = await prisma.settlement.findUnique({ where: { id: p.id } })
                if (!existing || existing.status === 'Processed') {
                    failureCount++
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
                successCount++
            } catch (e) {
                console.error(`Failed to process settlement ${p.id}`, e)
                failureCount++
            }
        }

        await logAction('BULK_UPDATE', 'finance', `Bulk processed ${successCount} payouts. Failed: ${failureCount}`, 'Bulk')

        revalidatePath('/finance')
        return { success: true, message: `Processed ${successCount} payouts. Failed: ${failureCount}` }

    } catch (error: any) {
        console.error('Bulk Process Error:', error)
        return { success: false, error: error.message || 'Failed to bulk process' }
    }
}
