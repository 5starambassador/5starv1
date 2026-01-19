'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { format } from 'date-fns'
import { decrypt } from '@/lib/encryption'

export async function exportRegistrations(startDate: Date, endDate: Date, selectedColumns?: string[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        const users = await prisma.user.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: end
                }
            },
            include: {
                students: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

        const safeString = (str: string | null | undefined) => `"${(String(str || '')).replace(/"/g, '""')}"`

        // Column Definitions
        const colDefs: Record<string, { header: string, accessor: (u: any) => string | number | null }> = {
            'date': { header: 'Registration Date', accessor: (u) => format(new Date(u.createdAt), 'yyyy-MM-dd') },
            'fullName': { header: 'Full Name', accessor: (u) => u.fullName },
            'mobile': { header: 'Mobile Number', accessor: (u) => `="${u.mobileNumber}"` },
            'email': { header: 'Email', accessor: (u) => u.email },
            'role': { header: 'Role', accessor: (u) => u.role },
            'bankDetails': {
                header: 'Bank Details',
                accessor: (u) => {
                    if (u.bankName && u.accountNumber) {
                        return `${u.bankName} - ${u.accountNumber} (${u.ifscCode || ''})`
                    }
                    if (u.bankAccountDetails) {
                        return decrypt(u.bankAccountDetails)
                    }
                    return 'N/A'
                }
            },
            'referralCode': { header: 'Referral Code', accessor: (u) => u.referralCode },
            'campus': { header: 'Campus', accessor: (u) => u.campusId ? campusMap.get(u.campusId) || 'N/A' : 'N/A' },
            'childName': { header: 'Child Name', accessor: (u) => u.childName },
            'grade': { header: 'Grade', accessor: (u) => u.grade },
            'childEpr': { header: 'Child EPR No', accessor: (u) => u.childEprNo },
            'empId': { header: 'Employee ID', accessor: (u) => u.empId },
            'paymentStatus': { header: 'Payment Status', accessor: (u) => u.paymentStatus },
            'txnId': { header: 'Transaction ID', accessor: (u) => u.transactionId },
            'amount': { header: 'Payment Amount', accessor: (u) => u.paymentAmount },
            'status': { header: 'Account Status', accessor: (u) => u.status },
            'benefitStatus': { header: 'Benefit Status', accessor: (u) => u.benefitStatus }
        }

        // Determine columns to include
        const columnsToExport = selectedColumns && selectedColumns.length > 0
            ? selectedColumns.filter(k => colDefs[k])
            : Object.keys(colDefs)

        const csvHeaders = columnsToExport.map(k => colDefs[k].header).join(',')

        const csvRows = users.map(user => {
            return columnsToExport.map(k => {
                const val = colDefs[k].accessor(user)
                // If it looks like a formula (starts with =), leave it alone, else escape
                if (typeof val === 'string' && val.startsWith('=')) return val
                return safeString(val as string)
            }).join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')
        return { success: true, csv: csvContent, filename: `Registrations_${format(startDate, 'yyyyMMdd')}.csv` }

    } catch (error) {
        console.error('Export Registrations Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}

export async function exportPayouts(startDate: Date, endDate: Date, status?: string, selectedColumns?: string[]) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        const whereClause: any = {
            createdAt: { gte: startDate, lte: end }
        }

        if (status && status !== 'All') {
            whereClause.status = status
        }

        const settlements = await prisma.settlement.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        fullName: true,
                        mobileNumber: true,
                        role: true,
                        bankAccountDetails: true,
                        bankName: true,
                        accountNumber: true,
                        ifscCode: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const colDefs: Record<string, { header: string, accessor: (s: any) => string | number | null }> = {
            'date': { header: 'Request Date', accessor: (s) => format(new Date(s.createdAt), 'yyyy-MM-dd') },
            'id': { header: 'Settlement ID', accessor: (s) => s.id },
            'name': { header: 'Ambassador Name', accessor: (s) => s.user.fullName },
            'mobile': { header: 'Mobile', accessor: (s) => `="${s.user.mobileNumber}"` },
            'role': { header: 'Role', accessor: (s) => s.user.role },
            'amount': { header: 'Amount', accessor: (s) => s.amount },
            'status': { header: 'Status', accessor: (s) => s.status },
            'payoutDate': { header: 'Payout Date', accessor: (s) => s.payoutDate ? format(new Date(s.payoutDate), 'yyyy-MM-dd HH:mm') : '' },
            'bankRef': { header: 'Bank Reference', accessor: (s) => s.bankReference },
            'bankDetails': {
                header: 'Bank Details',
                accessor: (s) => {
                    if (s.user.bankName && s.user.accountNumber) {
                        return `${s.user.bankName} - ${s.user.accountNumber} (${s.user.ifscCode || ''})`
                    }
                    if (s.user.bankAccountDetails) {
                        return decrypt(s.user.bankAccountDetails)
                    }
                    return 'N/A'
                }
            },
            'remarks': { header: 'Remarks', accessor: (s) => s.remarks }
        }

        const columnsToExport = selectedColumns && selectedColumns.length > 0
            ? selectedColumns.filter(k => colDefs[k])
            : Object.keys(colDefs)

        const csvHeaders = columnsToExport.map(k => colDefs[k].header).join(',')
        const safeString = (str: string | null | undefined) => `"${(String(str || '')).replace(/"/g, '""')}"`

        const csvRows = settlements.map(s => {
            return columnsToExport.map(k => {
                const val = colDefs[k].accessor(s)
                if (typeof val === 'string' && val.startsWith('=')) return val
                return safeString(val as string)
            }).join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')
        return { success: true, csv: csvContent, filename: `Payouts_${format(startDate, 'yyyyMMdd')}.csv` }

    } catch (error) {
        console.error('Export Payouts Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}
