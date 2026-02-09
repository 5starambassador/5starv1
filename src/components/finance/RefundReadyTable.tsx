'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import { CreditCard, Loader2, Sparkles } from 'lucide-react'
import { initiateBulkRefunds } from '@/app/finance-actions'
import { useRouter } from 'next/navigation'

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
}

export function RefundReadyTable({ data }: RefundReadyTableProps) {
    const router = useRouter()
    const [selectedUsers, setSelectedUsers] = useState<number[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    const toggleUser = (userId: number) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    const toggleAll = () => {
        if (selectedUsers.length === data.length) {
            setSelectedUsers([])
        } else {
            setSelectedUsers(data.map(u => u.userId))
        }
    }

    const handleInitiateRefunds = async (userIds: number[]) => {
        if (userIds.length === 0) return

        setIsProcessing(true)
        const tid = toast.loading(`Initiating ${userIds.length} refund request(s)...`)

        try {
            const res = await initiateBulkRefunds(userIds)
            if (res.success) {
                toast.success(res.message, { id: tid })
                setSelectedUsers([])
                router.refresh()
            } else {
                toast.error(res.error || 'Failed to initiate refunds', { id: tid })
            }
        } catch (err) {
            toast.error('Processing failed', { id: tid })
        } finally {
            setIsProcessing(false)
        }
    }

    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'fullName',
            cell: (row: RefundUser) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white">{row.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.mobileNumber} • {row.role}</div>
                </div>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'campusName',
            cell: (row: RefundUser) => (
                <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                    {row.campusName}
                </span>
            ),
            filterable: true
        },
        {
            header: 'Bank Details',
            accessorKey: 'accountNumber',
            cell: (row: RefundUser) => (
                <div className="flex flex-col text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{row.bankName || 'Bank'}</span>
                    <span className="font-mono text-gray-500">{row.accountNumber}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{row.ifscCode}</span>
                </div>
            )
        },
        {
            header: 'Reg. Date',
            accessorKey: 'createdAt',
            cell: (row: RefundUser) => new Date(row.createdAt).toLocaleDateString()
        },
        {
            header: 'Action',
            cell: (row: RefundUser) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation() // Prevent row selection if any
                        handleInitiateRefunds([row.userId])
                    }}
                    disabled={isProcessing}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    Request Refund
                </button>
            )
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Sparkles size={18} className="text-emerald-500" />
                        Ready for Refund
                    </h3>
                    <p className="text-xs text-gray-500">Users who paid Rs. 25 and updated bank details.</p>
                </div>
                <button
                    onClick={() => handleInitiateRefunds(selectedUsers)}
                    disabled={isProcessing || selectedUsers.length === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Bulk Request ({selectedUsers.length})
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey="fullName"
                    pageSize={10}
                    enableMultiSelection={true}
                    onSelectionChange={(selectedItems) => {
                        setSelectedUsers(selectedItems.map((u: any) => u.userId))
                    }}
                    uniqueKey="userId"
                />
            </div>
        </div>
    )
}
