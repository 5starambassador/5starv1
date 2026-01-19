import { RefreshCcw, AlertCircle } from 'lucide-react'

export default function RefundPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <RefreshCcw size={12} />
                    Payment Policy
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Refund Policy</h1>
                <p className="text-lg text-white/60">Review our cancellation and refund guidelines</p>
            </div>

            <div className="space-y-6 text-white/80 leading-relaxed">
                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-indigo-400" />
                        Registration Fees
                    </h2>
                    <p className="text-lg font-medium text-white/90 mb-4">
                        All registration fees paid for the Achariya Partnership Program (APP) are non-refundable.
                    </p>
                    <p className="text-white/60">
                        Once a transaction is successfully completed and your account is activated, we cannot process any cancellations or refunds. The fee covers the administrative costs of setting up your dashboard, generating referral tools, and providing access to our marketing resources.
                    </p>
                </div>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-white mb-2">Double Payments</h2>
                    <p className="text-white/60 mb-4">
                        In the unlikely event of a technical error resulting in a duplicate payment for the same registration, please contact our support team immediately with your transaction reference numbers. We will verify and process a refund for the duplicate transaction within 5-7 business days.
                    </p>

                    <h2 className="text-lg font-bold text-white mb-2">Processing Timeline</h2>
                    <p className="text-white/60">
                        Approved refunds (for technical errors only) will be credited back to the original source of payment (Bank Account/Card/UPI) within 5-7 business days, subject to your bank's processing timelines.
                    </p>
                </section>
            </div>
        </div>
    )
}
