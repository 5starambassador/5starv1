import { getCurrentUser } from '@/lib/auth-service'
import { Star, CheckCircle2, Trophy, ArrowRight, ShieldCheck, Wallet, Info } from 'lucide-react'
import { PageAnimate, PageItem } from '@/components/PageAnimate'

import { getBenefitSlabs } from '@/app/benefit-actions'

export default async function RulesPage() {
    const slabsResult = await getBenefitSlabs()
    const rawSlabs = slabsResult.data || []

    // Sort and format for display
    const sortedSlabs = [...rawSlabs].sort((a, b) => a.referralCount - b.referralCount)

    const benefits = sortedSlabs.map(s => ({
        count: s.referralCount,
        percent: s.yearFeeBenefitPercent,
        label: s.tierName || `Tier ${s.referralCount}`,
        longTermBase: s.baseLongTermPercent
    }))

    // Global policy (assume first slab contains global settings)
    const globalBase = rawSlabs[0]?.baseLongTermPercent || 15
    const globalYield = 5 // Institutional protocol is linear 5% for long term

    return (
        <div className="-mt-8 pt-8 min-h-screen relative font-[family-name:var(--font-outfit)] pb-20">
            {/* Force Dark Background Overlay */}
            <div className="absolute inset-0 bg-[#0f172a] -z-10" />

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
            </div>

            <PageAnimate className="max-w-4xl mx-auto space-y-8 pb-12 relative z-10 px-4 xl:px-0">

                {/* Header */}
                <PageItem className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Trophy size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Program Rules</h1>
                            <p className="text-indigo-200 font-medium">How to unlock your 5-Star Rewards</p>
                        </div>
                    </div>
                </PageItem>

                {/* How it Works - Glass Card */}
                <PageItem className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                    <h2 className="text-xl font-black mb-6 text-white uppercase tracking-wider flex items-center gap-2">
                        <Info size={20} className="text-amber-400" />
                        How it works
                    </h2>

                    <ul className="space-y-5 text-sm font-medium text-indigo-100/80">
                        <li className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                                <span className="text-amber-400 font-bold text-xs">1</span>
                            </div>
                            <span className="leading-relaxed">Refer parents to Achariya using your unique code or link. If they join, you earn points towards your tier.</span>
                        </li>
                        <li className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                                <span className="text-amber-400 font-bold text-xs">2</span>
                            </div>
                            <span className="leading-relaxed">
                                Benefits apply directly to your <span className="text-white font-bold">Child's Fee</span> (for Parents) or <span className="text-white font-bold">Bank Transfer</span> (for Staff/Alumni).
                            </span>
                        </li>
                        <li className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                                <span className="text-amber-400 font-bold text-xs">3</span>
                            </div>
                            <span className="leading-relaxed">
                                <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">Activation Rule:</span> Just <span className="text-white font-bold">1 Confirmed Referral</span> per year keeps your benefits active.
                            </span>
                        </li>
                    </ul>
                </PageItem>

                {/* Immediate Benefits (Tier Grid) */}
                <PageItem>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Tier Benefits</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {benefits.map((b, i) => {
                            // Define color themes based on tier
                            const getTheme = (tier: string) => {
                                switch (tier) {
                                    case 'Starter': return 'from-slate-800/80 to-slate-900/80 border-slate-700/50 text-slate-300'
                                    case 'Bronze': return 'from-orange-900/40 to-amber-900/40 border-amber-800/50 text-amber-500'
                                    case 'Silver': return 'from-slate-800/60 to-slate-900/60 border-slate-400/30 text-slate-300'
                                    case 'Gold': return 'from-amber-900/40 to-yellow-900/40 border-amber-500/40 text-amber-400'
                                    case 'Platinum': return 'from-indigo-900/60 to-purple-900/60 border-indigo-500/40 text-indigo-400'
                                    default: return 'from-slate-800/80 to-slate-900/80 border-slate-700/50 text-slate-300'
                                }
                            }

                            const theme = getTheme(b.label)
                            const isPremium = b.percent >= 30 // Only Gold/Platinum get extra glow

                            return (
                                <div
                                    key={b.count}
                                    className={`relative p-6 rounded-[24px] border transition-all duration-300 group overflow-hidden bg-gradient-to-br ${theme} hover:border-white/20 hover:shadow-xl hover:-translate-y-1`}
                                >
                                    {isPremium && (
                                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
                                    )}

                                    <div className="flex items-baseline gap-1 mb-2 mt-2">
                                        <span className={`text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70`}>
                                            {b.percent}%
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-white/50 uppercase tracking-widest">Fee Benefit</p>

                                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-medium text-white/80">
                                        <span className="uppercase tracking-wider opacity-60">Requirement</span>
                                        <span className="text-white group-hover:text-amber-300 transition-colors font-bold text-sm">
                                            {b.count} Referral{b.count > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </PageItem>

                {/* Elite Status Section */}
                <PageItem className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 backdrop-blur-xl border border-indigo-500/40 rounded-[32px] p-8 md:p-10 relative overflow-hidden group shadow-2xl shadow-indigo-900/30">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-[20deg] group-hover:scale-110">
                        <Star size={240} fill="white" />
                    </div>

                    <div className="relative z-10 w-full">
                        <h2 className="text-2xl font-black mb-2 text-white uppercase tracking-tight flex items-center gap-3">
                            <Star className="text-amber-400 fill-amber-400" size={24} />
                            Elite Status (Long Term)
                        </h2>
                        <p className="text-indigo-100/80 text-sm font-medium mb-8 max-w-xl leading-relaxed">
                            Qualify for Long Term Benefits next year by completing 5 Referrals this year. Unlock the prestigious Partner status.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex justify-between items-center p-5 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/15 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Base Benefit</span>
                                    <span className="text-xs text-indigo-100/70 font-medium tracking-tight">Guaranteed Historic Base Sum</span>
                                </div>
                                <span className="font-black text-3xl text-white italic">🏛️</span>
                            </div>
                            <div className="flex justify-between items-center p-5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">New Referral Yield</span>
                                    <span className="text-xs text-emerald-100/70 font-medium">Linear Protocol</span>
                                </div>
                                <span className="font-black text-3xl text-emerald-400">+{globalYield}% <span className="text-sm align-top opacity-80 italic">Yield</span></span>
                            </div>
                        </div>

                        <p className="text-[10px] text-indigo-300/80 mt-6 font-bold uppercase tracking-[0.1em] text-center w-full">
                            * Required: 1 referral in new year to unlock
                        </p>
                    </div>
                </PageItem>

                {/* Dates Panel */}
                <PageItem className="bg-white/5 backdrop-blur-xl rounded-[24px] p-6 border border-white/10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/5"></div>
                    <div className="relative z-10">
                        <p className="font-black text-lg text-white uppercase tracking-tight mb-1">
                            Registration closes <span className="text-amber-400">31 January 2026</span>
                        </p>
                        <p className="text-xs text-white/50 font-bold uppercase tracking-widest">
                            பதிவு கடைசி தேதி: 31 ஜனவரி 2026
                        </p>
                    </div>
                </PageItem>

            </PageAnimate>
        </div>
    )
}
