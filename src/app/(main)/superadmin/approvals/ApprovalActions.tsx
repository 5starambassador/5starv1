'use client'

import { useState } from 'react'
import { approveManualPayment, rejectManualPayment } from '@/app/payment-approval-actions'
import { toast } from 'sonner'
import { Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ApprovalActions({ orderId }: { orderId: string }) {
    const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
    const router = useRouter()

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
        if (!confirm("Reject this payment?")) return

        setLoading('reject')
        try {
            const res = await rejectManualPayment(orderId)
            if (res.success) {
                toast.success("Payment Rejected")
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
                onClick={handleReject}
                disabled={!!loading}
                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                title="Reject"
            >
                {loading === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
            </button>
        </div>
    )
}
