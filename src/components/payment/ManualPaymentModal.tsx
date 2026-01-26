'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { submitManualPayment } from '@/app/actions'
import { Copy, Check } from 'lucide-react'

interface ManualPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    amount: number
    userId?: number
    onSuccess: () => void
}

export default function ManualPaymentModal({ isOpen, onClose, amount, userId, onSuccess }: ManualPaymentModalProps) {
    const [utr, setUtr] = useState('')
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    // Bank Details Config
    const bankDetails = {
        name: "ACHARIYA EDUCATIONAL PUBLIC TRUST - CORPORATE",
        bank: "FEDERAL BANK",
        acNo: "25140100003941",
        ifsc: "FDRL0002514",
        upiId: "25140100003941@federal"
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("Copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!utr || utr.length < 8) {
            toast.error("Please enter a valid Transaction ID (UTR)")
            return
        }

        if (!userId) {
            toast.error("User ID missing. Please refresh.")
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('utr', utr)
            formData.append('amount', amount.toString())
            formData.append('userId', userId.toString())

            const result = await submitManualPayment(formData)

            if (result.success) {
                toast.success("Payment submitted successfully! Waiting for admin approval.")
                onSuccess()
                onClose()
            } else {
                toast.error(result.error || "Failed to submit payment")
            }
        } catch (error) {
            console.error("Submission Error:", error)
            toast.error("An error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Scan & Pay"
            subtitle="Manual Verification"
            variant='blue'
            maxWidth="max-w-md"
        >
            <div className="space-y-6">
                {/* QR Section */}
                <div className="flex flex-col items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="bg-white p-2 rounded-lg shadow-sm mb-3">
                        {/* Placeholder QR or Real Image */}
                        <img
                            src="/manual-qr.png"
                            alt="Payment QR Code"
                            className="w-48 h-48 object-contain"
                            onError={(e) => {
                                // Fallback if image missing
                                e.currentTarget.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=" + bankDetails.upiId
                            }}
                        />
                    </div>
                    <p className="text-xs text-center text-gray-500 font-medium">Scan with GPay, PhonePe, Paytm</p>
                </div>

                {/* Bank Details */}
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50 space-y-2">
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 opacity-70">Bank Transfer Details</p>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Account Name</span>
                        <span className="font-semibold text-gray-900 text-right text-xs">{bankDetails.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Account No</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900">{bankDetails.acNo}</span>
                            <button onClick={() => handleCopy(bankDetails.acNo)} className="text-blue-600 hover:text-blue-700">
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">IFSC Code</span>
                        <span className="font-mono font-medium text-gray-900">{bankDetails.ifsc}</span>
                    </div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label htmlFor="utr" className="block text-sm font-medium text-gray-700">
                            Transaction ID / UTR Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="utr"
                            type="text"
                            value={utr}
                            onChange={(e) => setUtr(e.target.value)}
                            placeholder="e.g. 402518..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                            required
                        />
                        <p className="text-[10px] text-gray-500">
                            * Enter the 12-digit UTR number from your payment app after successful transfer.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {loading ? 'Submitting...' : 'Submit Payment Proof'}
                    </button>
                </form>
            </div>
        </Modal>
    )
}
