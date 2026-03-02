'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Check, X, Loader2, Download, RefreshCcw, Search } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { approveManualPayment, rejectManualPayment, approveBulkManualPayments, rejectBulkManualPayments } from '@/app/payment-approval-actions'
import { bulkActivateUsers } from '@/app/bulk-payment-actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { Upload } from 'lucide-react'


interface CheckboxProps {
    checked: boolean
    onChange: () => void
}

function Checkbox({ checked, onChange }: CheckboxProps) {
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:border-blue-400'}`}
        >
            {checked && <Check size={12} strokeWidth={3} className="text-white" />}
        </div>
    )
}

interface PaymentApprovalTableProps {
    initialPayments: any[]
    page: number
    totalPages: number
    totalCount: number
}

export function PaymentApprovalTable({ initialPayments, page, totalPages, totalCount }: PaymentApprovalTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    // Local state for immediate input feedback
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search')?.toString() || '')
    const [payments, setPayments] = useState(initialPayments)

    // Sync state if props change (for search results)
    useEffect(() => {
        setPayments(initialPayments)
    }, [initialPayments])

    // Manual Debounce Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const currentSearch = searchParams.get('search') || ''

            // Fix: Only update if the search term actually changed from what's in the URL
            // This prevents the effect from resetting 'page' to 1 when the user just changes pages
            if (searchTerm !== currentSearch) {
                const params = new URLSearchParams(searchParams)
                if (searchTerm) {
                    params.set('search', searchTerm)
                } else {
                    params.delete('search')
                }
                params.set('page', '1') // Reset to page 1 only on search change

                router.replace(`${pathname}?${params.toString()}`)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, router, pathname, searchParams])

    const handleSearch = (term: string) => {
        setSearchTerm(term)
    }

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return
        const params = new URLSearchParams(searchParams)
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    // ... (rest of the component logic)

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [loadingMap, setLoadingMap] = useState<Record<string, 'approve' | 'reject'>>({})
    const [bulkLoading, setBulkLoading] = useState<'approve' | 'reject' | null>(null)
    const [rejectOrderId, setRejectOrderId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    // Dialog States
    const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false)
    const [showBulkRejectPrompt, setShowBulkRejectPrompt] = useState(false)
    const [isImporting, setIsImporting] = useState(false)

    const handleSelectAll = () => {
        if (selectedIds.length === payments.length && payments.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(payments.map(p => p.orderId))
        }
    }

    const toggleSelect = (orderId: string) => {
        if (selectedIds.includes(orderId)) {
            setSelectedIds(prev => prev.filter(id => id !== orderId))
        } else {
            setSelectedIds(prev => [...prev, orderId])
        }
    }

    // Single Actions
    const handleSingleApprove = async (orderId: string) => {
        setLoadingMap(prev => ({ ...prev, [orderId]: 'approve' }))
        try {
            const res = await approveManualPayment(orderId)
            if (res.success) {
                toast.success("Approved")
                // Optimistic Remove
                setPayments(prev => prev.filter(p => p.orderId !== orderId))
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (e) { toast.error("Failed") }
        setLoadingMap(prev => { const n = { ...prev }; delete n[orderId]; return n })
    }

    const handleSingleReject = async () => {
        if (!rejectOrderId || !rejectReason) return
        setLoadingMap(prev => ({ ...prev, [rejectOrderId]: 'reject' }))
        try {
            const res = await rejectManualPayment(rejectOrderId, rejectReason)
            if (res.success) {
                toast.success("Rejected")
                setPayments(prev => prev.filter(p => p.orderId !== rejectOrderId))
                setRejectOrderId(null)
                setRejectReason('')
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (e) { toast.error("Failed") }
        setLoadingMap(prev => { const n = { ...prev }; delete n[rejectOrderId!]; return n })
    }

    // Bulk Actions
    const handleBulkApprove = async () => {
        setShowBulkApproveConfirm(true)
    }

    const confirmBulkApprove = async () => {
        setShowBulkApproveConfirm(false)
        setBulkLoading('approve')
        try {
            const res = await approveBulkManualPayments(selectedIds)
            if (res.success) {
                toast.success(res.message)
                setPayments(prev => prev.filter(p => !selectedIds.includes(p.orderId)))
                setSelectedIds([])
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (e) { toast.error("Bulk action failed") }
        setBulkLoading(null)
    }

    const handleBulkReject = async () => {
        setShowBulkRejectPrompt(true)
    }

    const confirmBulkReject = async (reason: string) => {
        setShowBulkRejectPrompt(false)
        if (!reason || reason.trim().length === 0) {
            toast.error("Reason is required")
            return
        }

        setBulkLoading('reject')
        try {
            const res = await rejectBulkManualPayments(selectedIds, reason)
            if (res.success) {
                toast.success(res.message)
                setPayments(prev => prev.filter(p => !selectedIds.includes(p.orderId)))
                setSelectedIds([])
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (e) { toast.error("Bulk action failed") }
        setBulkLoading(null)
    }



    const [exportLoading, setExportLoading] = useState(false)

    // Export
    const handleExport = async () => {
        setExportLoading(true)
        try {
            const { getPaymentsForExport } = await import('@/app/payment-approval-actions')
            const res = await getPaymentsForExport(searchTerm)

            if (!res.success || !res.data) {
                toast.error(res.error || "Failed to fetch data")
                return
            }

            const csvContent = [
                ['Date', 'Name', 'Mobile', 'UTR', 'Amount', 'Status'].join(','),
                ...res.data.map((p: any) => [
                    format(new Date(p.createdAt), 'yyyy-MM-dd'),
                    `"${p.user.fullName}"`,
                    p.user.mobileNumber,
                    p.transactionId,
                    p.orderAmount,
                    p.orderStatus
                ].join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `payments_pending_ALL_${format(new Date(), 'yyyyMMdd')}.csv`
            a.click()
            toast.success(`Exported ${res.data.length} records`)
        } catch (e) {
            toast.error("Export failed")
        } finally {
            setExportLoading(false)
        }
    }

    // Bulk Import Logic
    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const csvText = event.target?.result as string
            if (!csvText) return

            setIsImporting(true)
            const toastId = toast.loading("Processing bulk activation...")

            try {
                const res = await bulkActivateUsers(csvText)
                if (res.success && res.summary) {
                    toast.success(`Bulk activation complete! Activated: ${res.summary.activated}, Already Active: ${res.summary.alreadyActive}`, { id: toastId, duration: 5000 })
                    router.refresh()
                } else {
                    toast.error(res.error || "Bulk import failed", { id: toastId })
                }
            } catch (err) {
                toast.error("An error occurred during import", { id: toastId })
            } finally {
                setIsImporting(false)
                e.target.value = '' // Reset input
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-50/30">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            suppressHydrationWarning
                            type="text"
                            placeholder="Search UTR, Name..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 hidden sm:inline">{totalCount} Found</span>
                    {selectedIds.length > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{selectedIds.length} selected</span>}

                    <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>

                    <button suppressHydrationWarning onClick={() => router.refresh()} title="Refresh" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <RefreshCcw size={16} />
                    </button>
                    <button
                        suppressHydrationWarning
                        onClick={handleExport}
                        disabled={exportLoading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export All
                    </button>

                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                    <label className={`flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>Bulk UTR Import</span>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleBulkImport}
                            disabled={isImporting}
                        />
                    </label>
                </div>
            </div>

            {payments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No pending payments found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <Checkbox checked={selectedIds.length === payments.length} onChange={handleSelectAll} />
                                </th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">UTR / Ref</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payments.map((payment) => (
                                <tr key={payment.orderId} className={`hover:bg-blue-50/30 transition-colors group ${selectedIds.includes(payment.orderId) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <Checkbox checked={selectedIds.includes(payment.orderId)} onChange={() => toggleSelect(payment.orderId)} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {format(new Date(payment.createdAt), 'dd MMM, hh:mm a')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-gray-900">{payment.user.fullName}</p>
                                            <p className="text-xs text-gray-500">{payment.user.mobileNumber}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-800 font-mono text-sm font-medium border border-gray-200 select-all">
                                            {payment.transactionId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${payment.orderStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {payment.orderStatus === 'PENDING_APPROVAL' ? 'Pending' : payment.orderStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-emerald-600">₹{payment.orderAmount}</span>
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        {rejectOrderId === payment.orderId ? (
                                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                                <input
                                                    autoFocus
                                                    className="w-32 text-xs p-1 border rounded"
                                                    placeholder="Reason..."
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                />
                                                <button suppressHydrationWarning onClick={handleSingleReject} className="p-1 bg-red-600 text-white rounded hover:bg-red-700">
                                                    {loadingMap[payment.orderId] === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                </button>
                                                <button suppressHydrationWarning onClick={() => setRejectOrderId(null)} className="p-1 bg-gray-200 rounded hover:bg-gray-300"><X size={12} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    suppressHydrationWarning
                                                    onClick={() => handleSingleApprove(payment.orderId)}
                                                    disabled={!!loadingMap[payment.orderId]}
                                                    className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                                >
                                                    {loadingMap[payment.orderId] === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                </button>
                                                <button
                                                    suppressHydrationWarning
                                                    onClick={() => { setRejectOrderId(payment.orderId); setRejectReason(''); }}
                                                    disabled={!!loadingMap[payment.orderId]}
                                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer Pagination */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/20">
                <span className="text-xs text-gray-400 font-medium">Page {page} of {totalPages} ({totalCount} items)</span>
                <div className="flex gap-2">
                    <button
                        suppressHydrationWarning
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <button
                        suppressHydrationWarning
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Sticky Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 z-20">
                    <span className="text-sm font-bold text-gray-300">{selectedIds.length} Selected</span>
                    <div className="h-4 w-px bg-gray-700"></div>
                    <button
                        suppressHydrationWarning
                        onClick={handleBulkApprove}
                        disabled={!!bulkLoading}
                        className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                        {bulkLoading === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Approve
                    </button>
                    <button
                        suppressHydrationWarning
                        onClick={handleBulkReject}
                        disabled={!!bulkLoading}
                        className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                        {bulkLoading === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                        Reject
                    </button>
                </div>
            )}

            {/* Premium Dialogs */}
            <ConfirmDialog
                isOpen={showBulkApproveConfirm}
                title="Approve Payments"
                description={`Are you sure you want to approve ${selectedIds.length} selected payments? This action cannot be undone.`}
                confirmText="Approve All"
                variant="info"
                onConfirm={confirmBulkApprove}
                onCancel={() => setShowBulkApproveConfirm(false)}
            />

            <PromptDialog
                isOpen={showBulkRejectPrompt}
                title="Reject Payments"
                description={`Please provide a reason for rejecting ${selectedIds.length} selected payments.`}
                placeholder="e.g. Invalid UTR or Screenshot"
                confirmText="Reject All"
                onConfirm={confirmBulkReject}
                onCancel={() => setShowBulkRejectPrompt(false)}
            />
        </div>
    )
}
