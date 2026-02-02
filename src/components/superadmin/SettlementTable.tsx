'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Trash, X, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Settlement {
    id: number
    userId: number
    amount: number
    status: string
    paymentMethod: string | null
    bankReference: string | null
    payoutDate: Date | null
    remarks: string | null
    createdAt: Date
    user: {
        fullName: string
        mobileNumber: string
        role: string
        bankAccountDetails: string | null
        studentFee: number
    }
}

interface SettlementTableProps {
    settlements: Settlement[]
    onProcess: (id: number, data: { bankReference: string, remarks: string }) => Promise<any>
    onDelete: (id: number) => Promise<any>
}

export function SettlementTable({ settlements, onProcess, onDelete }: SettlementTableProps) {
    const [showModal, setShowModal] = useState(false)
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
    const [bankRef, setBankRef] = useState('')
    const [remarks, setRemarks] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedIdForDelete, setSelectedIdForDelete] = useState<number | null>(null)

    const handleOpenModal = (settlement: Settlement) => {
        setSelectedSettlement(settlement)
        setShowModal(true)
    }

    const handleSubmitProcess = async () => {
        if (!selectedSettlement || !bankRef) {
            toast.error('Bank reference is required')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await onProcess(selectedSettlement.id, { bankReference: bankRef, remarks })
            if (res.success) {
                toast.success('Settlement marked as processed')
                setShowModal(false)
                setBankRef('')
                setRemarks('')
            } else {
                toast.error(res.error || 'Failed to process')
            }
        } catch (error) {
            toast.error('Unexpected error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'user.fullName',
            sortable: true,
            filterable: true,
            cell: (s: Settlement) => (
                <div>
                    <p className="font-bold text-gray-900">{s.user.fullName}</p>
                    <p className="text-xs text-gray-500">{s.user.mobileNumber} • <span className="text-violet-600 font-medium">{s.user.role}</span></p>
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount',
            sortable: true,
            cell: (s: Settlement) => (
                <p className="text-lg font-black text-gray-900">₹{s.amount.toLocaleString()}</p>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (s: Settlement) => (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.status === 'Processed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                    {s.status === 'Processed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {s.status}
                </div>
            )
        },
        {
            header: 'Banking info',
            accessorKey: 'user.bankAccountDetails',
            cell: (s: Settlement) => (
                <div className="max-w-[200px]">
                    <p className="text-xs text-gray-600 line-clamp-2 italic">
                        {s.user.bankAccountDetails || 'Not Provided'}
                    </p>
                    {s.bankReference && (
                        <p className="text-[10px] font-bold text-violet-600 mt-1 uppercase">Ref: {s.bankReference}</p>
                    )}
                </div>
            )
        },
        {
            header: 'Date Created',
            accessorKey: 'createdAt',
            sortable: true,
            cell: (s: Settlement) => (
                <span className="text-xs text-gray-500 font-medium">
                    {format(new Date(s.createdAt), 'MMM dd, yyyy')}
                </span>
            )
        },
        {
            header: 'Actions',
            accessorKey: (s: Settlement) => s.id,
            cell: (s: Settlement) => (
                <div className="flex items-center justify-end gap-2">
                    {s.status === 'Pending' ? (
                        <>
                            <button
                                onClick={() => handleOpenModal(s)}
                                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all shadow-md shadow-gray-200"
                            >
                                Process
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedIdForDelete(s.id)
                                    setShowDeleteConfirm(true)
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash size={16} />
                            </button>
                        </>
                    ) : (
                        <div className="text-[10px] font-bold text-gray-400 uppercase italic">
                            Processed on {s.payoutDate ? format(new Date(s.payoutDate), 'MMM dd') : '-'}
                        </div>
                    )}
                </div>
            )
        }
    ]

    if (settlements.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No settlements found</h3>
                <p className="text-sm text-gray-500 mt-1">Pending and processed payouts will appear here.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto pb-4">
                <DataTable
                    data={settlements}
                    columns={columns as any}
                    pageSize={10}
                    searchKey={['user.fullName', 'user.mobileNumber', 'bankReference'] as any}
                    searchPlaceholder="Search ambassador, mobile, or reference..."
                    uniqueKey="id"
                />
            </div>

            {/* Payout Modal */}
            {showModal && selectedSettlement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gray-900 p-6 text-white text-center relative">
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <CreditCard size={32} className="text-amber-400" />
                            </div>
                            <h3 className="text-xl font-black italic tracking-tight uppercase">Process Payout</h3>
                            <p className="text-gray-400 text-[10px] font-bold tracking-widest mt-1 uppercase">Finalize Bank Transfer</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Due</p>
                                    <p className="text-2xl font-black text-gray-900">₹{selectedSettlement.amount.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient</p>
                                    <p className="font-bold text-gray-700">{selectedSettlement.user.fullName}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Bank Reference (UTR/Ref No)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. UTR12345678"
                                        value={bankRef}
                                        onChange={(e) => setBankRef(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-black font-bold text-sm transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Internal Remarks</label>
                                    <textarea
                                        placeholder="Add any notes..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-black font-medium text-sm transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitProcess}
                                disabled={isSubmitting || !bankRef}
                                className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black italic text-sm shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRM TRANSACTION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Settlement"
                description="Are you sure you want to delete this settlement entry? This action cannot be undone."
                onConfirm={() => {
                    if (selectedIdForDelete) onDelete(selectedIdForDelete)
                    setShowDeleteConfirm(false)
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}
