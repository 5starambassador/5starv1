'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DataTable } from '@/components/ui/DataTable'


import { BadgeCheck, CreditCard, Download, FileText, History as HistoryIcon, FileDown } from 'lucide-react'

import { format } from 'date-fns'
import { formatIndianCurrency } from '@/lib/currency-utils'
// PDF logic moved to dynamic import inside generateReceipt to fix Turbopack chunk errors
import { exportToCSV } from '@/lib/export-utils'
import { toast } from 'sonner'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportRegistrations } from '@/app/export-actions'

interface Registration {
    userId: number
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
        adminRemarks: string | null
    }[]
    settlements?: {
        amount: number
        status: string
        bankReference: string | null
        payoutDate: Date | string | null
        remarks: string | null
    }[]
}

interface RegistrationTableProps {
    data: Registration[]
    totalResults?: number
    currentPage?: number
    search?: string
    onSearchChange?: (val: string) => void
    academicYear?: string
    onPageChange?: (page: number) => void
}

export function RegistrationTable({ 
    data, 
    totalResults = 0, 
    currentPage = 1, 
    search = '', 
    onSearchChange, 
    academicYear,
    onPageChange
}: RegistrationTableProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [filter, setFilter] = useState('All')

    const [showExportModal, setShowExportModal] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    // Helper to get payment details
    const getPaymentDetails = (row: Registration) => {
        // Return first success payment or default to row
        return row.payments?.[0] || {
            paymentMethod: null,
            transactionId: row.transactionId,
            bankReference: null,
            paidAt: row.createdAt,
            settlementDate: null,
            adminRemarks: null
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
            filterable: true,
            filterOptions: ['Parent', 'Staff', 'Alumni', 'Others']
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
                <div suppressHydrationWarning className="flex items-center gap-1.5 text-emerald-600 font-bold font-mono">
                    <span className="text-xs">₹</span>
                    {formatIndianCurrency(row.paymentAmount || 0)}
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
                // Restore original focus: Only show Registration Reference
                const registrationRef = details.bankReference || details.transactionId || row.transactionId
                return (
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 w-fit">
                            {registrationRef || 'N/A'}
                        </span>
                        {details.bankReference && details.transactionId && registrationRef !== details.transactionId && (
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
                return <span suppressHydrationWarning>{format(date, 'dd MMM yyyy')}</span>
            }
        },
        {
            header: 'Settlement',
            accessorKey: 'settlementDate',
            cell: (row: Registration) => {
                const details = getPaymentDetails(row)
                const settlement = row.settlements?.find((s: any) => s.amount === 25 && s.status === 'Processed')
                const date = settlement?.payoutDate || details.settlementDate

                if (!date) return <span className="text-xs text-gray-400 italic">Pending</span>
                return (
                    <div suppressHydrationWarning className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                        <BadgeCheck size={12} />
                        {format(new Date(date), 'dd MMM')}
                    </div>
                )
            }
        },
        {
            header: 'Refund Status',
            accessorKey: 'refundStatus',
            cell: (row: Registration) => {
                const details = getPaymentDetails(row)
                const settlement = row.settlements?.find((s: any) => s.amount === 25 && s.status === 'Processed')

                const isRefunded = !!settlement || details.adminRemarks?.includes('REFUNDED')
                if (!isRefunded) {
                    return <span className="text-xs text-gray-400 italic">Not Refunded</span>
                }
                // Extract refund date from adminRemarks or use settlement date
                const remarkMatch = details.adminRemarks?.match(/on ([\d-T:.Z]+)/)
                const refundDate = settlement?.payoutDate ? new Date(settlement.payoutDate) : (remarkMatch ? new Date(remarkMatch[1]) : null)

                return (
                    <div className="flex flex-col gap-1">
                        <div suppressHydrationWarning className="flex items-center gap-1 text-xs text-green-700 font-bold bg-green-50 px-2 py-1 rounded-lg border border-green-200 w-fit">
                            <BadgeCheck size={12} />
                            {refundDate ? format(refundDate, 'dd MMM yyyy') : 'Refunded'}
                        </div>
                        {isRefunded && (
                            <span className="text-[9px] text-gray-400 italic px-1">Registration fee refunded</span>
                        )}
                    </div>
                )
            }
        },
        {
            header: 'Receipt',
            accessorKey: 'userId',
            cell: (row: Registration) => (
                <button
                    onClick={() => generateReceipt(row)}
                    suppressHydrationWarning
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
            { header: 'Mobile', accessor: (r) => `="${r.mobileNumber}"` },
            { header: 'Role', accessor: (r) => r.role },
            { header: 'Campus', accessor: (r) => r.assignedCampus || '-' },
            { header: 'Amount', accessor: (r) => r.paymentAmount },
            { header: 'Transaction ID', accessor: (r) => r.transactionId ? `="${r.transactionId}"` : 'N/A' },
            { header: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString() }
        ])
    }

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        setIsExporting(true)
        try {
            const res = await exportRegistrations(start, end, selectedColumns, academicYear, search)
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
                    URL.revokeObjectURL(url)
                }
                toast.success('Export downloaded successfully')
            } else {
                toast.error(res.error || 'Failed to export')
            }
        } catch (error) {
            console.error('Server Export Error:', error)
            toast.error('An unexpected error occurred during export')
        } finally {
            setIsExporting(false)
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
        { id: 'amount', label: 'Payment Amount', defaultChecked: true },
        { id: 'paymentMethod', label: 'Payment Method', defaultChecked: true },
        { id: 'bankRef', label: 'Bank Reference / UTR', defaultChecked: true },
        { id: 'paidAt', label: 'Payment Date', defaultChecked: true },
        { id: 'remarks', label: 'Admin Remarks', defaultChecked: true }
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Direct Registrations</h3>
                <button
                    onClick={() => setShowExportModal(true)}
                    suppressHydrationWarning={true}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                    <FileDown size={14} />
                    Export Report
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["fullName", "mobileNumber"] as any}
                    searchPlaceholder="Search by name or mobile..."
                    pageSize={20}
                    manualPagination={true}
                    rowCount={totalResults}
                    pageCount={Math.ceil((totalResults || 0) / 20)}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                    searchValue={search}
                    onSearchChange={onSearchChange}
                    uniqueKey="userId"
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
