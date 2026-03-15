'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Search, Download, RefreshCcw, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { exportRejectedPayments } from '@/app/export-actions'

interface PaymentWithUser {
    orderId: string
    transactionId: string | null
    orderAmount: number
    orderStatus: string
    paymentStatus: string | null
    adminRemarks: string | null
    createdAt: Date
    updatedAt: Date
    user: {
        fullName: string
        mobileNumber: string
        email: string | null
    }
}

export function RejectedPaymentsTable({ payments: initialPayments }: { payments: PaymentWithUser[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const [searchTerm, setSearchTerm] = useState(searchParams.get('search')?.toString() || '')
    const [exportLoading, setExportLoading] = useState(false)
    const [payments, setPayments] = useState(initialPayments)
    const [hasMounted, setHasMounted] = useState(false)

    useEffect(() => {
        setHasMounted(true)
    }, [])

    useEffect(() => {
        setPayments(initialPayments)
    }, [initialPayments])

    // Search Logic
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const currentSearch = searchParams.get('search') || ''
            if (searchTerm !== currentSearch) {
                const params = new URLSearchParams(searchParams)
                if (searchTerm) {
                    params.set('search', searchTerm)
                } else {
                    params.delete('search')
                }
                router.replace(`${pathname}?${params.toString()}`)
            }
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [searchTerm, router, pathname, searchParams])

    const handleExport = async () => {
        setExportLoading(true)
        try {
            const res = await exportRejectedPayments(searchTerm)
            if (res.success && res.csv) {
                const blob = new Blob([res.csv], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = res.filename || 'Rejected_Payments.csv'
                a.click()
                toast.success("Export successful")
            } else {
                toast.error(res.error || "Export failed")
            }
        } catch (e) {
            toast.error("Export failed")
        } finally {
            setExportLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
            {/* Header Controls */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-50/30">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search UTR, Name..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-gray-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 hidden sm:inline">{payments.length} Found</span>
                    <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                    <button 
                        onClick={() => router.refresh()} 
                        title="Refresh" 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        suppressHydrationWarning
                    >
                        <RefreshCcw size={16} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exportLoading || payments.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                        suppressHydrationWarning
                    >
                        {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export to CSV
                    </button>
                </div>
            </div>

            {payments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <p className="text-lg font-medium">No history found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">UTR / Ref</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4">Rejection Reason</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payments.map((payment) => (
                                <tr key={payment.orderId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {hasMounted ? format(new Date(payment.updatedAt), 'dd MMM, hh:mm a') : '...'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-gray-900">{payment.user.fullName}</p>
                                            <p className="text-xs text-gray-500">{payment.user.mobileNumber}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-800 font-mono text-xs border border-gray-200 select-all">
                                            {payment.transactionId || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-gray-700">₹{payment.orderAmount}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-red-600 font-medium italic max-w-xs truncate" title={payment.adminRemarks || ''}>
                                            {payment.adminRemarks || 'No reason provided'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                                            Rejected
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
