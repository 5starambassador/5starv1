'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { format, startOfDay, endOfDay } from 'date-fns'

export type ReportType = 'daily-collection' | 'pending-fees' | 'payouts'

export async function getFinanceReportData(type: ReportType, startDate: string, endDate: string) {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    // Strict Role Check
    const allowedRoles = ['Super Admin', 'Admin', 'Finance Admin']
    if (!allowedRoles.some(r => user.role.includes(r))) {
        return { error: 'Access Denied: Finance Reports restrict to Admins only' }
    }

    const start = startOfDay(new Date(startDate))
    const end = endOfDay(new Date(endDate))

    try {
        let data = []
        let columns = []
        let summary = {}

        if (type === 'daily-collection') {
            // Fetch Completed Registration Payments
            const payments = await prisma.user.findMany({
                where: {
                    paymentStatus: 'Completed',
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                select: {
                    userId: true,
                    fullName: true,
                    paymentAmount: true,
                    transactionId: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            })

            data = payments.map(p => ({
                id: p.userId,
                Date: format(p.createdAt, 'yyyy-MM-dd HH:mm'),
                Name: p.fullName,
                'Transaction ID': p.transactionId || 'N/A',
                Amount: `₹${p.paymentAmount}`, // String for display
                amountValue: p.paymentAmount // Number for sums
            }))

            const total = payments.reduce((sum, p) => sum + p.paymentAmount, 0)
            summary = { 'Total Collection': `₹${total}`, 'Record Count': payments.length }
            columns = ['Date', 'Name', 'Transaction ID', 'Amount']
        }

        else if (type === 'pending-fees') {
            // Fetch Pending Registration Users
            const pending = await prisma.user.findMany({
                where: {
                    paymentStatus: 'Pending',
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                select: {
                    userId: true,
                    fullName: true,
                    mobileNumber: true,
                    createdAt: true,
                    paymentAmount: true
                },
                orderBy: { createdAt: 'desc' }
            })

            data = pending.map(p => ({
                id: p.userId,
                Date: format(p.createdAt, 'yyyy-MM-dd'),
                Name: p.fullName,
                Mobile: p.mobileNumber,
                'Predicted Fee': `₹${p.paymentAmount}`
            }))

            summary = { 'Pending Records': pending.length, 'Potential Revenue': `₹${pending.reduce((sum, p) => sum + p.paymentAmount, 0)}` }
            columns = ['Date', 'Name', 'Mobile', 'Predicted Fee']
        }

        else if (type === 'payouts') {
            // Fetch Settlements
            const settlements = await prisma.settlement.findMany({
                where: {
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                include: {
                    user: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            })

            data = settlements.map(s => ({
                id: s.id,
                Date: format(s.createdAt, 'yyyy-MM-dd'),
                'Beneficiary': s.user.fullName,
                Status: s.status,
                Method: s.paymentMethod || 'Bank',
                Amount: `₹${s.amount}`,
                amountValue: s.amount
            }))

            const totalPayout = settlements.reduce((sum, s) => sum + s.amount, 0)
            summary = { 'Total Payouts': `₹${totalPayout}`, 'Count': settlements.length }
            columns = ['Date', 'Beneficiary', 'Amount', 'Status', 'Method']
        }

        return { success: true, data, columns, summary }

    } catch (error) {
        console.error('Report Generation Error:', error)
        return { error: 'Failed to generate report' }
    }
}
