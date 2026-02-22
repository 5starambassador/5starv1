'use client'

import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'

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
}

export function PayoutHistoryTable({ data }: PayoutHistoryTableProps) {
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
            <div className="px-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-600" />
                    Benefit Payout History
                </h3>
                <p className="text-xs text-gray-500">Record of all successfully processed benefit payouts.</p>
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
        </div>
    )
}
