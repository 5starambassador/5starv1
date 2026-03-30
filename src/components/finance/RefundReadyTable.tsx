'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import { CreditCard, Loader2, Sparkles } from 'lucide-react'
import { initiateBulkRefunds } from '@/app/finance-actions'
import { useRouter } from 'next/navigation'
import { FileDown } from 'lucide-react'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportRefunds } from '@/app/export-actions'

interface RefundUser {
    userId: number
    fullName: string
    mobileNumber: string
    role: string
    campusName: string
    paymentAmount: number
    createdAt: string | Date
    bankName: string | null
    accountNumber: string | null
    ifscCode: string | null
}

interface RefundReadyTableProps {
    data: RefundUser[]
    totalResults?: number
    currentPage?: number
    onPageChange?: (page: number) => void
    academicYear?: string
    search?: string
    onSearchChange?: (val: string) => void
}

export function RefundReadyTable({ data, totalResults = 0, currentPage = 1, onPageChange, academicYear, search = '', onSearchChange }: RefundReadyTableProps) {
    const [showExportModal, setShowExportModal] = useState(false)

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportRefunds(start, end, selectedColumns, academicYear, 'Ready', search)
        if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', res.filename || 'ready_refunds.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Ready Refunds report downloaded')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'fullName', label: 'Full Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile Number', defaultChecked: true },
        { id: 'campus', label: 'Campus', defaultChecked: true },
        { id: 'amount', label: 'Refund Amount', defaultChecked: true },
        { id: 'status', label: 'Refund Status', defaultChecked: true }
    ]

    const router = useRouter()
    const [isInitiating, setIsInitiating] = useState(false)

    const handleBulkRefund = async () => {
        if (data.length === 0) return
        
        setIsInitiating(true)
        try {
            const userIds = data.map(u => u.userId)
            const res = await initiateBulkRefunds(userIds)
            if (res.success) {
                toast.success(res.message || "Refunds initiated successfully")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to initiate refunds")
            }
        } catch (error) {
            toast.error("An error occurred while initiating refunds")
        } finally {
            setIsInitiating(false)
        }
    }

    const columns = [
        {
            header: 'Full Name',
            accessorKey: 'fullName',
            cell: (u: RefundUser) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{u.fullName}</span>
                    <span className="text-xs text-gray-500">{u.mobileNumber}</span>
                </div>
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: (u: RefundUser) => (
                <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider border border-gray-200">
                    {u.role}
                </span>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'campusName',
        },
        {
            header: 'Refund Amount',
            accessorKey: 'paymentAmount',
            cell: () => <span className="font-bold text-gray-900">₹25</span>
        },
        {
            header: 'Bank Info',
            accessorKey: 'bankName',
            cell: (u: RefundUser) => (
                <div className="text-[10px] text-gray-500">
                    <div>{u.bankName}</div>
                    <div>A/C: {u.accountNumber}</div>
                    <div>IFSC: {u.ifscCode}</div>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <CreditCard size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Eligible for Refund</h3>
                        <p className="text-xs text-gray-500">Ambassadors who paid ₹25 and have bank info ready</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowExportModal(true)}
                        suppressHydrationWarning
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all border border-gray-200"
                    >
                        <FileDown size={14} />
                        <span>Download List</span>
                    </button>
                    <button
                        onClick={handleBulkRefund}
                        disabled={isInitiating || data.length === 0}
                        suppressHydrationWarning
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg shadow-gray-200"
                    >
                        {isInitiating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        <span>Initiate All ({data.length})</span>
                    </button>
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["fullName", "mobileNumber"] as any}
                    searchPlaceholder="Search eligible users..."
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
                title="Export Ready for Refund"
                columns={exportColumns}
            />
        </div>
    )
}
