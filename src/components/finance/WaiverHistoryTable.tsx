'use client'

import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Calendar, FileText } from 'lucide-react'
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
        campus?: string
    }
}

interface WaiverHistoryTableProps {
    data: Settlement[]
}

export function WaiverHistoryTable({ data }: WaiverHistoryTableProps) {
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
                    onClick={() => {
                        const csvContent = [
                            ['Ambassador Name', 'Mobile Number', 'Child Name', 'ERP No', 'Waiver Amount', 'Applied Date', 'Reference ID', 'Remarks'],
                            ...data.map(row => {
                                const remarks = row.remarks || ''
                                const hasBreakdown = remarks.includes('[BREAKDOWN:')
                                const hasERP = remarks.includes('[ERP:')

                                const childName = hasBreakdown ? remarks.split('[BREAKDOWN:')[1].split(']')[0] : 'N/A'
                                const erpNo = hasERP ? remarks.split('[ERP:')[1].split(']')[0] : 'N/A'

                                return [
                                    `"${row.user.fullName}"`,
                                    `"${row.user.mobileNumber}"`,
                                    `"${childName}"`,
                                    `"${erpNo}"`,
                                    row.amount,
                                    row.payoutDate ? format(new Date(row.payoutDate), 'yyyy-MM-dd') : 'N/A',
                                    `"${row.bankReference || 'N/A'}"`,
                                    `"${remarks.replace(/"/g, '""')}"`
                                ]
                            })
                        ].map(e => e.join(",")).join("\n")

                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement("a")
                        link.setAttribute("href", url)
                        link.setAttribute("download", `MCB_ERP_Waivers_${new Date().toISOString().split('T')[0]}.csv`)
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-900/10"
                >
                    <FileText size={14} />
                    Download ERP Export
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data}
                    columns={columns as any}
                    searchKey={["user.fullName", "user.mobileNumber", "remarks", "bankReference"] as any}
                    searchPlaceholder="Search waivers..."
                    pageSize={10}
                    uniqueKey="id"
                />
            </div>
        </div>
    )
}
