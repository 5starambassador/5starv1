'use client'

import { useState } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldCheck, Star, ExternalLink, Smartphone, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { captureProgramLead } from '@/app/program-actions'

export function OfferClient({ programTitle }: { programTitle: string }) {
    const params = useParams()
    const searchParams = useSearchParams()

    // Get Slug & Ref Code
    const slug = params.slug as string
    const refCode = searchParams.get('ref')

    const [mobile, setMobile] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleProceed = async () => {
        if (!mobile || mobile.length < 10) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }
        if (!refCode) {
            toast.error('Invalid Referral Link. Please ask your ambassador for a new link.')
            return
        }

        setLoading(true)
        const res = await captureProgramLead({
            slug,
            referralCode: refCode,
            visitorMobile: mobile,
            visitorName: name
        })

        if (res.success && res.targetUrl) {
            toast.success('Redirecting to Special Offer...')
            window.location.href = res.targetUrl
        } else {
            setLoading(false)
            toast.error(res.error || 'Offer invalid or expired')
        }
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-[family-name:var(--font-outfit)] flex flex-col relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Ambassador Badge */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4 backdrop-blur-sm">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-[11px] font-black text-amber-300 uppercase tracking-widest">VIP Invitation</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Claim Your Special Offer</h1>
                        <p className="text-white/60 text-sm">You have been invited by your friend to access: <br /><span className="text-blue-400 font-bold">{programTitle}</span></p>
                    </div>

                    {/* Glass Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-50" />

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Your Mobile Number</label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative flex items-center bg-black/20 border border-white/10 rounded-2xl h-14 px-4 transition-all group-focus-within:bg-black/40 group-focus-within:border-blue-500/50">
                                        <Smartphone className="text-white/40 mr-3" size={20} />
                                        <input
                                            type="tel"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="98765 43210"
                                            className="w-full h-full bg-transparent border-none outline-none text-lg font-bold text-white placeholder-white/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Your Name</label>
                                <div className="relative flex items-center bg-black/20 border border-white/10 rounded-2xl h-14 px-4 transition-all focus-within:bg-black/40 focus-within:border-white/20">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full h-full bg-transparent border-none outline-none text-sm font-medium text-white placeholder-white/20"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleProceed}
                                disabled={loading}
                                className="w-full h-16 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Proceed to Offer <ChevronRight size={18} strokeWidth={3} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center opacity-40 flex items-center justify-center gap-2">
                        <ShieldCheck size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Secure Redirect • Official Achariya URL</span>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
