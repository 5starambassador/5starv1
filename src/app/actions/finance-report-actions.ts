'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { getScopeFilter } from '@/lib/permission-service'
import { format, startOfDay, endOfDay } from 'date-fns'

export type ReportType = 'daily-collection' | 'pending-fees' | 'payouts'

export async function getFinanceReportData(type: ReportType, startDate: string, endDate: string) {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    // Strict Role Check
    const allowedRoles = ['Super Admin', 'Admin', 'Finance Admin', 'Campus Head']
    if (!allowedRoles.some(r => user.role.includes(r))) {
        return { error: 'Access Denied: Finance Reports restricted to Admins only' }
    }

    // Get scope filter for settlements module (finance data)
    const { filter: scopeFilter, isReadOnly } = await getScopeFilter('settlements', {
        campusField: 'campusId',
        useCampusName: false
    })

    // If no access, return error
    if (scopeFilter === null) {
        return { error: 'Access Denied: No permission to view finance data' }
    }

    // For campus-level scope, we need the user's campus ID for filtering
    const userCampusId = (user as any).campusId
    const isCampusScoped = user.role.includes('Campus') && userCampusId
    const campusFilter = isCampusScoped ? { campusId: userCampusId } : {}

    const start = startOfDay(new Date(startDate))
    const end = endOfDay(new Date(endDate))

    try {
        let data: Record<string, any>[] = []
        let columns: string[] = []
        let summary: Record<string, any> = {}

        if (type === 'daily-collection') {
            // Fetch Completed Registration Payments
            const payments = await prisma.user.findMany({
                where: {
                    ...scopeFilter,
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
                    ...scopeFilter,
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
                    ...scopeFilter,
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
