'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { format } from 'date-fns'
import { decrypt } from '@/lib/encryption'
import { logAction } from '@/lib/audit-logger'
import { getAccruedPayoutLiabilities, getUsersReadyForRefund } from './finance-actions'
import { getScopeFilter } from '@/lib/permission-service'

export async function exportRegistrations(startDate: Date, endDate: Date, selectedColumns?: string[], academicYear?: string, search?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        const { filter: scopeFilter } = await getScopeFilter('userManagement', { campusNameField: 'assignedCampus' })
        if (!scopeFilter) return { success: false, error: 'Access Denied: You do not have permission to export user data.' }

        const users = await prisma.user.findMany({
            where: {
                ...scopeFilter,
                createdAt: {
                    gte: startDate,
                    lte: end
                },
                ...(academicYear && academicYear !== 'All' ? { academicYear } : {}),
                ...(search ? {
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' } },
                        { mobileNumber: { contains: search, mode: 'insensitive' } },
                        { referralCode: { contains: search, mode: 'insensitive' } },
                        { transactionId: { contains: search, mode: 'insensitive' } },
                        { childName: { contains: search, mode: 'insensitive' } },
                        { childEprNo: { contains: search, mode: 'insensitive' } },
                        { assignedCampus: { contains: search, mode: 'insensitive' } }
                    ]
                } : {})
            },
            include: {
                students: true,
                settlements: {
                    where: { amount: 25, status: 'Processed' },
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                },
                // @ts-ignore: Payment relation exists in schema but IDE is stale
                payments: {
                    where: { paymentStatus: 'SUCCESS' },
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
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
            'bankName': {
                header: 'Bank Name',
                accessor: (u) => {
                    let val = 'N/A'
                    if (u.bankName) val = u.bankName
                    else if (u.bankAccountDetails) {
                        const decrypted = decrypt(u.bankAccountDetails) || ''
                        val = decrypted.split('-')[0]?.trim() || decrypted
                    }
                    if (!val || val === 'N/A') return 'N/A'
                    return /^\d+$/.test(val) ? `="${val}"` : val
                }
            },
            'accountNumber': {
                header: 'Account Number',
                accessor: (u) => {
                    if (u.accountNumber) return `="${u.accountNumber}"` // Force text format
                    if (u.bankAccountDetails) {
                        const val = decrypt(u.bankAccountDetails) || ''
                        // Try to extract middle part "Bank - AccOn - IFSC"
                        const parts = val.split('-')
                        if (parts.length > 1) return `="${parts[1]?.trim()}"`
                    }
                    return 'N/A'
                }
            },
            'ifscCode': {
                header: 'IFSC Code',
                accessor: (u) => {
                    if (u.ifscCode) return u.ifscCode
                    if (u.bankAccountDetails) {
                        const val = decrypt(u.bankAccountDetails) || ''
                        // Try to extract content in brackets
                        const match = val.match(/\((.*?)\)/)
                        return match ? match[1] : 'N/A'
                    }
                    return 'N/A'
                }
            },
            'aadharNo': { header: 'Aadhar Number', accessor: (u) => u.aadharNo ? `="${u.aadharNo}"` : 'N/A' },
            'address': { header: 'Address', accessor: (u) => u.address },
            'academicYear': { header: 'Academic Year', accessor: (u) => u.academicYear },
            'registrationSource': { header: 'Source', accessor: (u) => u.registrationSource || 'Direct' },
            'referralCode': { header: 'Referral Code', accessor: (u) => u.referralCode },
            'campus': { header: 'Campus', accessor: (u) => u.campusId ? campusMap.get(u.campusId) || 'N/A' : 'N/A' },
            'childName': { header: 'Child Name', accessor: (u) => u.childName },
            'grade': { header: 'Grade', accessor: (u) => u.grade },
            'childEpr': { header: 'Child EPR No', accessor: (u) => `="${u.childEprNo}"` },
            'empId': { header: 'Employee ID', accessor: (u) => `="${u.empId}"` },
            'paymentStatus': { header: 'Payment Status', accessor: (u) => u.paymentStatus },
            'txnId': { header: 'Transaction ID', accessor: (u) => u.transactionId || u.payments?.[0]?.transactionId ? `="${u.transactionId || u.payments?.[0]?.transactionId}"` : 'N/A' },
            'amount': { header: 'Payment Amount', accessor: (u) => u.paymentAmount },
            'paymentMethod': { header: 'Payment Method', accessor: (u) => u.payments?.[0]?.paymentMethod || 'N/A' },
            'bankRef': { header: 'Bank Reference (UTR)', accessor: (u) => u.payments?.[0]?.bankReference ? `="${u.payments[0].bankReference}"` : 'N/A' },
            'paidAt': { header: 'Payment Date', accessor: (u) => u.payments?.[0]?.paidAt ? format(new Date(u.payments[0].paidAt), 'yyyy-MM-dd HH:mm') : 'N/A' },
            'status': { header: 'Account Status', accessor: (u) => u.status },
            'benefitStatus': { header: 'Benefit Status', accessor: (u) => u.benefitStatus },
            'settlementDate': {
                header: 'Settlement Date',
                accessor: (u) => {
                    // Priority 1: Processed 25-rupee refund date from Settlement Table
                    const refundSettlement = u.settlements?.[0]
                    if (refundSettlement && refundSettlement.payoutDate) {
                        return format(new Date(refundSettlement.payoutDate), 'yyyy-MM-dd')
                    }
                    // Priority 2: Legacy settlementDate from Payment Table
                    if (u.payments?.[0]?.settlementDate) {
                        return format(new Date(u.payments[0].settlementDate), 'yyyy-MM-dd')
                    }
                    return 'Pending'
                }
            }
        }

        // Determine columns to include
        const columnsToExport = selectedColumns && selectedColumns.length > 0
            ? selectedColumns.filter(k => colDefs[k])
            : Object.keys(colDefs)

        const csvHeaders = columnsToExport.map(k => colDefs[k].header).join(',')

        const csvRows = users.map(user => {
            return columnsToExport.map(k => {
                const val = colDefs[k].accessor(user)
                // If it's already an Excel formula (="VAL"), return as is
                if (typeof val === 'string' && val.startsWith('="')) return val
                return safeString(val as string)
            }).join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        // Audit: log the export event with actor and filter details
        await logAction(
            'EXPORT',
            'security',
            `Exported ${users.length} registrations CSV`,
            null,
            null,
            { from: format(startDate, 'yyyy-MM-dd'), to: format(endDate, 'yyyy-MM-dd'), columns: columnsToExport }
        )

        return { success: true, csv: csvContent, filename: `Registrations_${format(startDate, 'yyyyMMdd')}.csv` }

    } catch (error) {
        console.error('Export Registrations Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}

export async function exportPayouts(startDate: Date, endDate: Date, status?: string, selectedColumns?: string[], academicYear?: string, search?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        let finalStart = startDate
        let finalEnd = new Date(endDate)
        finalEnd.setHours(23, 59, 59, 999)

        // Apply Academic Year Filter via Date Range
        if (academicYear && academicYear !== 'All') {
            const yearRecord = await prisma.academicYear.findUnique({
                where: { year: academicYear }
            })
            if (yearRecord) {
                // We use the year's range if it's more specific or if status is 'All'
                if (status === 'All' || status === 'Processed') {
                    finalStart = yearRecord.startDate
                    finalEnd = yearRecord.endDate
                }
            }
        }

        const { filter: scopeFilter } = await getScopeFilter('settlements', { campusNameField: 'assignedCampus' })
        if (!scopeFilter) return { success: false, error: 'Access Denied: You do not have permission to export payouts.' }

        const whereClause: any = {
            createdAt: { gte: finalStart, lte: finalEnd },
            user: scopeFilter
        }

        if (status && status !== 'All') {
            whereClause.status = status
        }

        if (search) {
            whereClause.OR = [
                { bankReference: { contains: search, mode: 'insensitive' } },
                {
                    user: {
                        OR: [
                            { fullName: { contains: search, mode: 'insensitive' } },
                            { mobileNumber: { contains: search, mode: 'insensitive' } },
                            { referralCode: { contains: search, mode: 'insensitive' } },
                            { childName: { contains: search, mode: 'insensitive' } },
                            { childEprNo: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                }
            ]
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
                        email: true,
                        campusId: true,
                        assignedCampus: true,
                        aadharNo: true,
                        address: true,
                        academicYear: true
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
            'bankRef': { header: 'Bank Reference', accessor: (s) => s.bankReference ? `="${s.bankReference}"` : 'N/A' },
            'bankName': {
                header: 'Bank Name',
                accessor: (s) => {
                    if (s.user.bankName) return s.user.bankName
                    if (s.user.bankAccountDetails) {
                        const val = decrypt(s.user.bankAccountDetails) || ''
                        return val.split('-')[0]?.trim() || val
                    }
                    return 'N/A'
                }
            },
            'accountNumber': {
                header: 'Account Number',
                accessor: (s) => {
                    if (s.user.accountNumber) return `="${s.user.accountNumber}"`
                    if (s.user.bankAccountDetails) {
                        const val = decrypt(s.user.bankAccountDetails) || ''
                        const parts = val.split('-')
                        if (parts.length > 1) return `="${parts[1]?.trim()}"`
                    }
                    return 'N/A'
                }
            },
            'ifscCode': {
                header: 'IFSC Code',
                accessor: (s) => {
                    if (s.user.ifscCode) return s.user.ifscCode
                    if (s.user.bankAccountDetails) {
                        const val = decrypt(s.user.bankAccountDetails) || ''
                        const match = val.match(/\((.*?)\)/)
                        return match ? match[1] : 'N/A'
                    }
                    return 'N/A'
                }
            },
            'aadharNo': { header: 'Aadhar No', accessor: (s) => `="${s.user.aadharNo || ''}"` },
            'address': { header: 'Address', accessor: (s) => (s.user.address || '').replace(/"/g, '""') },
            'academicYear': { header: 'Academic Year', accessor: (s) => s.user.academicYear || 'N/A' },
            'campus': { header: 'Campus', accessor: (s) => s.user.assignedCampus || 'N/A' },
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

        // Audit: log the export event
        await logAction(
            'EXPORT',
            'security',
            `Exported ${settlements.length} payout records CSV`,
            null,
            null,
            { from: format(startDate, 'yyyy-MM-dd'), to: format(endDate, 'yyyy-MM-dd'), status: status || 'All', columns: columnsToExport }
        )

        return { success: true, csv: csvContent, filename: `Payouts_${format(startDate, 'yyyyMMdd')}.csv` }

    } catch (error) {
        console.error('Export Payouts Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}

export async function exportRejectedPayments(search?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
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
                    select: { fullName: true, mobileNumber: true, email: true, role: true, aadharNo: true, address: true, academicYear: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        })

        const csvHeaders = 'Rejection Date,Full Name,Mobile,Role,Email,Aadhar No,Address,Academic Year,UTR / Ref,Amount,Rejection Reason'
        const safeString = (str: string | null | undefined) => `"${(String(str || '')).replace(/"/g, '""')}"`

        const csvRows = payments.map(p => {
            return [
                format(new Date(p.updatedAt), 'yyyy-MM-dd HH:mm'),
                safeString(p.user.fullName),
                `="${p.user.mobileNumber}"`,
                safeString(p.user.role),
                safeString(p.user.email),
                `="${p.user.aadharNo || ''}"`,
                safeString(p.user.address),
                safeString(p.user.academicYear),
                `="${p.transactionId || 'N/A'}"`,
                p.orderAmount,
                safeString(p.adminRemarks)
            ].join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        // Audit: log the export event
        await logAction(
            'EXPORT',
            'security',
            `Exported ${payments.length} rejected payment records CSV`,
            null,
            null,
            { search: search || 'none' }
        )

        return {
            success: true,
            csv: csvContent,
            filename: `Rejected_Payments_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
        }

    } catch (error) {
        console.error('Export Rejected Payments Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}

export async function exportRefunds(startDate: Date, endDate: Date, selectedColumns?: string[], academicYear?: string, type: 'Ready' | 'History' = 'History', search?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        let users: any[] = []

        if (type === 'Ready') {
            const res = await getUsersReadyForRefund(academicYear)
            if (res.success && res.data) {
                users = res.data.filter((u: any) => {
                    const created = new Date(u.createdAt)
                    return created >= start && created <= end
                })
            }
        } else {
            const { filter: scopeFilter } = await getScopeFilter('settlements', { campusNameField: 'assignedCampus' })
            if (!scopeFilter) return { success: false, error: 'Access Denied' }

            users = await prisma.user.findMany({
                where: {
                    ...scopeFilter,
                    paymentAmount: { gt: 0 },
                    createdAt: { gte: start, lte: end },
                    ...(academicYear && academicYear !== 'All' ? { academicYear } : {}),
                    OR: [
                        { payments: { some: { adminRemarks: { contains: 'REFUNDED', mode: 'insensitive' } } } },
                        { settlements: { some: { amount: 25, status: 'Processed' } } }
                    ],
                    ...(search ? {
                        OR: [
                            { fullName: { contains: search, mode: 'insensitive' } },
                            { mobileNumber: { contains: search, mode: 'insensitive' } },
                            { referralCode: { contains: search, mode: 'insensitive' } },
                            { childName: { contains: search, mode: 'insensitive' } },
                            { childEprNo: { contains: search, mode: 'insensitive' } }
                        ]
                    } : {})
                },
                include: {
                    payments: {
                        where: { paymentStatus: 'Success' },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                    settlements: {
                        where: { amount: 25, status: 'Processed' },
                        select: { amount: true, status: true, bankReference: true, payoutDate: true, remarks: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        }

        const safeString = (str: string | null | undefined) => `"${(String(str || '')).replace(/"/g, '""')}"`

        const colDefs: Record<string, { header: string, accessor: (u: any) => string | number | null }> = {
            'fullName': { header: 'Full Name', accessor: (u) => u.fullName },
            'mobile': { header: 'Mobile Number', accessor: (u) => `="${u.mobileNumber}"` },
            'campus': { header: 'Campus', accessor: (u) => u.campusName || u.assignedCampus || 'N/A' },
            'amount': { header: 'Refund Amount', accessor: (u) => 25 },
            'status': { header: 'Refund Status', accessor: (u) => type === 'Ready' ? 'Pending' : 'Processed' },
            'payoutDate': {
                header: type === 'Ready' ? 'Registration Date' : 'Refund Date',
                accessor: (u) => {
                    if (type === 'Ready') return format(new Date(u.createdAt), 'yyyy-MM-dd')
                    const settlement = u.settlements?.[0]
                    return settlement?.payoutDate ? format(new Date(settlement.payoutDate), 'yyyy-MM-dd') : 'Processed'
                }
            },
            'bankName': { header: 'Bank Name', accessor: (u) => u.bankName || 'N/A' },
            'accountNo': { header: 'Account Number', accessor: (u) => u.accountNumber ? `="${u.accountNumber}"` : 'N/A' },
            'ifsc': { header: 'IFSC Code', accessor: (u) => u.ifscCode || 'N/A' },
            'bankRef': { header: 'Bank Ref (UTR)', accessor: (u) => u.settlements?.[0]?.bankReference ? `="${u.settlements[0].bankReference}"` : 'N/A' },
            'remarks': { header: 'Audit Remarks', accessor: (u) => u.settlements?.[0]?.remarks || u.payments?.[0]?.adminRemarks || '-' }
        }

        const columnsToExport = selectedColumns && selectedColumns.length > 0
            ? selectedColumns.filter(k => colDefs[k])
            : Object.keys(colDefs)

        const csvHeaders = columnsToExport.map(k => colDefs[k].header).join(',')
        const csvRows = users.map(user => {
            return columnsToExport.map(k => {
                const val = colDefs[k].accessor(user)
                if (typeof val === 'string' && val.startsWith('=')) return val
                return safeString(val as string)
            }).join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        await logAction('EXPORT', 'finance', `Exported ${users.length} refunds (${type}) CSV`, null)

        return {
            success: true,
            csv: csvContent,
            filename: `${type}_Refunds_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
        }

    } catch (error) {
        console.error('Export Refunds Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}

export async function exportWaivers(startDate: Date, endDate: Date, selectedColumns?: string[], academicYear?: string, search?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        let finalStart = startDate
        let finalEnd = new Date(endDate)
        finalEnd.setHours(23, 59, 59, 999)

        // Apply Academic Year Filter via Date Range (Waivers are Settlements)
        if (academicYear && academicYear !== 'All') {
            const yearRecord = await prisma.academicYear.findUnique({
                where: { year: academicYear }
            })
            if (yearRecord) {
                finalStart = yearRecord.startDate
                finalEnd = yearRecord.endDate
            }
        }

        const { filter: scopeFilter } = await getScopeFilter('settlements', { campusNameField: 'assignedCampus' })
        if (!scopeFilter) return { success: false, error: 'Access Denied' }

        const settlements = await prisma.settlement.findMany({
            where: {
                user: scopeFilter as any,
                status: 'Processed',
                remarks: { contains: 'waiver', mode: 'insensitive' },
                createdAt: { gte: finalStart, lte: finalEnd },
                ...(search ? {
                    OR: [
                        { bankReference: { contains: search, mode: 'insensitive' } },
                        {
                            user: {
                                OR: [
                                    { fullName: { contains: search, mode: 'insensitive' } },
                                    { mobileNumber: { contains: search, mode: 'insensitive' } },
                                    { referralCode: { contains: search, mode: 'insensitive' } }
                                ]
                            }
                        }
                    ]
                } : {})
            },
            include: {
                user: {
                    select: {
                        fullName: true,
                        mobileNumber: true,
                        role: true,
                        aadharNo: true,
                        address: true,
                        academicYear: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const safeString = (str: string | null | undefined) => `"${(String(str || '')).replace(/"/g, '""')}"`

        const colDefs: Record<string, { header: string, accessor: (s: any) => string | number | null }> = {
            'fullName': { header: 'Ambassador Name', accessor: (s) => s.user.fullName },
            'mobile': { header: 'Mobile Number', accessor: (s) => `="${s.user.mobileNumber}"` },
            'aadharNo': { header: 'Aadhar No', accessor: (s) => `="${s.user.aadharNo || ''}"` },
            'address': { header: 'Address', accessor: (s) => (s.user.address || '').replace(/"/g, '""') },
            'academicYear': { header: 'Academic Year', accessor: (s) => s.user.academicYear || 'N/A' },
            'childName': {
                header: 'Child Name',
                accessor: (s) => {
                    const r = s.remarks || ''
                    return r.includes('[BREAKDOWN:') ? r.split('[BREAKDOWN:')[1].split(']')[0] : 'N/A'
                }
            },
            'erpNo': {
                header: 'ERP No',
                accessor: (s) => {
                    const r = s.remarks || ''
                    return r.includes('[ERP:') ? r.split('[ERP:')[1].split(']')[0] : 'N/A'
                }
            },
            'amount': { header: 'Waiver Amount', accessor: (s) => s.amount },
            'date': { header: 'Applied Date', accessor: (s) => s.payoutDate ? format(new Date(s.payoutDate), 'yyyy-MM-dd') : format(new Date(s.createdAt), 'yyyy-MM-dd') },
            'bankRef': { header: 'Reference ID', accessor: (s) => s.bankReference ? `="${s.bankReference}"` : 'N/A' },
            'remarks': { header: 'Remarks', accessor: (s) => s.remarks || '-' }
        }

        const columnsToExport = selectedColumns && selectedColumns.length > 0
            ? selectedColumns.filter(k => colDefs[k])
            : Object.keys(colDefs)

        const csvHeaders = columnsToExport.map(k => colDefs[k].header).join(',')
        const csvRows = settlements.map(settlement => {
            return columnsToExport.map(k => {
                const val = colDefs[k].accessor(settlement)
                if (typeof val === 'string' && val.startsWith('=')) return val
                return safeString(val as string)
            }).join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        await logAction('EXPORT', 'finance', `Exported ${settlements.length} waivers CSV`, null)

        return {
            success: true,
            csv: csvContent,
            filename: `Waiver_History_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
        }

    } catch (error) {
        console.error('Export Waivers Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}

export async function exportLiabilities(startDate: Date, endDate: Date, selectedColumns?: string[], academicYear?: string, group?: 'A' | 'B', search?: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    try {
        // Fix: Pass pageSize: 10000 and the group (mode) to getAccruedPayoutLiabilities
        const res = await getAccruedPayoutLiabilities(academicYear, search, undefined, 1, 50000, group)
        if (!res.success || !res.data) {
            return { success: false, error: res.error || 'Failed to fetch liabilities' }
        }

        let liabilities = res.data
        if (group) {
            liabilities = liabilities.filter((l: any) => l.group.includes(group))
        }

        const safeString = (str: string | null | undefined) => `"${(String(str || '')).replace(/"/g, '""')}"`

        const colDefs: Record<string, { header: string, accessor: (l: any) => string | number | null }> = {
            'academicYear': { header: 'Academic Year', accessor: (l) => l.academicYear || academicYear || 'N/A' },
            'fullName': { header: 'Ambassador Name', accessor: (l) => l.fullName },
            'mobile': { header: 'Mobile Number', accessor: (l) => `="${l.mobileNumber}"` },
            'role': { header: 'Role', accessor: (l) => l.role },
            'aadharNo': { header: 'Aadhar No', accessor: (l) => `="${l.aadharNo || ''}"` },
            'address': { header: 'Address', accessor: (l) => (l.address || '').replace(/"/g, '""') },
            'campus': { header: 'Ambassador Campus', accessor: (l) => l.campusName || 'N/A' },
            'bankName': {
                header: 'Bank Name',
                accessor: (l) => {
                    let val = 'N/A'
                    if (l.bankName) val = l.bankName
                    else if (l.bankAccountDetails) {
                        const decrypted = decrypt(l.bankAccountDetails) || ''
                        val = decrypted.split('-')[0]?.trim() || decrypted
                    }
                    if (!val || val === 'N/A') return 'N/A'
                    // If it looks purely numeric, wrap it to avoid Excel scientific notation
                    return /^\d+$/.test(val) ? `="${val}"` : val
                }
            },
            'accountNumber': {
                header: 'Account Number',
                accessor: (l) => {
                    if (l.accountNumber) return `="${l.accountNumber}"`
                    if (l.bankAccountDetails) {
                        const val = decrypt(l.bankAccountDetails) || ''
                        const parts = val.split('-')
                        if (parts.length > 1) return `="${parts[1]?.trim()}"`
                    }
                    return 'N/A'
                }
            },
            'ifscCode': {
                header: 'IFSC Code',
                accessor: (l) => {
                    let val = 'N/A'
                    if (l.ifscCode) val = l.ifscCode
                    else if (l.bankAccountDetails) {
                        const decrypted = decrypt(l.bankAccountDetails) || ''
                        const match = decrypted.match(/\((.*?)\)/)
                        val = match ? match[1] : (decrypted.split('-')[2]?.trim() || 'N/A')
                    }
                    return val === 'N/A' ? val : `="${val}"`
                }
            },
            'referrals': { header: 'Confirmed Referrals', accessor: (l) => l.confirmedReferralCount },
            'totalEarned': { header: 'Total Earned', accessor: (l) => l.totalEarned },
            'totalSettled': { header: 'Total Settled', accessor: (l) => l.totalSettled },
            'remaining': { header: 'Outstanding', accessor: (l) => l.remainingAmount },
            'slab': { header: 'Slab Reward', accessor: (l) => l.slabShare || 0 },
            'admission': { header: 'Admission Share', accessor: (l) => l.admissionShare || 0 },
            'donation': { header: 'Donation Share', accessor: (l) => l.donationShare || 0 },
            'childName': { header: 'Child Name', accessor: (l) => l.childName || 'N/A' },
            'erpNo': { header: 'Child ERP No', accessor: (l) => l.childEprNo ? `="${l.childEprNo}"` : 'N/A' },
            'childGrade': { header: 'Child Grade', accessor: (l) => l.childGrade || 'N/A' },
            'childFee': { header: 'Child Fee', accessor: (l) => l.childFee || 0 },
            'group': { header: 'Ledger Group', accessor: (l) => l.group }
        }

        const maxReferrals = Math.max(...liabilities.map((l: any) => (l.referrals || []).length), 1)

        let columnsToExport: string[] = []
        if (selectedColumns && selectedColumns.length > 0) {
            selectedColumns.forEach(k => {
                if (k === 'referralDetails') {
                    for (let i = 0; i < maxReferrals; i++) {
                        const refKey = `referral_col_${i}`
                        colDefs[refKey] = {
                            header: `Referral ${i + 1}: Name - ERP No - Grade - Campus - Status`,
                            accessor: (l: any) => {
                                const r = (l.referrals || [])[i]
                                if (!r) return ''
                                return `${r.studentName || 'Unknown'} - ${r.admissionNumber || 'N/A'} - ${r.gradeInterested || 'N/A'} - ${r.campus || 'N/A'} - ${r.payoutStatus || 'PENDING'}`
                            }
                        }
                        columnsToExport.push(refKey)
                    }
                } else if (colDefs[k]) {
                    columnsToExport.push(k)
                }
            })
        } else {
            // Default logic
            Object.keys(colDefs).forEach(k => {
                columnsToExport.push(k)
            })
            // If referralDetails was intended to be default, we add it here too
            for (let i = 0; i < maxReferrals; i++) {
                const refKey = `referral_col_${i}`
                colDefs[refKey] = {
                    header: `Referral ${i + 1}: Name - ERP No - Grade - Campus - Status`,
                    accessor: (l: any) => {
                        const r = (l.referrals || [])[i]
                        if (!r) return ''
                        return `${r.studentName || 'Unknown'} - ${r.admissionNumber || 'N/A'} - ${r.gradeInterested || 'N/A'} - ${r.campus || 'N/A'} - ${r.payoutStatus || 'PENDING'}`
                    }
                }
                columnsToExport.push(refKey)
            }
        }

        const csvHeaders = columnsToExport.map(k => colDefs[k].header).join(',')
        const csvRows = liabilities.map(lib => {
            return columnsToExport.map(k => {
                const val = colDefs[k].accessor(lib)
                if (typeof val === 'string' && val.startsWith('="')) return val
                return safeString(val as string)
            }).join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        await logAction('EXPORT', 'finance', `Exported ${liabilities.length} liabilities CSV`, null)

        return {
            success: true,
            csv: csvContent,
            filename: `Liability_Ledger_${group || 'ALL'}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
        }

    } catch (error) {
        console.error('Export Liabilities Error:', error)
        return { success: false, error: 'Failed to generate export' }
    }
}
