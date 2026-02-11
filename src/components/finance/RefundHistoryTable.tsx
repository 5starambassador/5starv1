'use client'

import { DataTable } from '@/components/ui/DataTable'
import { BadgeCheck } from 'lucide-react'
import { format } from 'date-fns'

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
}

export function RefundHistoryTable({ data }: RefundHistoryTableProps) {
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
            header: 'Campus',
            accessorKey: 'assignedCampus',
            cell: (row: any) => (row.campus?.campusName || row.assignedCampus || '-'),
            filterable: true
        },
        {
            header: 'Refund Amount',
            cell: () => <span className="font-bold text-gray-900">₹25</span>
        },
        {
            header: 'Refund Status',
            accessorKey: 'refundStatus',
            cell: (row: Registration) => {
                const details = row.payments?.[0]
                const settlement = row.settlements?.find((s: any) => s.amount === 25 && s.status === 'Processed')

                const remarkMatch = details?.adminRemarks?.match(/on ([\d-T:.Z]+)/)
                const refundDate = settlement?.payoutDate
                    ? new Date(settlement.payoutDate)
                    : (remarkMatch ? new Date(remarkMatch[1]) : null)

                return (
                    <div className="flex flex-col gap-1">
                        <div suppressHydrationWarning className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 w-fit">
                            <BadgeCheck size={12} />
                            {refundDate ? format(refundDate, 'dd MMM yyyy') : 'Processed'}
                        </div>
                        <span className="text-[9px] text-gray-400 italic px-1">Registration fee refunded</span>
                    </div>
                )
            }
        },
        {
            header: 'Bank Ref (UTR)',
            accessorKey: 'bankRef',
            cell: (row: Registration) => {
                const settlement = row.settlements?.find((s: any) => s.amount === 25 && s.status === 'Processed')
                const utr = settlement?.bankReference || 'N/A'
                return (
                    <span suppressHydrationWarning className="font-mono text-[10px] text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        {utr}
                    </span>
                )
            }
        },
        {
            header: 'Audit Remarks',
            accessorKey: 'remarks',
            cell: (row: Registration) => {
                const details = row.payments?.[0]
                const settlement = row.settlements?.find((s: any) => s.amount === 25 && s.status === 'Processed')
                const remarks = settlement?.remarks || details?.adminRemarks || '-'
                return (
                    <div suppressHydrationWarning className="max-w-[200px] text-[10px] text-gray-400 italic truncate" title={remarks}>
                        {remarks}
                    </div>
                )
            }
        }
    ]

    return (
        <div className="space-y-6">
            <div className="px-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BadgeCheck size={18} className="text-emerald-500" />
                    Refund Tracking History
                </h3>
                <p className="text-xs text-gray-500">Pakka record of all registration fees successfully refunded.</p>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["fullName", "mobileNumber"]}
                    searchPlaceholder="Search by name or mobile..."
                    pageSize={10}
                />
            </div>
        </div>
    )
}
