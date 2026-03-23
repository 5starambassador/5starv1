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
}

export function WaiverHistoryTable({ data, totalResults = 0, currentPage = 1, onPageChange, academicYear }: WaiverHistoryTableProps) {
    const [showExportModal, setShowExportModal] = useState(false)

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportWaivers(start, end, selectedColumns, academicYear)
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
        { id: 'amount', label: 'Waiver Amount', defaultChecked: true },
        { id: 'date', label: 'Applied Date', defaultChecked: true },
        { id: 'bankRef', label: 'Reference ID', defaultChecked: true },
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
            header: 'Waiver Amount',
            accessorKey: 'amount',
            sortable: true,
            cell: (row: Settlement) => <span className="font-bold font-mono text-purple-600">₹{row.amount.toLocaleString()}</span>
        },
        {
            header: 'Adjustment Details',
            accessorKey: 'remarks',
            cell: (row: Settlement) => {
                const remarks = row.remarks || ''
                const hasBreakdown = remarks.includes('[BREAKDOWN:')
                const hasERP = remarks.includes('[ERP:')

                const mainRemark = hasBreakdown ? remarks.split('[BREAKDOWN:')[1].split(']')[0] : remarks
                const erpNo = hasERP ? remarks.split('[ERP:')[1].split(']')[0] : null

                return (
                    <div className="text-xs max-w-[250px]">
                        <div className="font-medium text-gray-700 flex items-start gap-1">
                            <FileText size={12} className="mt-0.5 text-purple-400 shrink-0" />
                            <span>{hasBreakdown ? `Covers: ${mainRemark}` : (remarks || 'Fee Waiver Adjustment')}</span>
                        </div>
                        {erpNo && (
                            <div className="mt-1 font-mono text-[10px] text-gray-400">
                                ERP: {erpNo}
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            header: 'Applied Date',
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
            header: 'Reference ID',
            accessorKey: 'bankReference',
            cell: (row: Settlement) => (
                <span className="font-mono text-[10px] bg-gray-50 px-2 py-1 rounded border border-gray-200 text-gray-500 select-all">
                    {row.bankReference || 'N/A'}
                </span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            filterable: true,
            cell: () => (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold border border-purple-200">
                    <CheckCircle size={12} />
                    Applied
                </span>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div>
                    <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                        <CheckCircle size={18} className="text-purple-600" />
                        Fee Waiver History (Group A)
                    </h3>
                    <p className="text-xs text-purple-600/70">Record of institutional fee waivers applied to ambassador children.</p>
                </div>

                <button
                    onClick={() => setShowExportModal(true)}
                    suppressHydrationWarning={true}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-900/10"
                >
                    <FileDown size={14} />
                    Download ERP Export
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["user.fullName", "user.mobileNumber", "remarks", "bankReference"] as any}
                    searchPlaceholder="Search waivers..."
                    pageSize={20}
                    rowCount={totalResults}
                    pageCount={Math.ceil((totalResults || 0) / 20)}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                    manualPagination={true}
                    uniqueKey="id"
                />
            </div>

            <ExportDateRangeModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleServerExport}
                title="Export Fee Waivers"
                showStatusFilter={false}
                columns={exportColumns}
            />
        </div>
    )
}
