'use client'

import { useState } from 'react'
import { X, CheckCircle, CreditCard, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { processPayout, bulkProcessPayoutsById } from '@/app/finance-actions'

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    settlement: any
    selectedIds?: number[]
    onSuccess: () => void
}

export function PaymentModal({ isOpen, onClose, settlement, selectedIds, onSuccess }: PaymentModalProps) {
    const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm')
    const [txnId, setTxnId] = useState('')
    const [remarks, setRemarks] = useState('')

    if (!isOpen || !settlement) return null

    const isBulk = settlement.id === -1

    const handleProcess = async () => {
        if (!txnId) {
            toast.error('Please enter a Transaction Reference ID')
            return
        }

        setStep('processing')

        // Simulate network delay for "Gateway" feel
        await new Promise(r => setTimeout(r, 1500))

        let res;
        if (isBulk && selectedIds) {
            res = await bulkProcessPayoutsById(selectedIds, txnId, remarks)
        } else {
            res = await processPayout(settlement.id, txnId, remarks)
        }

        if (res.success) {
            setStep('success')
            setTimeout(() => {
                onSuccess()
                onClose()
                setStep('confirm') // Reset for next time
                setTxnId('')
                setRemarks('')
            }, 2000)
        } else {
            toast.error(res.error)
            setStep('confirm')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-800">

                {/* Header with Fake Gateway Branding */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Lock size={16} className="text-green-600" />
                        <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">Secure Payout Gateway</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 dark:text-blue-400">
                                    <CreditCard size={32} />
                                </div>
                                <h3 className="text-lg font-bold">{isBulk ? 'Bulk Payout Authorization' : 'Confirm Payout'}</h3>
                                <p className="text-gray-500 text-sm  dark:text-gray-400">
                                    {isBulk
                                        ? `Processing payments for ${selectedIds?.length || 0} selected ambassadors`
                                        : <>Processing payment for <span className="font-semibold text-gray-900 dark:text-gray-100">{settlement.user.fullName}</span></>
                                    }
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500  dark:text-gray-400">Amount</span>
                                    <span className="font-bold text-lg">₹{settlement.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500  dark:text-gray-400">Bank Account</span>
                                    <span className="font-mono text-xs max-w-[180px] break-words text-right">{settlement.user.bankAccountDetails || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500  dark:text-gray-400 mb-1 block">Transaction Ref ID (UTR)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                        placeholder="Displaying bank ref..."
                                        value={txnId}
                                        onChange={(e) => setTxnId(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500  dark:text-gray-400 mb-1 block">Remarks (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Monthly Commission"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleProcess}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 mt-2"
                            >
                                Authorize Payment
                            </button>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="font-bold text-lg dark:text-white">Connecting to Bank...</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Please do not close this window.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-6 animate-fade-in">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
                            <p className="text-gray-500 dark:text-gray-400">Transaction recorded successfully.</p>
                            <p className="text-xs text-gray-400 mt-4 dark:text-gray-500">Redirecting...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
