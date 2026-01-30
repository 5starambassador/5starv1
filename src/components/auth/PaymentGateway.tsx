'use client'

import { ChevronLeft, Star } from 'lucide-react'
import PaymentButton from '@/components/payment/PaymentButton'

interface PaymentGatewayProps {
    onBack: () => void
    loading: boolean
    userId?: number
}

// Removing unused props: transactionId, setTransactionId, onComplete
export const PaymentGateway = ({ onBack, loading, userId }: PaymentGatewayProps) => {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2 relative">
                <button
                    onClick={onBack}
                    className="absolute top-0 left-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-all z-50 group shadow-lg"
                >
                    <ChevronLeft className="w-5 h-5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
                </button>
                <div className="flex flex-col items-center gap-2 mb-6 w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 backdrop-blur-xl border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-lg">
                        <Star size={10} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                        <span>Achariya Partnership Program (APP)</span>
                    </div>
                    <div className="inline-flex items-center px-4 py-1 rounded-full bg-slate-950/40 backdrop-blur-md border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        25<sup className="text-[0.6em] ml-0.5">th</sup> <span className="ml-1.5">Year Celebration</span>
                    </div>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md">Secure Payment</h2>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-emerald-500/20">Final Step</p>
                </div>
            </div>

            <div className="bg-white/5 p-6 sm:p-8 rounded-[32px] text-center border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden group backdrop-blur-md">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative z-10">
                    <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-wider mb-8">Pay Membership Fee</p>

                    <PaymentButton amount={25} userId={userId} />

                    <p className="text-white/40 text-[10px] font-medium tracking-wide mt-6">
                        Secured by Cashfree Payments
                    </p>
                </div>
            </div>

            <div className="flex justify-center gap-4 text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-4 pt-4 border-t border-white/5">
                <a href="/policies/terms" target="_blank" className="hover:text-amber-400 transition-colors">Terms</a>
                <span className="text-slate-600">•</span>
                <a href="/policies/refund" target="_blank" className="hover:text-amber-400 transition-colors">Refunds</a>
                <span className="text-slate-600">•</span>
                <a href="/policies/contact" target="_blank" className="hover:text-amber-400 transition-colors">Contact</a>
            </div>
        </div>
    )
}
