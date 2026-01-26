'use client'

import { useState } from 'react'
import { approveManualPayment, rejectManualPayment } from '@/app/payment-approval-actions'
import { toast } from 'sonner'
import { Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ApprovalActions({ orderId }: { orderId: string }) {
    const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
    const router = useRouter()
    const [showRejectForm, setShowRejectForm] = useState(false)
    const [reason, setReason] = useState('')

    const handleApprove = async () => {
        if (!confirm("Are you sure you want to approve this payment? This will activate the user.")) return

        setLoading('approve')
        try {
            const res = await approveManualPayment(orderId)
            if (res.success) {
                toast.success("Payment Approved & User Activated!")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to approve")
            }
        } catch (e) {
            toast.error("Error approving payment")
        } finally {
            setLoading(null)
        }
    }

    const handleReject = async () => {
        if (!reason.trim()) {
            toast.error("Please provide a reason for rejection")
            return
        }

        setLoading('reject')
        try {
            const res = await rejectManualPayment(orderId, reason)
            if (res.success) {
                toast.success("Payment Rejected")
                setShowRejectForm(false)
                setReason('')
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Error rejecting payment")
        } finally {
            setLoading(null)
        }
    }

    if (showRejectForm) {
        return (
            <div className="flex flex-col gap-2 p-2 bg-red-50 rounded-xl border border-red-100 min-w-[200px] animate-in slide-in-from-right-2">
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    className="w-full text-xs p-2 rounded-lg border border-red-200 outline-none focus:border-red-400 bg-white min-h-[60px]"
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleReject}
                        disabled={!!loading}
                        className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading === 'reject' ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Confirm Reject'}
                    </button>
                    <button
                        onClick={() => { setShowRejectForm(false); setReason(''); }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleApprove}
                disabled={!!loading}
                className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                title="Approve"
            >
                {loading === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button
                onClick={() => setShowRejectForm(true)}
                disabled={!!loading}
                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                title="Reject"
            >
                <X size={16} />
            </button>
        </div>
    )
}
