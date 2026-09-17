import { ShieldCheck, Lock, Eye, Database, Share2, HelpCircle } from 'lucide-react'

export default function PrivacyPolicyPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <ShieldCheck size={12} />
                    Data Protection & Security
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Privacy Policy</h1>
                <p className="text-lg text-white/60">Last updated: March 2026</p>
            </div>

            <div className="space-y-8 text-white/80 leading-relaxed">
                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Eye size={20} className="text-emerald-400" />
                        1. Information We Collect
                    </h2>
                    <p className="mb-4">
                        To facilitate the Achariya Partnership Program (APP), we collect necessary personal details when you register, refer candidates, or track benefits:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-white/60">
                        <li><strong>Personal Identification:</strong> Full Name, Mobile Number, Email Address, and Campus Association (Parent, Staff, Alumni, or Ambassador).</li>
                        <li><strong>Referral Data:</strong> Prospective student names, grade/program of interest, and parent contact details submitted for admission referrals.</li>
                        <li><strong>Transaction & Bank Details:</strong> Necessary payout and bank account details required for reward settlements and benefits distribution.</li>
                    </ul>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Database size={20} className="text-emerald-400" />
                        2. How We Use Your Information
                    </h2>
                    <ul className="list-disc pl-5 space-y-2 text-white/60">
                        <li>To verify ambassador accounts and manage login authentication via secure OTPs.</li>
                        <li>To process admission leads, track referral conversion stages, and credit referral points.</li>
                        <li>To calculate and disburse financial earnings, fee reductions, and ambassador incentives.</li>
                        <li>To send important updates, SMS alerts, and program announcements.</li>
                    </ul>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Lock size={20} className="text-emerald-400" />
                        3. Data Security & Storage
                    </h2>
                    <p className="mb-4">
                        We prioritize safeguarding your personal information. All sensitive transactions, authentication steps, and database records are protected with industry-standard encryption and strict access controls.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Share2 size={20} className="text-emerald-400" />
                        4. Data Sharing & Disclosure
                    </h2>
                    <p className="mb-4">
                        Achariya Educational Public Trust will never sell, trade, or rent your personal contact information to third-party marketing companies. Data is strictly shared with internal campus admissions and administrative personnel to process verified admissions.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <HelpCircle size={20} className="text-emerald-400" />
                        5. Contact Us & Account Inquiries
                    </h2>
                    <p className="mb-4">
                        If you have questions about this privacy policy, data modification, or deletion requests, please contact us at:
                    </p>
                    <div className="text-white/60">
                        <p><strong>Achariya Educational Public Trust</strong></p>
                        <p>Website: <a href="https://www.5starambassador.com" className="text-emerald-400 hover:underline">https://www.5starambassador.com</a></p>
                        <p>Email: <a href="mailto:info@achariya.in" className="text-emerald-400 hover:underline">info@achariya.in</a></p>
                    </div>
                </section>

                <div className="text-xs text-white/40 pt-8 border-t border-white/10">
                    This privacy policy is compliant with Google Play Developer Policy and Information Technology Act guidelines.
                </div>
            </div>
        </div>
    )
}
