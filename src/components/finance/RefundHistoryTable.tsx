'use client'

import { DataTable } from '@/components/ui/DataTable'
import { BadgeCheck, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportRefunds } from '@/app/export-actions'
import { toast } from 'sonner'

interface Registration {
    userId: number
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
    campusName?: string
    payments?: {
        paymentMethod: string | null
        transactionId: string | null
        bankReference: string | null
        paidAt: Date | string | null
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

interface RefundHistoryTableProps {
    data: Registration[]
    totalResults?: number
    currentPage?: number
    onPageChange?: (page: number) => void
    academicYear?: string
    search?: string
    onSearchChange?: (val: string) => void
}

export function RefundHistoryTable({ data, totalResults = 0, currentPage = 1, onPageChange, academicYear, search = '', onSearchChange }: RefundHistoryTableProps) {
    const [showExportModal, setShowExportModal] = useState(false)

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportRefunds(start, end, selectedColumns, academicYear, 'History', search)
        if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', res.filename || 'refund_history.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Refund History report downloaded')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'fullName', label: 'Full Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile Number', defaultChecked: true },
        { id: 'role', label: 'Role', defaultChecked: true },
        { id: 'campus', label: 'Campus', defaultChecked: true },
        { id: 'amount', label: 'Refund Amount', defaultChecked: true },
        { id: 'transactionId', label: 'Original Transaction', defaultChecked: true },
        { id: 'refundDate', label: 'Refund Date', defaultChecked: true },
        { id: 'bankRef', label: 'Bank Reference', defaultChecked: true },
        { id: 'remarks', label: 'Remarks', defaultChecked: true }
    ]

    const columns = [
        {
            header: 'User Details',
            accessorKey: 'fullName',
            cell: (row: Registration) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white">{row.fullName}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{row.mobileNumber}</div>
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
            )
        },
        {
            header: 'Campus',
            accessorKey: 'assignedCampus',
            cell: (row: Registration) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {row.campusName || row.assignedCampus || 'N/A'}
                </div>
            )
        },
        {
            header: 'Refund Amount',
            accessorKey: 'paymentAmount',
            cell: () => <span className="font-bold text-gray-900 dark:text-white">₹25</span>
        },
        {
            header: 'Action',
            accessorKey: 'userId',
            cell: (row: Registration) => {
                const s = row.settlements?.[0]
                return (
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                            PROCESSED
                        </span>
                        {s?.payoutDate && (
                            <span className="text-[10px] text-gray-400 mt-1" suppressHydrationWarning>
                                on {format(new Date(s.payoutDate), 'dd MMM yyyy')}
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            header: 'Reference',
            accessorKey: 'settlements',
            cell: (row: Registration) => (
                <div className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={row.settlements?.[0]?.bankReference || ''}>
                    {row.settlements?.[0]?.bankReference || 'N/A'}
                </div>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <BadgeCheck size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Refund History</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Past registration fee refunds</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowExportModal(true)}
                    suppressHydrationWarning
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                    <FileDown size={14} />
                    <span>Download Report</span>
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["fullName", "mobileNumber"] as any}
                    searchPlaceholder="Search history..."
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
                title="Export Refund History"
                columns={exportColumns}
            />
        </div>
    )
}
