'use client'

import { useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Wallet, History, CheckCircle2, Clock, Calendar,
    IndianRupee, PieChart, Info, ChevronLeft, Coins, Zap, Building,
    TrendingUp, ArrowUpRight, Landmark, Filter, ChevronDown, Settings
} from 'lucide-react'
import { GlassCard } from '../../../components/ui/GlassCard'
import { PageAnimate, PageItem } from '../../../components/PageAnimate'
import { useClickOutside } from '@/hooks/use-click-outside'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settlement {
    id: number | string
    amount: number
    status: 'Processed' | 'Pending' | string
    createdAt: string | Date
    bankReference?: string | null
    remarks?: string | null
}

interface EarningsStats {
    totalEarned: number
    referralYield: number
    bonusCredits: number
    refundAmount: number       // Registration fee refund — NOT part of earnings
    totalSettled: number
    pendingSettlement: number
    remainingBalance: number
    settlements: Settlement[]
    breakdown: string[]        // format: "LABEL = ₹AMOUNT" or "LABEL = Applied"
    referralCount: number
}

interface EarningsClientProps {
    stats: EarningsStats
    user: {
        role: string
        childInAchariya?: boolean
        name?: string
        accountNumber?: string | null
        ifscCode?: string | null
        paymentAmount?: number
    }
    activeYears: any[]
    selectedYear: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely parses a breakdown string like "WAIVER GROUP A = ₹12,000"
 * into a label/amount pair.
 */
function parseBreakdownItem(item: string): { label: string; amount: string } {
    const eqIdx = item.indexOf('=')
    if (eqIdx === -1) return { label: item.trim(), amount: '—' }
    return {
        label: item.slice(0, eqIdx).trim(),
        amount: item.slice(eqIdx + 1).trim() || '—',
    }
}

function getBreakdownIcon(label: string) {
    const up = label.toUpperCase()
    if (up.includes('WAIVER') || up.includes('GROUP A')) return <Building size={16} className="text-blue-400" />
    if (up.includes('PROFIT') || up.includes('SHARE') || up.includes('BONUS')) return <Coins size={16} className="text-amber-400" />
    if (up.includes('CREDIT') || up.includes('REFUND')) return <Landmark size={16} className="text-purple-400" />
    return <Zap size={16} className="text-emerald-400" />
}

function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EarningsClient({ stats, user, activeYears, selectedYear }: EarningsClientProps) {
    const isWaiverUser = user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)

    // year Filter Logic
    const sortedYears = [...activeYears].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    const dropdownYears = [...sortedYears.map(y => y.year), 'All Time']

    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const pathname = usePathname()

    useClickOutside(filterRef, () => setIsFilterOpen(false))

    const handleYearChange = (year: string) => {
        const params = new URLSearchParams(window.location.search)
        if (year === 'All Time') {
            params.set('year', 'All Time')
        } else {
            params.set('year', year)
        }
        router.push(`${pathname}?${params.toString()}`)
        setIsFilterOpen(false)
    }

    // Proactive Reminder Logic
    const hasMissingBankDetails = !user.accountNumber || !user.ifscCode
    const showBankReminder = hasMissingBankDetails && (stats.referralCount > 0 || (user.paymentAmount || 0) > 0)

    return (
        <div className="relative font-[family-name:var(--font-outfit)] pb-28">

            {/* Atmospheric glows */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[35%] right-[5%] w-[35%] h-[40%] bg-amber-400/[0.04] rounded-full blur-[160px]" />
            </div>

            <PageAnimate className="relative z-10 max-w-4xl mx-auto flex flex-col px-5 pb-8">

                {/* Bank Detail Reminder Banner */}
                {showBankReminder && (
                    <PageItem className="mt-8">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/30 p-6 shadow-lg backdrop-blur-md"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <IndianRupee size={80} className="text-amber-500" />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400">
                                        <Settings size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Profile Readiness Required</h3>
                                        <p className="text-xs text-white/60 font-bold uppercase tracking-wider mt-1">
                                            You have active referrals but your bank details are missing. Fix this to enable your **payouts and registration fee refunds**.
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href="/profile"
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all text-center"
                                >
                                    Complete Profile
                                </Link>
                            </div>
                        </motion.div>
                    </PageItem>
                )}

                {/* ── Header ─────────────────────────────────────────── */}
                <PageItem>
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 mt-6 md:mt-12 pt-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <ChevronLeft size={20} className="text-white/80" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-black italic text-white tracking-tight uppercase leading-none mb-1">
                                    My Earnings
                                </h1>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em]">
                                    Financial Portfolio
                                </p>
                            </div>
                        </div>

                        {/* Year Filter Dropdown */}
                        <div className="flex items-center gap-3">
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-xl shadow-lg group"
                                >
                                    <Filter size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span>Cycle: {selectedYear}</span>
                                    <ChevronDown size={14} className={`text-white/40 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isFilterOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-[60]"
                                        >
                                            {dropdownYears.map((year: string) => (
                                                <button
                                                    key={year}
                                                    onClick={() => handleYearChange(year)}
                                                    className={`w-full text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${selectedYear === year ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'}`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                    </header>
                </PageItem>

                {/* ── Hero Grid ──────────────────────────────────────── */}
                <PageItem className="mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">

                        {/* Primary Balance Card */}
                        <GlassCard className="md:col-span-2 !bg-gradient-to-br !from-blue-600 !to-blue-900 border-white/20 p-7 md:p-8 shadow-[0_25px_60px_rgba(30,58,138,0.4)] relative overflow-hidden group">
                            {/* Ambient layers */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-amber-400/10 transition-all duration-1000" />
                            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

                            {/* Top row */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shadow-2xl">
                                    <Wallet className="text-amber-400 fill-amber-400/20" size={26} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-blue-200/40 uppercase tracking-[0.2em] mb-1.5">Account</p>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                        Synchronized
                                    </div>
                                </div>
                            </div>

                            {/* Main figure */}
                            <p className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.3em] mb-2">
                                Confirmed Residual Yield
                            </p>
                            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none">
                                ₹{stats.totalEarned.toLocaleString('en-IN')}
                            </h2>

                            {/* Sub-metrics */}
                            <div className="grid grid-cols-2 gap-3 mt-8">
                                {/* Settled */}
                                <div className="p-5 rounded-2xl bg-black/20 border border-white/10 flex flex-col justify-between hover:bg-black/30 transition-all">
                                    <p className="text-[9px] font-black text-blue-200/40 uppercase tracking-[0.2em] mb-3">
                                        {isWaiverUser ? 'Applied Credits' : 'Paid Settlements'}
                                    </p>
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tighter">
                                            ₹{stats.totalSettled.toLocaleString('en-IN')}
                                        </p>
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                            <CheckCircle2 size={15} />
                                        </div>
                                    </div>
                                </div>

                                {/* Pending */}
                                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex flex-col justify-between hover:bg-amber-500/20 transition-all">
                                    <p className="text-[9px] font-black text-amber-200/60 uppercase tracking-[0.2em] mb-3">
                                        Pending Balance
                                    </p>
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl md:text-3xl font-black text-amber-400 tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                                            ₹{stats.remainingBalance.toLocaleString('en-IN')}
                                        </p>
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
                                            <Clock size={15} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Referral Efficiency Card */}
                        <GlassCard className="!bg-gradient-to-br !from-blue-950/40 !to-indigo-950/60 border-indigo-500/20 p-6 flex flex-col justify-between shadow-[0_15px_40px_rgba(0,0,0,0.3)]">
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <p className="text-[9px] font-bold text-blue-200/40 uppercase tracking-[0.2em]">
                                        Referral Efficiency
                                    </p>
                                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                                        <TrendingUp size={14} />
                                    </div>
                                </div>

                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-5xl font-black text-white tabular-nums leading-none">
                                        {stats.referralCount}
                                    </span>
                                    <span className="text-[10px] font-black text-white/30 uppercase pb-1">Units</span>
                                </div>
                                <p className="text-[9px] text-white/25 leading-relaxed uppercase font-bold tracking-[0.05em]">
                                    Confirmed in current academic cycle
                                </p>
                            </div>

                            <div className="mt-6">
                                {/* Progress bar: scales to next milestone of 5 */}
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.4)] transition-all duration-700"
                                        style={{ width: `${Math.min(100, ((stats.referralCount % 5 || stats.referralCount) / 5) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">
                                    <span>Milestone {Math.floor(stats.referralCount / 5) * 5}</span>
                                    <span>Next: {(Math.floor(stats.referralCount / 5) + 1) * 5}</span>
                                </div>
                            </div>

                            {/* Referral yield vs bonus credits */}
                            {stats.bonusCredits > 0 && (
                                <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Referral Yield</span>
                                        <span className="text-[10px] font-black text-white/70">₹{stats.referralYield.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Bonus Credits</span>
                                        <span className="text-[10px] font-black text-emerald-400">+₹{stats.bonusCredits.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Registration Fee Refund — shown separately, clearly NOT earnings */}
                            {stats.refundAmount > 0 && (
                                <div className="mt-5 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <div>
                                            <p className="text-[9px] font-black text-purple-300/70 uppercase tracking-widest mb-0.5">Reg. Fee Refund</p>
                                            <p className="text-[8px] text-white/20 font-medium">Not counted in earnings</p>
                                        </div>
                                        <span className="text-sm font-black text-purple-300 tabular-nums">₹{stats.refundAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </PageItem>

                {/* ── Earning Components Breakdown ───────────────────── */}
                <PageItem className="mb-10">
                    <h3 className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                        <PieChart size={13} className="text-blue-400/50" />
                        Earning Breakdown
                    </h3>

                    {stats.breakdown.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                            <IndianRupee className="mx-auto text-white/10 mb-3" size={32} />
                            <p className="text-white/30 font-black text-[9px] uppercase tracking-widest">
                                No earning components yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {stats.breakdown.map((item, idx) => {
                                const { label, amount } = parseBreakdownItem(item)
                                return (
                                    <div
                                        key={idx}
                                        className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-indigo-500/20 transition-all duration-200"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all shrink-0">
                                            {getBreakdownIcon(label)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-wider truncate">
                                                {label}
                                            </p>
                                        </div>
                                        <div className="text-sm font-black text-white tabular-nums bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
                                            {amount}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </PageItem>

                {/* ── Settlement History ──────────────────────────────── */}
                <PageItem className="mb-8">
                    <h3 className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                        <History size={13} className="text-blue-400/50" />
                        Transaction History
                    </h3>

                    {(!stats.settlements || stats.settlements.length === 0) ? (
                        <div className="py-16 text-center border border-dashed border-white/5 rounded-3xl">
                            <Clock className="mx-auto text-white/10 mb-4" size={40} />
                            <p className="text-white/30 font-black text-[9px] uppercase tracking-widest">
                                No settlements processed yet.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.settlements.map((s) => (
                                <div
                                    key={s.id}
                                    className="group p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/20 transition-all duration-200"
                                >
                                    {/* Row header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Status icon */}
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${s.status === 'Processed'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                }`}>
                                                {s.status === 'Processed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                            </div>

                                            <div>
                                                <p className="text-sm font-black text-white tracking-tight uppercase leading-none mb-1.5">
                                                    Settlement #{s.id}
                                                </p>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={11} className="text-white/20" />
                                                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-[0.15em]">
                                                        {formatDate(s.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount + badge */}
                                        <div className="text-right">
                                            <div className={`text-2xl font-black tabular-nums tracking-tighter leading-none mb-2 ${s.status === 'Processed' ? 'text-white' : 'text-amber-400'}`}>
                                                ₹{s.amount.toLocaleString('en-IN')}
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border inline-block ${s.status === 'Processed'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bank reference */}
                                    {s.bankReference && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-3">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">
                                                Ref:
                                            </span>
                                            <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                                                <span className="font-mono text-[11px] font-bold text-blue-300 tracking-tight leading-none break-all">
                                                    {s.bankReference}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </PageItem>

                {/* ── Footer Note ────────────────────────────────────── */}
                <PageItem>
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                        <Info size={15} className="text-blue-400/40 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-white/25 leading-relaxed font-medium">
                            Settlements are processed in institutional reconciliation cycles — typically within
                            7–10 working days of approval. Waiver credits are applied directly to your child&apos;s fee ledger.
                        </p>
                    </div>
                </PageItem>

            </PageAnimate>
        </div>
    )
}
