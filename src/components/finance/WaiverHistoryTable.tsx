'use client'

import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Calendar, FileText, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportWaivers } from '@/app/export-actions'
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
        campus?: string
    }
}

interface WaiverHistoryTableProps {
    data: Settlement[]
    totalResults?: number
    currentPage?: number
    onPageChange?: (page: number) => void
    academicYear?: string
    search?: string
    onSearchChange?: (val: string) => void
}

export function WaiverHistoryTable({ data, totalResults = 0, currentPage = 1, onPageChange, academicYear, search = '', onSearchChange }: WaiverHistoryTableProps) {
    const [showExportModal, setShowExportModal] = useState(false)

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportWaivers(start, end, selectedColumns, academicYear, search)
        if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', res.filename || 'waiver_history.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Waiver History downloaded')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'fullName', label: 'Ambassador Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile Number', defaultChecked: true },
        { id: 'childName', label: 'Child Name', defaultChecked: true },
        { id: 'erpNo', label: 'ERP No', defaultChecked: true },
        { id: 'campus', label: 'Campus', defaultChecked: true },
        { id: 'amount', label: 'Waiver Amount', defaultChecked: true },
        { id: 'payoutDate', label: 'Applied Date', defaultChecked: true },
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
            header: 'Waiver Amount',
            accessorKey: 'amount',
            cell: (row: Settlement) => (
                <span className="font-extrabold text-purple-700 dark:text-purple-400">₹{row.amount.toLocaleString()}</span>
            )
        },
        {
            header: 'Details',
            accessorKey: 'remarks',
            cell: (row: Settlement) => (
                <div className="max-w-[200px]">
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1" title={row.remarks || ''}>
                        {row.remarks || 'No details provided'}
                    </div>
                </div>
            )
        },
        {
            header: 'Applied Date',
            accessorKey: 'payoutDate',
            cell: (row: Settlement) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100" suppressHydrationWarning>
                        {row.payoutDate ? format(new Date(row.payoutDate), 'dd MMM yyyy') : 'N/A'}
                    </span>
                    <span className="text-[10px] text-gray-400">ID: #{row.id}</span>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Applied Waivers</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">History of institutional fee adjustments</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition-all shadow-lg shadow-purple-200 dark:bg-purple-600 dark:hover:bg-purple-500 dark:shadow-none"
                >
                    <FileDown size={14} />
                    <span>Download Report</span>
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["user.fullName", "user.mobileNumber"] as any}
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
                title="Export Waiver History"
                columns={exportColumns}
            />
        </div>
    )
}
