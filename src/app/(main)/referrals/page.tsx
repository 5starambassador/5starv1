import { getMyReferrals } from '@/app/referral-actions'
import { getCurrentUser } from '@/lib/auth-service'
import { PageAnimate } from '@/components/PageAnimate'
import { ChevronLeft, Download, Clock, CheckCircle2, MoreVertical, FileDown, User, MapPin, GraduationCap } from 'lucide-react'
import Link from 'next/link'

import { ScrollLock } from '@/components/ui/ScrollLock'

export default async function ReferralsPage() {
    const referrals = await getMyReferrals()
    const user = await getCurrentUser()
    const userName = user?.fullName || 'Ambassador'

    const preAsset = referrals.filter((r: any) => r.leadStatus === 'New' || r.leadStatus === 'Follow_up')
    const asset = referrals.filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Rejected')

    return (
        <div className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0f172a] font-[family-name:var(--font-outfit)] pb-32 z-[100] overscroll-y-contain">
            <ScrollLock />
            {/* Force Dark Background Overlay to override global layout */}
            {/* Force Dark Background Overlay to override global layout */}
            <div className="absolute inset-0 bg-[#0f172a] -z-10">
                {/* Brightness Booster Layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/60 to-slate-900 z-0 opacity-100" />
            </div>

            {/* Ambient Background Effects - Deep Royal Theme */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto min-h-[100dvh] flex flex-col p-6">

                {/* SAFE SPACER - Forces content down below any fixed headers */}
                <div className="w-full h-20 shrink-0" />

                {/* Header */}
                <header className="flex items-center justify-between mb-8 pt-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <ChevronLeft size={20} className="text-white/80" />
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight text-white">My Referrals</h1>
                    </div>

                </header>

                {/* SECTION 1: PRE-ASSET */}
                <PageAnimate className="mb-8 delay-100">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4 pl-4 border-l-4 border-amber-400">
                        <h2 className="text-xl font-bold text-white tracking-tight">Pre-Asset</h2>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                            {preAsset.length} Lead{preAsset.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Pre-Asset List or Empty State */}
                    {preAsset.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/5 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center text-center">
                            <p className="text-white/40 font-medium text-sm">No new leads active.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {preAsset.map((referral: any, index: number) => (
                                <div
                                    key={referral.leadId}
                                    className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-[24px] p-6 overflow-hidden transition-all hover:bg-white/15 hover:border-white/30 hover:shadow-xl shadow-lg backdrop-brightness-125"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg text-white group-hover:text-amber-200 transition-colors uppercase">{referral.studentName}</h3>
                                                <div className="flex items-center gap-2 text-white/50 text-[11px] font-medium uppercase tracking-wider mt-0.5">
                                                    <span className="flex items-center gap-1"><User size={10} /> {referral.parentName}</span>
                                                </div>
                                            </div>
                                            {/* Status Pill */}
                                            {/* Status Pill & Fee */}
                                            <div className="flex items-center gap-3">
                                                {(referral.annualFee || referral.student?.baseFee) && (
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Fee</p>
                                                        <p className="text-sm font-bold text-white">₹{(referral.annualFee || referral.student?.baseFee).toLocaleString('en-IN')}</p>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                    <Clock size={12} className="text-amber-400" />
                                                    <span className="text-xs font-bold text-amber-300">{referral.leadStatus}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-white/60 text-xs">
                                            <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                                <MapPin size={10} className="text-white/40" /> {referral.campus || 'No Campus'}
                                            </span>
                                            <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                                <GraduationCap size={10} className="text-white/40" /> {referral.gradeInterested || 'No Grade'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PageAnimate>

                {/* SECTION 2: ASSET */}
                <PageAnimate className="delay-200">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4 pl-4 border-l-4 border-emerald-500">
                        <h2 className="text-xl font-bold text-white tracking-tight">Asset</h2>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                            {asset.length} Asset{asset.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Asset Empty State */}
                    {asset.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/5 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} className="text-white/20" />
                            </div>
                            <p className="text-white/40 font-medium text-lg">No asset referrals yet.</p>
                            <p className="text-white/20 text-sm mt-1">Keep going!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {asset.map((referral: any) => (
                                <div
                                    key={referral.leadId}
                                    className="group relative bg-gradient-to-br from-emerald-900/40 to-slate-900/40 backdrop-blur-md border border-emerald-500/30 rounded-[24px] p-6 overflow-hidden transition-all hover:bg-emerald-900/50 hover:border-emerald-500/40 hover:shadow-xl shadow-lg backdrop-brightness-125"
                                >
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg text-white group-hover:text-emerald-200 transition-colors uppercase">{referral.studentName}</h3>
                                                <div className="flex items-center gap-2 text-white/50 text-[11px] font-medium uppercase tracking-wider mt-0.5">
                                                    <span className="flex items-center gap-1"><User size={10} /> {referral.parentName}</span>
                                                </div>
                                            </div>
                                            {/* Status Pill & Fee */}
                                            <div className="flex items-center gap-3">
                                                {(referral.annualFee || referral.student?.baseFee) && (
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Fee</p>
                                                        <p className="text-sm font-bold text-white">₹{(referral.annualFee || referral.student?.baseFee).toLocaleString('en-IN')}</p>
                                                    </div>
                                                )}
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${referral.leadStatus === 'Confirmed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                                                    <CheckCircle2 size={12} />
                                                    <span className="text-xs font-bold">{referral.leadStatus}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-white/60 text-xs">
                                            <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                                <MapPin size={10} className="text-white/40" /> {referral.campus || 'No Campus'}
                                            </span>
                                            <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                                <GraduationCap size={10} className="text-white/40" /> {referral.gradeInterested || 'No Grade'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PageAnimate>

            </div>
        </div>
    )
}
