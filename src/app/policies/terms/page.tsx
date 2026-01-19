import { FileText, CheckCircle2 } from 'lucide-react'

export default function TermsPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <FileText size={12} />
                    Legal Agreement
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Terms & Conditions</h1>
                <p className="text-lg text-white/60">Last updated: January 2026</p>
            </div>

            <div className="space-y-8 text-white/80 leading-relaxed">
                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-indigo-400" />
                        1. Introduction
                    </h2>
                    <p className="mb-4">
                        Welcome to the Achariya Partnership Program (APP). By accessing our website and using our services, you agree to be bound by these Terms and Conditions. Please read them carefully.
                    </p>
                    <p>
                        These terms govern your participation in our referral program, use of our digital platforms, and any transactions conducted through our service.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-indigo-400" />
                        2. Ambassador Program
                    </h2>
                    <p className="mb-4">
                        As a registered Ambassador (Parent, Staff, Alumni, or Other), you agree to represent Achariya with integrity.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-white/60">
                        <li>Referrals must be genuine leads interested in admission.</li>
                        <li>Rewards are distributed based on the "Confirmed" status of referrals.</li>
                        <li>We reserve the right to disqualify any participant found violating these terms.</li>
                    </ul>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-indigo-400" />
                        3. Registration & Payments
                    </h2>
                    <p className="mb-4">
                        Registration fees for the program are non-transferable. By making a payment, you confirm that you are authorized to use the payment method provided.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-indigo-400" />
                        4. Limitation of Liability
                    </h2>
                    <p>
                        Achariya World Class Education shall not be held liable for any indirect, incidental, or consequential damages arising from your use of this service or participation in the program.
                    </p>
                </section>

                <div className="text-xs text-white/40 pt-8 border-t border-white/10">
                    This document is an electronic record in terms of Information Technology Act, 2000 and rules there under as applicable.
                </div>
            </div>
        </div>
    )
}
