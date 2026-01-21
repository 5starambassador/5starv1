'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'

import { BadgeCheck, CreditCard, Download, FileText } from 'lucide-react'

import { format } from 'date-fns'
// PDF logic moved to dynamic import inside generateReceipt to fix Turbopack chunk errors
import { exportToCSV } from '@/lib/export-utils'
import { toast } from 'sonner'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportRegistrations } from '@/app/export-actions'

interface Registration {
    id: number
    fullName: string
    mobileNumber: string
    role: string
    assignedCampus: string | null
    paymentAmount: number
    transactionId: string | null
    createdAt: string | Date
    campus?: {
        campusName: string
    }
    // New nested payments from finance-actions
    payments?: {
        paymentMethod: string | null
        transactionId: string | null
        bankReference: string | null
        paidAt: Date | string | null
        settlementDate: Date | string | null
    }[]
}

interface RegistrationTableProps {
    data: Registration[]
}

export function RegistrationTable({ data }: RegistrationTableProps) {
    const [filter, setFilter] = useState('All')
    const [showExportModal, setShowExportModal] = useState(false)

    // Helper to get payment details
    const getPaymentDetails = (row: Registration) => {
        // Return first success payment or default to row
        return row.payments?.[0] || {
            paymentMethod: null,
            transactionId: row.transactionId,
            bankReference: null,
            paidAt: row.createdAt,
            settlementDate: null
        }
    }

    // Columns Definition
    const columns = [
        {
            header: 'User Details',
            accessorKey: 'fullName',
            cell: (row: Registration) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white">{row.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.mobileNumber}</div>
                </div>
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: (row: Registration) => (
                <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider border border-gray-200">
                    {row.role}
                </span>
            ),
            filterable: true
        },
        {
            header: 'Campus',
            accessorKey: 'assignedCampus',
            cell: (row: any) => (row.campus?.campusName || row.assignedCampus || <span className="text-gray-300">-</span>),
            filterable: true
        },
        {
            header: 'Fee Paid',
            accessorKey: 'paymentAmount',
            sortable: true,
            cell: (row: Registration) => (
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold font-mono">
                    <span className="text-xs">₹</span>
                    {row.paymentAmount?.toLocaleString() || 0}
                </div>
            )
        },
        {
            header: 'Method',
            accessorKey: 'paymentMethod',
            cell: (row: Registration) => {
                const details = getPaymentDetails(row)
                return (
                    <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                        {details.paymentMethod || 'N/A'}
                    </span>
                )
            }
        },
        {
            header: 'Transaction / UTR',
            accessorKey: 'transactionId',
            cell: (row: Registration) => {
                const details = getPaymentDetails(row)
                // Show Bank Ref (UTR) if available, otherwise Gateway ID
                const ref = details.bankReference || details.transactionId || row.transactionId
                return (
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 w-fit">
                            {ref || 'N/A'}
                        </span>
                        {details.bankReference && details.transactionId && (
                            <span className="text-[9px] text-gray-400 mt-0.5">GW: {details.transactionId}</span>
                        )}
                    </div>
                )
            },
            filterable: true
        },
        {
            header: 'Date',
            accessorKey: 'createdAt',
            sortable: true,
            cell: (row: Registration) => {
                const details = getPaymentDetails(row)
                const date = details.paidAt ? new Date(details.paidAt) : new Date(row.createdAt)
                return format(date, 'dd MMM yyyy')
            }
        },
        {
            header: 'Settlement',
            accessorKey: 'settlementDate',
            cell: (row: Registration) => {
                const details = getPaymentDetails(row)
                if (!details.settlementDate) return <span className="text-xs text-gray-400 italic">Pending</span>
                return (
                    <div className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                        <BadgeCheck size={12} />
                        {format(new Date(details.settlementDate), 'dd MMM')}
                    </div>
                )
            }
        },
        {
            header: 'Receipt',
            accessorKey: 'id',
            cell: (row: Registration) => (
                <button
                    onClick={() => generateReceipt(row)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Download Receipt"
                >
                    <FileText size={16} />
                </button>
            )
        }
    ]

    const generateReceipt = async (data: Registration) => {
        const tid = toast.loading('Generating Receipt...')
        try {
            const { generateReceiptPDF } = await import('@/lib/pdf-export')
            generateReceiptPDF(data)
            toast.dismiss(tid)
        } catch (error) {
            console.error('Receipt Generation Error:', error)
            toast.error('Failed to generate receipt', { id: tid })
        }
    }

    const handleExport = () => {
        exportToCSV(data, 'Registration_Transactions', [
            { header: 'Full Name', accessor: (r) => r.fullName },
            { header: 'Mobile', accessor: (r) => r.mobileNumber },
            { header: 'Role', accessor: (r) => r.role },
            { header: 'Campus', accessor: (r) => r.assignedCampus || '-' },
            { header: 'Amount', accessor: (r) => r.paymentAmount },
            { header: 'Transaction ID', accessor: (r) => r.transactionId || 'N/A' },
            { header: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString() }
        ])
    }

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportRegistrations(start, end, selectedColumns)
        if (res.success && res.csv) {
            // Trigger Download
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob)
                link.setAttribute('href', url)
                link.setAttribute('download', res.filename || 'export.csv')
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
            toast.success('Export downloaded successfully')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'date', label: 'Registration Date', defaultChecked: true },
        { id: 'fullName', label: 'Full Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile Number', defaultChecked: true },
        { id: 'email', label: 'Email', defaultChecked: true },
        { id: 'role', label: 'Role', defaultChecked: true },
        { id: 'bankName', label: 'Bank Name', defaultChecked: false },
        { id: 'accountNumber', label: 'Account Number', defaultChecked: false },
        { id: 'ifscCode', label: 'IFSC Code', defaultChecked: false },
        { id: 'referralCode', label: 'Referral Code', defaultChecked: true },
        { id: 'campus', label: 'Campus', defaultChecked: true },
        { id: 'childName', label: 'Child Name', defaultChecked: false },
        { id: 'grade', label: 'Grade', defaultChecked: false },
        { id: 'childEpr', label: 'Child EPR No', defaultChecked: false },
        { id: 'empId', label: 'Employee ID', defaultChecked: false },
        { id: 'paymentStatus', label: 'Payment Status', defaultChecked: true },
        { id: 'txnId', label: 'Transaction ID', defaultChecked: true },
        { id: 'amount', label: 'Payment Amount', defaultChecked: true },
        { id: 'paymentMethod', label: 'Payment Method', defaultChecked: true },
        { id: 'bankRef', label: 'Bank Ref (UTR)', defaultChecked: true },
        { id: 'paidAt', label: 'Payment Date', defaultChecked: true },
        { id: 'settlementDate', label: 'Settlement Date', defaultChecked: true },
        { id: 'status', label: 'Account Status', defaultChecked: true },
        { id: 'benefitStatus', label: 'Benefit Status', defaultChecked: false }
    ]

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-center px-1">
                <div className="flex gap-2">
                    {/* Cleaned up redundant header info */}
                </div>

                <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20"
                >
                    <Download size={14} />
                    Export Report
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey="fullName"
                    pageSize={10}
                />
            </div>
            <ExportDateRangeModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleServerExport}
                title="Export Registrations"
                columns={exportColumns}
            />
        </div>
    )
}
