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
    academicYear?: string
}

export function PayoutHistoryTable({ data, academicYear }: PayoutHistoryTableProps) {
    const [showExportModal, setShowExportModal] = useState(false)

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportPayouts(start, end, status || 'Processed', selectedColumns, academicYear)
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
            sortable: true,
            filterable: true,
            cell: (row: Settlement) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white">{row.user.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.user.role} • {row.user.mobileNumber}</div>
                </div>
            )
        },
        {
            header: 'Payout Amount',
            accessorKey: 'amount',
            sortable: true,
            cell: (row: Settlement) => <span className="font-bold font-mono text-emerald-600">₹{row.amount.toLocaleString()}</span>
        },
        {
            header: 'Bank Details',
            cell: (row: Settlement) => (
                <div className="text-xs">
                    {(row.user.bankName && row.user.accountNumber) ? (
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-700 truncate" title={row.user.bankName || ''}>{row.user.bankName}</span>
                            <span className="font-mono text-gray-500">{row.user.accountNumber}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{row.user.ifscCode}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 italic">
                            {row.user.bankAccountDetails || 'Legacy Data'}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Payout Date',
            accessorKey: 'payoutDate',
            sortable: true,
            cell: (row: Settlement) => (
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-700">
                        {row.payoutDate ? format(new Date(row.payoutDate), 'dd MMM yyyy') : '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'Transaction Ref (UTR)',
            accessorKey: 'bankReference',
            cell: (row: Settlement) => (
                <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200 text-gray-600 select-all">
                    {row.bankReference || 'N/A'}
                </span>
            )
        },
        {
            header: 'Adjustment Details',
            accessorKey: 'remarks',
            cell: (row: Settlement) => {
                const remarks = row.remarks || ''
                const hasBreakdown = remarks.includes('[BREAKDOWN:')
                const mainRemark = hasBreakdown ? remarks.split('[BREAKDOWN:')[1].split(']')[0] : remarks

                return (
                    <div className="text-[10px] max-w-[200px]">
                        <div className="font-medium text-gray-700 flex items-start gap-1">
                            <span>{hasBreakdown ? `Covers: ${mainRemark}` : remarks}</span>
                        </div>
                    </div>
                )
            }
        },
        {
            header: 'Status',
            accessorKey: 'status',
            filterable: true,
            cell: () => (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold border border-green-200">
                    <CheckCircle size={12} />
                    Processed
                </span>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-600" />
                        Benefit Payout History
                    </h3>
                    <p className="text-xs text-gray-500">Record of all successfully processed benefit payouts.</p>
                </div>
                <button
                    onClick={() => setShowExportModal(true)}
                    suppressHydrationWarning={true}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                    <FileDown size={14} />
                    Download History Export
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["user.fullName", "user.mobileNumber", "bankReference"] as any}
                    searchPlaceholder="Search by name, mobile, or UTR..."
                    pageSize={10}
                    uniqueKey="id"
                />
            </div>

            <ExportDateRangeModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleServerExport}
                title="Export Payout History"
                showStatusFilter={false}
                columns={exportColumns}
            />
        </div>
    )
}
