
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Share2, CheckCircle, AlertCircle, TrendingUp, Wallet, ArrowLeft, Star, Clock, ChevronRight, BarChart3, ChevronDown } from 'lucide-react'
import { YearDropdown } from '../../dashboard/year-dropdown'
import { getSystemSettings } from '@/app/settings-actions'
import { getMyPermissions } from '@/lib/permission-service'
import { StatCard } from '@/components/ui/StatCard'
import { BenefitGrid } from '@/components/ui/BenefitGrid'

export default async function AnalyticsDesignPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Check admin roles
    if (user.role === 'Super Admin') redirect('/superadmin')
    if (user.role.includes('Campus')) redirect('/campus')
    if (user.role.includes('Admin')) redirect('/admin')

    const userData = user as any;
    const isBenefitActive = userData.benefitStatus === 'Active'

    // Fee Calculation
    const totalFee = userData.studentFee || 0
    const benefitPercent = userData.yearFeeBenefitPercent || 0
    const benefitValue = (totalFee * benefitPercent) / 100

    return (
        <div className="-mx-2 xl:mx-0 min-h-screen bg-slate-50/50 pb-20 p-4">
            {/* Back Navigation & Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/analytics" className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Design Experiment</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Separate View</p>
                    </div>
                </div>

                <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-slate-200 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year</span>
                    <YearDropdown currentYear={userData.academicYear || '2025-2026'} />
                </div>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">

                {/* === TOP SECTION (Green/White from Image 0) === */}

                {/* 1. Welcome Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex items-start gap-4">
                        <div className="mt-1">
                            <div className={`w-3 h-3 rounded-full ${isBenefitActive ? 'bg-emerald-500' : 'bg-amber-500'} ring-4 ${isBenefitActive ? 'ring-emerald-100' : 'ring-amber-100'}`} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 leading-tight mb-2">
                                Welcome to the {userData.role} Ambassador Dashboard
                            </h1>
                            <p className={`text-sm font-bold ${isBenefitActive ? 'text-emerald-600' : 'text-amber-600'} flex items-center gap-2`}>
                                {isBenefitActive ? 'Benefits Active' : 'Action Required'}
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">{userData.academicYear || '2025-2026'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Benefits Active Status Card */}
                <div className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-100 border-l-[6px] ${isBenefitActive ? 'border-l-emerald-500' : 'border-l-amber-500'} flex items-start gap-4`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isBenefitActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isBenefitActive ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                            {isBenefitActive ? 'Benefits Active' : 'Unlock Benefits'}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            {isBenefitActive
                                ? 'Make at least 1 confirmed referral every year to keep benefits active.'
                                : 'Refer 1 student to unlock your staff fee benefits.'}
                        </p>
                    </div>
                </div>

                {/* 3. Estimated Savings (Green Card) */}
                <div className={`rounded-3xl p-8 relative overflow-hidden shadow-lg ${isBenefitActive ? 'bg-[#059669]' : 'bg-slate-800'}`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">
                                ESTIMATED SAVINGS ({userData.academicYear || '2025-2026'})
                            </p>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-5xl font-black text-white">
                                    ₹{benefitValue.toLocaleString('en-IN')}
                                </h2>
                                <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                                    {userData.yearFeeBenefitPercent}% Off
                                </span>
                            </div>
                        </div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
                            <Wallet size={24} className="text-white" />
                        </div>
                    </div>

                    <p className="text-white/40 text-[10px] mt-6 font-medium">
                        * Based on incentive structure for the current academic year.
                    </p>
                </div>


                {/* === MIDDLE SECTION (Red/Orange/Gray from Image 1) === */}

                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest pt-4">Performance</h3>

                <StatCard
                    title="Total Referrals"
                    value={userData.confirmedReferralCount}
                    icon={TrendingUp}
                    theme="red"
                    className="!h-48 !rounded-[32px] shadow-[0_20px_40px_-15px_rgba(225,29,72,0.4)]"
                />

                <StatCard
                    title="Fee Benefit"
                    value={`${userData.yearFeeBenefitPercent}%`}
                    icon={Wallet}
                    theme="orange"
                    className="!h-48 !rounded-[32px] shadow-[0_20px_40px_-15px_rgba(249,115,22,0.4)]"
                />

                <div className="bg-slate-600 rounded-[32px] p-8 text-white relative overflow-hidden h-48 flex flex-col justify-center shadow-xl">
                    <div className="absolute -right-10 -bottom-10 opacity-10">
                        <Star size={150} />
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                            <Star size={18} className="text-white" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/80">Next Milestone</span>
                    </div>

                    <h2 className="text-4xl font-black tracking-tight mb-2">5-Star</h2>
                    <p className="text-white/60 font-medium text-sm">5 Referrals to Unlock</p>
                </div>


                {/* === BOTTOM SECTION (Benefit Structure from Image 2) === */}

                <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Benefit Structure</h2>

                    <div className="mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Short Term (This Year)</span>
                    </div>

                    {/* Short Term Grid */}
                    <div className="mb-8">
                        <BenefitGrid currentCount={userData.confirmedReferralCount} />
                    </div>

                    {/* Long Term Benefits (Red Card Section) */}
                    <div className="bg-[#6B121A] rounded-[32px] p-8 text-white text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

                        {/* Stars Decor */}
                        <div className="flex justify-center gap-4 mb-6 relative z-10 opacity-20">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={24} fill="currentColor" />)}
                        </div>

                        <div className="relative z-10 mb-8">
                            <p className="text-red-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Exclusive Rewards</p>
                            <h3 className="text-3xl font-black mb-1">Long Term Benefits</h3>
                            <p className="text-red-200/60 text-xs font-medium">From 2nd Year Onwards</p>
                        </div>

                        <div className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm mb-8 relative z-10">
                            <span className="text-sm font-bold text-yellow-400">
                                <span className="text-white">5 more to unlock</span> 5-Star Status
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-[10px] font-bold text-red-200/50 uppercase tracking-widest mb-1">Base Benefit</p>
                                <p className="text-3xl font-black text-yellow-400">15%</p>
                                <p className="text-[9px] text-zinc-500 mt-1">3% × 5 referrals</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-[10px] font-bold text-red-200/50 uppercase tracking-widest mb-1">Per Referral</p>
                                <p className="text-3xl font-black text-emerald-400">+5%</p>
                                <p className="text-[9px] text-zinc-500 mt-1">Short term extra</p>
                            </div>
                        </div>

                        <p className="text-[9px] text-white/20 mt-6 relative z-10">
                            * Requires minimum 1 referral in the new year to unlock
                        </p>
                    </div>

                </div>

            </div>
        </div>
    )
}
