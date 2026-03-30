'use client'

import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Calendar, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportPayouts } from '@/app/export-actions'
import { toast } from 'sonner'

interface Settlement {
    id: number
    amount: number
    status: 'Pending' | 'Processed'
    createdAt: string | Date
    payoutDate: string | Date | null
    bankReference?: string | null
    remarks?: string | null
    user: {
        fullName: string
        mobileNumber: string
        role: string
        bankName?: string | null
        accountNumber?: string | null
        ifscCode?: string | null
        bankAccountDetails?: string | null
    }
}

interface PayoutHistoryTableProps {
    data: Settlement[]
    totalResults?: number
    currentPage?: number
    onPageChange?: (page: number) => void
    academicYear?: string
    search?: string
    onSearchChange?: (val: string) => void
}

export function PayoutHistoryTable({ data, totalResults = 0, currentPage = 1, onPageChange, academicYear, search = '', onSearchChange }: PayoutHistoryTableProps) {
    const [showExportModal, setShowExportModal] = useState(false)

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportPayouts(start, end, status || 'Processed', selectedColumns, academicYear, search)
        if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', res.filename || 'payout_history.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Payout History downloaded')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'date', label: 'Request Date', defaultChecked: true },
        { id: 'id', label: 'Settlement ID', defaultChecked: true },
        { id: 'name', label: 'Ambassador Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile', defaultChecked: true },
        { id: 'role', label: 'Role', defaultChecked: true },
        { id: 'amount', label: 'Amount', defaultChecked: true },
        { id: 'status', label: 'Status', defaultChecked: true },
        { id: 'payoutDate', label: 'Payout Date', defaultChecked: true },
        { id: 'bankRef', label: 'Bank Reference', defaultChecked: true },
        { id: 'bankName', label: 'Bank Name', defaultChecked: true },
        { id: 'accountNumber', label: 'Account Number', defaultChecked: true },
        { id: 'ifscCode', label: 'IFSC Code', defaultChecked: true },
        { id: 'remarks', label: 'Remarks', defaultChecked: true }
    ]

    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'user.fullName',
            cell: (row: Settlement) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{row.user.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.user.mobileNumber}</div>
                </div>
            )
        },
        {
            header: 'Role',
            accessorKey: 'user.role',
            cell: (row: Settlement) => (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{row.user.role}</span>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount',
            cell: (row: Settlement) => (
                <span className="font-bold text-gray-900 dark:text-gray-100">₹{row.amount.toLocaleString()}</span>
            )
        },
        {
            header: 'Reference',
            accessorKey: 'bankReference',
            cell: (row: Settlement) => (
                <div className="max-w-[150px]">
                    <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate" title={row.bankReference || ''}>
                        {row.bankReference || 'N/A'}
                    </div>
                    {row.remarks && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate" title={row.remarks}>
                            {row.remarks}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Payout Date',
            accessorKey: 'payoutDate',
            cell: (row: Settlement) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit dark:bg-emerald-900/20 dark:text-emerald-400" suppressHydrationWarning>
                        {row.payoutDate ? format(new Date(row.payoutDate), 'dd MMM yyyy') : 'N/A'}
                    </span>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <CheckCircle size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Payout History</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Successfully processed financial movements</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowExportModal(true)}
                    suppressHydrationWarning
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:shadow-none"
                >
                    <FileDown size={14} />
                    <span>Download Report</span>
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["user.fullName", "user.mobileNumber", "bankReference"] as any}
                    searchPlaceholder="Search history..."
                    pageSize={20}
                    manualPagination={true}
                    rowCount={totalResults}
                    pageCount={Math.ceil((totalResults || 0) / 20)}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                    searchValue={search}
                    onSearchChange={onSearchChange}
                    uniqueKey="id"
                />
            </div>

            <ExportDateRangeModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleServerExport}
                title="Export Payout History"
                description="Export successfully processed payout records."
                showStatusFilter={false}
                columns={exportColumns}
            />
        </div>
    )
}
