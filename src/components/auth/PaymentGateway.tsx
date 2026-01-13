'use client'

import { ChevronLeft, Star } from 'lucide-react'


interface PaymentGatewayProps {
    transactionId: string
    setTransactionId: (id: string) => void
    onComplete: () => void
    onBack: () => void
    loading: boolean
}

export const PaymentGateway = ({ transactionId, setTransactionId, onComplete, onBack, loading }: PaymentGatewayProps) => {
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
                        25<sup className="text-[0.6em] ml-0.5">th</sup> Year Celebration
                    </div>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md">Secure Payment</h2>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-emerald-500/20">Final Step</p>
                </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[32px] text-center border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden group backdrop-blur-md">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative z-10">
                    <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-wider mb-6">Scan to Pay Rs. 1000</p>

                    {/* QR Code */}
                    <div className="w-56 h-56 mx-auto bg-white p-3 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-500 border border-white/20">
                        {/* Placeholder for QR Code Image - In reality this would be an img tag */}
                        <div className="absolute inset-0 border-[4px] border-black opacity-5"></div>
                        <div className="absolute top-3 left-3 w-12 h-12 border-[4px] border-black rounded-lg"></div>
                        <div className="absolute top-3 right-3 w-12 h-12 border-[4px] border-black rounded-lg"></div>
                        <div className="absolute bottom-3 left-3 w-12 h-12 border-[4px] border-black rounded-lg"></div>
                        <p className="text-black font-black text-2xl tracking-widest opacity-80">QR CODE</p>
                    </div>

                    <p className="text-white text-sm font-bold tracking-wide">Achariya Educational Public Trust</p>
                    <p className="text-amber-400 text-xs font-mono mt-2 bg-amber-400/10 inline-block px-3 py-1 rounded-lg border border-amber-400/20">UPI: achariya@okicici</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Transaction Ref No.</label>
                    <input
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all font-mono text-center tracking-widest text-lg"
                        placeholder="e.g. 352627181920"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        className={`w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold tracking-[0.05em] text-sm shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative overflow-hidden group border border-white/10 ${!transactionId || loading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        onClick={onComplete}
                        disabled={loading || !transactionId}
                    >
                        <span className="relative z-10 flex items-center gap-2 transition-colors">
                            {loading ? 'Finalizing...' : 'Complete Payment'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}
