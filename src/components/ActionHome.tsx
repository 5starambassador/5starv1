'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Share2, UserPlus, BarChart3, ChevronRight, Clock, Star, TrendingUp, Wallet, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { toast } from 'sonner'
import { useState } from 'react'

import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { StatCard } from '@/components/ui/StatCard'
import { encryptReferralCode } from '@/lib/crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://5starambassador.com'

import { ClientUser } from '@/types/client-types'

interface ActionHomeProps {
    user: ClientUser
    recentReferrals: {
        id: number
        parentName: string
        status: string
        createdAt: string
    }[]
    whatsappUrl: string
    monthStats?: {
        currentLeads: number
        prevLeads: number
        currentConfirmed: number
        prevConfirmed: number
    } | null
}

const buttonVariants: Variants = {
    rest: { scale: 1, y: 0 },
    hover: {
        scale: 1.05,
        y: -4,
        boxShadow: "0 10px 20px -5px rgba(0,0,0,0.2)",
        transition: { type: "spring", stiffness: 400, damping: 15 } as const
    },
    tap: { scale: 0.95 }
}

export function ActionHome({ user, recentReferrals, whatsappUrl, monthStats }: ActionHomeProps) {
    const firstName = user.fullName.split(' ')[0]
    const greeting = getGreeting()
    const [copied, setCopied] = useState(false)

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return null
        return ((current - previous) / previous) * 100
    }

    const referralTrend = monthStats ? calculateChange(monthStats.currentConfirmed, monthStats.prevConfirmed) : null
    const displayCount = (user as any).currentYearCount !== undefined ? (user as any).currentYearCount : user.confirmedReferralCount

    // Extract referral link from whatsappUrl if possible, or construct it
    const encryptedCode = user.referralCode ? encryptReferralCode(user.referralCode) : ''
    const referralLink = encryptedCode ? `${APP_URL}/r/${encryptedCode}` : ''

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        toast.success("Referral link copied")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <PageAnimate className="space-y-6 md:space-y-8 pb-10 font-[family-name:var(--font-outfit)]">
            {/* Optimized Fonts */}


            {/* Hero Section - Crimson Gradient (Original) */}
            <PageItem
                className="bg-grad-crimson rounded-[32px] md:rounded-[40px] p-6 md:p-10 text-white relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(225,29,72,0.3)] min-h-[480px] md:min-h-[420px] flex flex-col justify-between"
            >
                {/* Dynamic Background */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 blur-[80px]" />

                {/* 5-Star Badge */}
                {displayCount >= 5 && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                        className="absolute top-4 right-4 md:top-8 md:right-8 z-30"
                    >
                        <div className="relative group cursor-pointer">
                            <div className="absolute inset-0 bg-amber-500/30 blur-[40px] rounded-full animate-pulse z-0" />
                            <Image
                                src="/images/ambassador-badge.png"
                                alt="5-Star Ambassador"
                                width={120}
                                height={120}
                                className="w-[100px] md:w-[130px] h-auto drop-shadow-2xl relative z-10 transition-transform duration-300 group-hover:scale-110"
                            />
                        </div>
                    </motion.div>
                )}

                <div className="relative z-10 w-full">
                    {/* Header */}
                    <div className="mb-8">
                        <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 0.9, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-red-100 font-medium tracking-widest text-xs md:text-sm uppercase mb-1"
                        >
                            {greeting}
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-4xl md:text-5xl font-extrabold tracking-tight"
                        >
                            {firstName}! <motion.span
                                animate={{ rotate: [0, 15, -10, 15, 0] }}
                                transition={{ repeat: Infinity, repeatDelay: 5, duration: 2 }}
                                className="inline-block origin-bottom-right"
                            >👋</motion.span>
                        </motion.h1>
                        <p className="text-red-100/90 text-sm md:text-base mt-2 font-medium max-w-md">
                            {user.role === 'Alumni' ? 'Welcome to your Alumni APP Dashboard' : 'Your Achariya Partnership Program (APP) Dashboard'}
                        </p>

                        {/* Staff/Campus Tags */}
                        {user.role === 'Staff' && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {user.empId && <Badge label="EMP.ID" value={user.empId} />}
                                {user.assignedCampus && <Badge label="CAMPUS" value={user.assignedCampus} />}
                            </div>
                        )}
                    </div>

                    {/* Stats Grid - Original Pink/Yellow Layout */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {/* Original Progress Card (Pink) */}
                        <StatCard
                            title="Referrals"
                            value={displayCount.toString()}
                            icon={TrendingUp}
                            theme="red"
                            subValue={displayCount >= 5 ? '5-Star Reached!' : '5 more to 5-Star'}
                            className="!bg-white/10 !backdrop-blur-md !border-white/20 h-full !p-4 !rounded-[24px]"
                        />

                        {/* Original Benefit Card (Yellow) */}
                        <StatCard
                            title={user.role === 'Alumni' ? 'Benefit' : 'Fee Benefit'}
                            value={`${user.yearFeeBenefitPercent}%`}
                            icon={Wallet}
                            theme="amber"
                            subValue="Applied to Fee"
                            className="!bg-gradient-to-br !from-amber-400 !to-yellow-300 !text-white !border-white/20 h-full !p-4 !rounded-[24px] shadow-lg shadow-amber-900/10"
                        />
                    </div>
                </div>

                {/* Share Actions - Original */}
                <div className="flex items-center gap-3 mt-4">
                    <motion.a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variants={buttonVariants}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                        className="flex-1 group relative flex items-center justify-center gap-3 bg-white text-rose-600 h-14 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all overflow-hidden border border-white"
                    >
                        <div className="absolute inset-0 bg-rose-50/50 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <Share2 size={16} className="relative z-10" />
                        <span className="relative z-10">Share on WhatsApp</span>
                    </motion.a>

                    <button
                        onClick={handleCopy}
                        className="h-14 w-14 bg-white/20 hover:bg-white/30 backdrop-blur-xl text-white border border-white/20 rounded-[20px] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-lg"
                    >
                        {copied ? <Check size={20} className="text-emerald-300" /> : <Copy size={20} />}
                    </button>
                </div>
                <div className="text-center mt-3">
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.3em]">Official Channel</p>
                </div>
            </PageItem>

            {/* Dashboard Bento Sections - Original */}
            <PageItem className="grid grid-cols-2 gap-4">
                <Link href="/refer" className="block h-full">
                    <div className="group bg-grad-crimson text-white rounded-[24px] p-6 flex flex-col items-center justify-center gap-3 shadow-[0_15px_30px_-10px_rgba(225,29,72,0.2)] transition-all relative overflow-hidden h-full min-h-[140px]">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors" />
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500 relative z-10">
                            <UserPlus size={24} className="text-white" />
                        </div>
                        <div className="text-center relative z-10">
                            <span className="font-bold text-sm block leading-tight">Refer Lead</span>
                            <span className="text-[8px] font-bold uppercase tracking-[0.1em] opacity-60">Instant Reward</span>
                        </div>
                    </div>
                </Link>

                <Link href="/analytics" className="block h-full">
                    <div className="group glass-panel text-slate-800 dark:text-white rounded-[24px] p-6 flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden h-full border border-slate-200/50 dark:border-white/10 min-h-[140px]">
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-slate-100/50 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-rose-50/50 dark:group-hover:bg-white/10 transition-colors" />
                        <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/5 group-hover:scale-110 transition-transform duration-500 relative z-10">
                            <BarChart3 size={24} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                        </div>
                        <div className="text-center relative z-10">
                            <span className="font-bold text-sm block leading-tight tracking-tight">Analytics</span>
                            <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-white/40">Performance</span>
                        </div>
                    </div>
                </Link>

            </PageItem>

            {/* Recent Activity List - Original */}
            <PageItem className="glass-panel rounded-[32px] md:rounded-[40px] border border-slate-200/50 dark:border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100/50 dark:border-white/5">
                    <h3 className="font-bold text-lg text-ui-text-main tracking-tight">Recent Referrals</h3>
                    <div className="flex gap-2">
                        <Link href="/referrals" className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors">
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {recentReferrals.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 animate-pulse-slow">
                            <UserPlus size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-bold mb-1">No referrals yet</p>
                        <p className="text-gray-500 text-sm mb-6">Start sharing your code to earn benefits!</p>
                        <Link
                            href="/refer"
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-slate-900/20 active:scale-95"
                        >
                            <Share2 size={16} /> Share Program
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50/50">
                        {recentReferrals.slice(0, 3).map((ref, index) => (
                            <div
                                key={ref.id}
                                className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors border-b border-slate-50/50 dark:border-white/5 last:border-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-lg shadow-inner border border-white/20">
                                        {ref.parentName[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-ui-text-main text-sm mb-0.5">{ref.parentName}</p>
                                        <p className="text-[11px] text-gray-500 flex items-center gap-1 font-semibold uppercase tracking-wide">
                                            <Clock size={10} /> {new Date(ref.createdAt).toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={ref.status} />
                            </div>
                        ))}
                    </div>
                )}
            </PageItem>
        </PageAnimate>
    )
}

function Badge({ label, value }: { label: string, value: string }) {
    return (
        <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-100/60 uppercase tracking-widest">{label}</span>
            <span className="text-sm font-bold text-white tracking-wide">{value}</span>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        'Confirmed': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        'Follow-up': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        'New': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        'Rejected': 'bg-red-500/10 text-red-600 border-red-500/20'
    }
    const style = colors[status] || 'bg-gray-100 text-gray-600 border-gray-200'

    return (
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${style} backdrop-blur-sm`}>
            {status}
        </span>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Happy Morning'
    if (hour < 17) return 'Happy Afternoon'
    if (hour < 21) return 'Happy Evening'
    return 'Happy Night'
}
