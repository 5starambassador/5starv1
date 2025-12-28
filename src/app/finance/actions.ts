'use server'

import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { EmailService } from '@/lib/email-service'

export async function getFinanceStats() {
    try {
        // 1. Total Collections: Sum of all completed payments + student fees from active students
        // For now, we'll sum the 'paymentAmount' from Users table (User Registration Fee)
        // And assume a mock calculation for Tuition Fees based on Active Students for realism until fully implemented
        const registrationFees = await prisma.user.aggregate({
            _sum: {
                paymentAmount: true
            },
            where: {
                paymentStatus: 'Completed'
            }
        })

        // Mock Tuition Fee Calculation: Count "Active" students * Avg Fee (e.g. 50k)
        // In a real scenario, this would sum actual fee records
        const activeStudentsCount = await prisma.user.count({
            where: {
                childInAchariya: true // Just using this as a proxy for "Active Student" for now
            }
        })
        const estimatedTuition = activeStudentsCount * 15000 // Partial collection assumption

        const totalCollections = (registrationFees._sum.paymentAmount || 0) + estimatedTuition

        // 2. Pending Dues (Mocked based on total potential vs collected)
        const pendingDues = activeStudentsCount * 45000 // Remaining fee

        // 3. Ambassador Payouts (Sum of yearFeeBenefitPercent converted to value? Or just mock for now)
        // Let's sum 'settlements' that are pending
        const pendingSettlements = await prisma.settlement.aggregate({
            _sum: {
                amount: true
            },
            where: {
                status: 'Pending'
            }
        })
        const ambassadorPayouts = pendingSettlements._sum.amount || 0

        // 4. Registration Fees Only
        const regFeesOnly = registrationFees._sum.paymentAmount || 0

        return {
            totalCollections,
            pendingDues,
            ambassadorPayouts,
            regFeesOnly
        }

    } catch (error) {
        console.error('Error fetching finance stats:', error)
        return {
            totalCollections: 0,
            pendingDues: 0,
            ambassadorPayouts: 0,
            regFeesOnly: 0
        }
    }
}

export async function getRecentTransactions() {
    try {
        const transactions = await prisma.user.findMany({
            where: {
                transactionId: { not: null } // Only show users who attempted payment
            },
            select: {
                userId: true,
                fullName: true,
                role: true,
                paymentAmount: true,
                paymentStatus: true,
                transactionId: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        })

        return transactions.map(txn => ({
            id: txn.transactionId || `TXN-${txn.userId}`,
            user: txn.fullName,
            type: 'Registration', // Hardcoded for now as mostly reg fees
            amount: `₹ ${txn.paymentAmount}`,
            date: format(txn.createdAt, 'MMM dd, yyyy'),
            status: txn.paymentStatus
        }))
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return []
    }
}

export async function getAllTransactions() {
    try {
        const transactions = await prisma.user.findMany({
            where: {
                transactionId: { not: null }
            },
            select: {
                userId: true,
                fullName: true,
                role: true,
                paymentAmount: true,
                paymentStatus: true,
                transactionId: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return transactions.map(txn => ({
            id: txn.transactionId || `TXN-${txn.userId}`,
            userId: txn.userId,
            user: txn.fullName,
            role: txn.role,
            type: 'Registration',
            amount: `₹ ${txn.paymentAmount}`,
            date: format(txn.createdAt, 'MMM dd, yyyy, hh:mm a'),
            status: txn.paymentStatus
        }))
    } catch (error) {
        console.error('Error fetching all transactions:', error)
        return []
    }
}

export async function updateTransactionStatus(userId: number, status: string) {
    try {
        await prisma.user.update({
            where: { userId },
            data: { paymentStatus: status }
        })

        // Trigger Email if Completed
        if (status === 'Completed') {
            const user = await prisma.user.findUnique({ where: { userId } })
            if (user && user.email) {
                EmailService.sendPaymentConfirmation(
                    user.email,
                    user.fullName,
                    user.paymentAmount,
                    user.transactionId || 'N/A'
                ).catch(console.error)
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Error updating status:', error)
        return { success: false, error: 'Failed to update' }
    }
}

export async function getFeeStructure() {
    try {
        const fees = await prisma.gradeFee.findMany({
            include: {
                campus: true
            },
            orderBy: {
                campusId: 'asc'
            }
        })
        return fees
    } catch (error) {
        console.error('Error fetching fee structure:', error)
        return []
    }
}

export async function getBenefitPayouts() {
    try {
        const payouts = await prisma.settlement.findMany({
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return payouts.map(p => ({
            id: p.id,
            user: p.user.fullName,
            userId: p.userId,
            amount: `₹ ${p.amount}`,
            status: p.status,
            date: format(p.createdAt, 'MMM dd, yyyy'),
            method: p.paymentMethod || 'Bank Transfer'
        }))
    } catch (error) {
        console.error('Error fetching payouts:', error)
        return []
    }
}

export async function processSettlement(id: number, status: string) {
    try {
        await prisma.settlement.update({
            where: { id },
            data: {
                status: status,
                processedBy: 1 // Mock Admin ID for now
            }
        })
        return { success: true }
    } catch (error) {
        console.error('Error processing settlement:', error)
        return { success: false, error: 'Failed to process' }
    }
}
