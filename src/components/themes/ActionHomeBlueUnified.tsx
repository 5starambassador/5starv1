'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Share2, UserPlus, ChevronRight, Clock, Star, TrendingUp, Wallet, Copy, Check, CheckCircle, Award, ChevronDown, User } from 'lucide-react'
import { motion, Variants } from 'framer-motion'
import { toast } from 'sonner'
import { useState, useEffect, ReactNode } from 'react'

import { SHORT_TERM_TIERS } from '@/lib/benefit-calculator'

import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { GlassCard } from '@/components/ui/GlassCard'

interface ActionHomeBlueUnifiedProps {
    user: {
        fullName: string
        role: string
        confirmedReferralCount: number
        yearFeeBenefitPercent: number
        potentialFeeBenefitPercent?: number
        benefitStatus: string
        empId?: string | null
        assignedCampus?: string | null
        referralCode: string
        studentFee?: number
    }
    recentReferrals: any[]
    whatsappUrl: string
    referralLink: string
    monthStats?: any | null
    totalLeadsCount?: number
    overrideEarnedAmount?: number
    overrideEstimatedAmount?: number
}

// Animation Variants
const buttonVariants: Variants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
}

// Convert Object Tier Map to Array for Display
const tiers = Object.entries(SHORT_TERM_TIERS).map(([count, percent]) => ({
    count: parseInt(count),
    percent: percent
}))

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Happy Morning'
    if (hour < 17) return 'Happy Afternoon'
    if (hour < 21) return 'Happy Evening'
    return 'Happy Night'
}

export function ActionHomeBlueUnified({ user, recentReferrals, whatsappUrl, referralLink, monthStats, totalLeadsCount = 0, overrideEarnedAmount, overrideEstimatedAmount }: ActionHomeBlueUnifiedProps) {
    const firstName = user.fullName.split(' ')[0]

    // Dynamic Data
    const displayCount = user.confirmedReferralCount

    const [greeting, setGreeting] = useState('')
    const [subtitle, setSubtitle] = useState<ReactNode>('')

    // Greeting Data Logic - Always target 5 Star
    const unitsToNext = 5 - displayCount

    useEffect(() => {
        const hour = new Date().getHours()
        let timeGreeting = 'Happy Morning'
        if (hour >= 12 && hour < 17) timeGreeting = 'Happy Afternoon'
        if (hour >= 17 && hour < 21) timeGreeting = 'Happy Evening'
        if (hour >= 21) timeGreeting = 'Happy Night'

        setGreeting(timeGreeting)

        // Set Contextual Subtitle
        if (displayCount >= 5) {
            setSubtitle(<span className="!text-amber-400">You've reached the Executive Elite.</span>)
        } else if (unitsToNext > 0) {
            setSubtitle(<>You’re only <span className="!text-amber-400">{unitsToNext} {unitsToNext === 1 ? 'unit' : 'units'}</span> away from achieving <span className="!text-amber-400">5-Star Member status</span>.</>)
        } else {
            setSubtitle("Your Royal Impact Overview") // Default fallback
        }
    }, [displayCount, unitsToNext])

    const [longTermExpanded, setLongTermExpanded] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        toast.success('Referral link copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    // Dynamic Data
    // displayCount is already declared

    const benefitPercent = user.yearFeeBenefitPercent || 0
    const potentialBenefitPercent = user.potentialFeeBenefitPercent || 0
    // If user.studentFee is present (from props via page.tsx), use it. But overrides take precedence for Benefit Logic.
    const totalFee = user.studentFee || 60000

    // Labels based on role (or if overrides are used, assume Commission/Earnings style?)
    const isParent = user.role === 'Parent'
    const benefitLabel = isParent ? 'Fee Benefit' : 'Earnings'

    // Calculate Amounts (Override Logic Added)
    const currentBenefitAmount = overrideEarnedAmount !== undefined
        ? overrideEarnedAmount
        : (totalFee * benefitPercent) / 100

    const potentialBenefitAmount = overrideEstimatedAmount !== undefined
        ? overrideEstimatedAmount
        : (totalFee * potentialBenefitPercent) / 100


    return (
        <PageAnimate className="relative flex flex-col gap-6 pb-24 md:pb-12 max-w-[1400px] mx-auto overflow-hidden">
            {/* Liquid Mesh Gradient Atmospheric Blobs - MOTION ENABLED */}
            <motion.div
                animate={{
                    x: [0, 30, 0],
                    y: [0, -20, 0],
                    scale: [1, 1.1, 1]
                }
                }
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/[0.08] rounded-full blur-[120px] pointer-events-none"
            />
            <motion.div
                animate={{
                    x: [0, -40, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/[0.06] rounded-full blur-[100px] pointer-events-none"
            />
            <motion.div
                animate={{
                    x: [0, 20, 0],
                    y: [0, 40, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[10%] left-[5%] w-[35%] h-[35%] bg-purple-600/[0.04] rounded-full blur-[80px] pointer-events-none"
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 transition-all duration-500"
            >
                <div className="lg:col-span-8 space-y-6">
                    <motion.div variants={itemVariants} className="space-y-6">
                        {/* Hero Section - Elite Greeting */}
                        <GlassCard className="flex-1 relative overflow-hidden !bg-gradient-to-br !from-blue-700/80 !to-indigo-900/90 !border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] group backdrop-brightness-100">
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div>
                                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-900/50 backdrop-blur-2xl border border-blue-400/40 text-[10px] font-black uppercase tracking-[0.2em] text-white mb-3 shadow-2xl">
                                        <Star size={12} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                                        <span>Achariya Partnership Program (APP)</span>
                                    </div>
                                    <div className="mb-6">
                                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-amber-400/50 text-[10px] font-black !text-amber-400 uppercase tracking-[0.25em] shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                                            25<sup className="text-[0.6em] ml-0.5">th</sup> <span className="ml-1.5">Year Celebration</span>
                                        </div>
                                    </div>
                                    <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-[-0.05em] leading-[0.9] drop-shadow-2xl">
                                        {greeting}, <br className="hidden md:block" /> <span className="text-white/80">{firstName}</span>
                                    </h1>
                                    <p className="text-blue-100/60 font-black uppercase tracking-[0.3em] text-[10px] mt-6">
                                        {subtitle}
                                    </p>
                                </div>

                                <div className="mt-10 flex items-center gap-10 opacity-90">
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-blue-200/40 font-black mb-2">Account Status</p>
                                        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-[11px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)] animate-pulse" />
                                            Verified
                                        </div>
                                    </div>
                                    <div className="w-px h-12 bg-white/10" />
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-blue-200/40 font-black mb-2">Campus</p>
                                        <p className="text-white font-black text-2xl tracking-tighter uppercase leading-none">{user.assignedCampus || 'Corporate'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Background Decor - Mesh Gradient Style */}
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay" />
                            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-overlay" />
                        </GlassCard>

                        <div className="flex flex-col md:flex-row gap-6 w-full relative z-10 transition-all duration-700">
                            {/* Referral Status Card - SAPPHIRE THEME */}
                            <GlassCard className="w-full md:w-64 !bg-gradient-to-br !from-blue-600/20 !via-blue-900/40 !to-indigo-950/60 border-blue-400/50 shadow-[0_20px_60px_rgba(30,58,138,0.7)] group/blue hover:border-blue-400/70 transition-all">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/40 via-transparent to-transparent pointer-events-none" />
                                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center py-6">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10 group-hover/blue:text-blue-400 transition-colors">Referral Status</h3>
                                    <div className="relative group/progress">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-[50px] rounded-full scale-150 group-hover/progress:bg-blue-300/30 transition-all duration-700" />
                                        <CircularProgress
                                            value={displayCount}
                                            max={5}
                                            size={140}
                                            strokeWidth={8}
                                            className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                                        >
                                            <div className="text-center w-full">
                                                <div className="text-5xl font-black text-white tracking-[-0.05em] leading-none mb-1 group-hover/progress:scale-110 transition-transform duration-700">
                                                    {displayCount}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Units</div>
                                            </div>
                                        </CircularProgress>
                                    </div>
                                    <div className="mt-6">
                                        {displayCount >= 5 ? (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: "spring" }}
                                                className="space-y-2"
                                            >
                                                <div className="text-amber-400/60 font-medium text-[10px] uppercase tracking-widest animate-pulse">
                                                    Peak Achievement
                                                </div>
                                                <div className="bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-[0_8px_20px_rgba(245,158,11,0.2)] inline-flex items-center gap-2 border border-amber-300/30">
                                                    <Star size={12} fill="black" />
                                                    5-Star Elite
                                                    <Star size={12} fill="black" />
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-slate-400 uppercase tracking-widest group-hover/blue:bg-blue-500/10 transition-colors">
                                                Next Goal: <span className="!text-amber-400 font-bold">5-Star</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 blur-[40px] rounded-full group-hover/blue:bg-blue-500/10 transition-colors" />
                            </GlassCard>

                            {/* Net Rewards Card - PLATINUM: Vibrant Indigo Theme */}
                            <GlassCard className="flex-1 !bg-gradient-to-br !from-indigo-950 !via-indigo-900/90 !to-blue-900 backdrop-blur-3xl border border-indigo-400/40 shadow-2xl group/indigo hover:border-indigo-400/60 transition-all duration-700 flex flex-col p-0 overflow-hidden">
                                <div className="relative z-10 flex flex-col justify-between flex-1 p-6 md:p-10">
                                    <div className="flex items-center gap-5 mb-10">
                                        <div className="w-14 h-14 bg-white/10 rounded-[20px] flex items-center justify-center backdrop-blur-2xl border border-white/20 group-hover/indigo:scale-110 group-hover/indigo:rotate-3 transition-transform shadow-2xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-transparent" />
                                            <Wallet size={24} className="text-white relative z-10 drop-shadow-lg" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.3em] block mb-1">
                                                Net Rewards
                                            </span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                                {benefitLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-1">
                                            Secured Balance
                                        </div>
                                        <div className="flex items-baseline gap-4">
                                            <div className="text-5xl md:text-7xl font-black tracking-[-0.05em] text-white leading-none tabular-nums drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                                ₹{currentBenefitAmount.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[12px] font-black text-white bg-indigo-500/40 px-3 py-1 rounded-xl border border-white/20 backdrop-blur-md mb-2 shadow-xl">{benefitPercent}%</div>
                                        </div>
                                    </div>

                                    <Wallet className="absolute -bottom-16 -right-16 text-white/[0.03] rotate-[-20deg] group-hover/indigo:rotate-[-10deg] group-hover/indigo:scale-110 transition-all duration-1000 pointer-events-none blur-[1px]" size={240} />
                                </div>

                                {/* Integrated Premium Footer - Seamless Unified Approach (Single Color) */}
                                <div className="relative z-20 p-6 md:px-10 mt-auto transition-all bg-transparent">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-2">
                                                Projected Potential
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-2xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
                                                    ₹{potentialBenefitAmount.toLocaleString('en-IN')}
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black text-indigo-300 uppercase tracking-widest shadow-inner">
                                                    <TrendingUp size={12} className="text-emerald-400" />
                                                    {potentialBenefitPercent}% Efficiency
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.8)] animate-pulse" />
                                    </div>
                                </div>
                            </GlassCard>
                        </div>


                        <div className="flex items-center gap-3 mt-6">
                            <motion.a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                variants={buttonVariants}
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                                className="flex-1 group relative flex items-center justify-center gap-4 bg-emerald-500/10 backdrop-blur-3xl text-emerald-400 h-16 rounded-[28px] font-black text-[11px] uppercase tracking-[0.25em] shadow-[0_10px_30px_rgba(16,185,129,0.1)] border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_15px_40px_rgba(16,185,129,0.2)] transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <Share2 size={18} className="relative z-10 drop-shadow-lg" />
                                <span className="relative z-10">Invite Friends</span>
                            </motion.a>

                            <button
                                onClick={handleCopy}
                                className="h-14 w-14 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl text-white border border-white/10 rounded-[24px] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-lg relative group"
                            >
                                {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} className="opacity-40 group-hover:opacity-100" />}
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl">Copy Link</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* PRIMARY CTA - Prominent Refer Button - Elite Polish */}
                    <motion.div variants={itemVariants}>
                        <PageItem className="relative z-10 mt-6">
                            <Link href="/refer">
                                <motion.div
                                    variants={buttonVariants}
                                    initial="rest"
                                    whileHover="hover"
                                    whileTap="tap"
                                    className="group bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-xl border border-white/30 rounded-[32px] p-8 flex items-center justify-between shadow-2xl hover:bg-white/20 transition-all relative overflow-hidden cursor-pointer"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-colors opacity-50" />
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center border border-white/20 shadow-[0_8px_16px_rgba(245,158,11,0.2)]">
                                            <UserPlus size={32} className="text-white" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight mb-1 text-white uppercase italic">Refer a Family Now</h3>
                                            <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-widest">Start earning royal benefits today</p>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-amber-400 group-hover:border-amber-400/40 transition-all">
                                        <ChevronRight size={24} className="text-white/40 group-hover:text-black transition-colors" />
                                    </div>
                                </motion.div>
                            </Link>
                        </PageItem>
                    </motion.div>

                    {/* BENEFIT STRUCTURE - Royal Glass Theme (Blue-Slate Variant) */}
                    <motion.div variants={itemVariants}>
                        <PageItem className="bg-gradient-to-br from-blue-800/70 to-slate-900/70 backdrop-blur-xl rounded-[32px] md:rounded-[40px] p-6 md:p-8 border border-blue-400/40 shadow-2xl relative z-10 mt-6 backdrop-brightness-125">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm" />
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic">Benefits</h2>
                                    <p className="text-[10px] text-blue-200/60 font-black uppercase tracking-widest mt-0.5">Tiered Rewards Structure</p>
                                </div>
                            </div>

                            {/* Short Term Tiers */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <CheckCircle size={14} className="text-blue-400" />
                                    <span className="text-[10px] font-black text-blue-200/80 uppercase tracking-widest">Current Year (Short Term)</span>
                                </div>
                                <div className="grid grid-cols-5 gap-2 md:gap-3">
                                    {tiers.map((tier, index) => {
                                        const isCurrentTier = displayCount === tier.count
                                        const isAchieved = displayCount >= tier.count
                                        const tierColors = [
                                            '!from-blue-600/30 !via-blue-900/50 !to-indigo-950/70 border-blue-400/40 text-blue-200 shadow-[0_10px_30px_rgba(30,58,138,0.3)]',
                                            '!from-purple-600/30 !via-purple-900/50 !to-slate-950/70 border-purple-500/40 text-purple-200 shadow-[0_10px_30_rgba(88,28,135,0.3)]',
                                            '!from-teal-600/30 !via-teal-900/50 !to-slate-950/70 border-teal-500/40 text-teal-200 shadow-[0_10px_30px_rgba(13,148,136,0.3)]',
                                            '!from-emerald-600/30 !via-emerald-900/50 !to-slate-950/70 border-emerald-500/40 text-emerald-200 shadow-[0_10px_30px_rgba(5,150,105,0.3)]',
                                            'from-amber-300 via-amber-450 to-amber-600 text-black font-black shadow-[0_0_30px_rgba(245,158,11,0.5)] shadow-inner brightness-110'
                                        ]

                                        const getCardClasses = () => {
                                            const isFuture = tier.count > displayCount
                                            const isNext = tier.count > displayCount && (index === 0 || displayCount >= tiers[index - 1]?.count)

                                            let baseStyle = `bg-gradient-to-br ${tierColors[index]} border backdrop-blur-sm`
                                            if (index === 4) baseStyle = `bg-gradient-to-br from-amber-300 via-amber-450 to-amber-600 border-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)] shadow-inner brightness-110`

                                            if (isCurrentTier) return `${baseStyle} scale-105 z-10 shadow-2xl ring-2 ring-white/50 opacity-100`
                                            if (isAchieved) return `${baseStyle} opacity-100 shadow-md`
                                            if (isNext) return `${baseStyle} opacity-70 grayscale-[0.1] shadow-sm`
                                            return `${baseStyle} opacity-50 grayscale-[0.3]`
                                        }

                                        return (
                                            <div key={tier.count} className={`relative py-4 md:py-6 px-2 rounded-2xl text-center transition-all duration-500 ${getCardClasses()}`}>
                                                <div className={`text-[9px] font-black uppercase tracking-[0.15em] mb-1.5 ${index === 4 ? 'text-black/70' : 'text-white/40'}`}>
                                                    {tier.count} {tier.count > 1 ? 'Units' : 'Unit'}
                                                </div>
                                                <div className={`text-xl md:text-3xl font-black tracking-tighter tabular-nums leading-none ${index === 4 ? 'text-black' : 'text-white'}`}>
                                                    <span className="inline-block">{tier.percent}</span>
                                                    <span className="text-sm md:text-xl ml-0.5 opacity-60">%</span>
                                                </div>
                                                {isCurrentTier && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_12px_white]" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Long Term Benefits */}
                            <div className="bg-white/5 rounded-[24px] overflow-hidden border border-white/10 group/lt">
                                <button
                                    onClick={() => setLongTermExpanded(!longTermExpanded)}
                                    className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center border border-amber-400/20 group-hover:scale-110 transition-transform">
                                            <Star size={20} className="text-amber-400 fill-amber-400" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Long Term Loyalty</h3>
                                            <p className="text-[10px] text-blue-200/40 font-black uppercase tracking-widest mt-0.5">Recurring annual reduction</p>
                                        </div>
                                    </div>
                                    <ChevronDown size={20} className={`text-white/20 transition-transform duration-500 ${longTermExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                                </button>

                                {longTermExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-6 pb-6"
                                    >
                                        <div className="flex items-center justify-center gap-3 mb-6 bg-white/5 py-4 rounded-2xl border border-white/5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star
                                                    key={i}
                                                    size={28}
                                                    className={`${i <= displayCount
                                                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                                                        : 'text-white/[0.03]'
                                                        } transition-all duration-700`}
                                                    strokeWidth={i <= displayCount ? 0 : 2}
                                                />
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="!bg-gradient-to-br !from-blue-600/20 !via-blue-900/40 !to-indigo-950/60 rounded-2xl p-5 border border-blue-500/30 group-hover/lt:border-blue-500/50 shadow-lg transition-all">
                                                <p className="text-[9px] font-black text-blue-300/80 uppercase tracking-[0.2em] mb-3">Base Loyalty</p>
                                                <div className="flex items-end gap-1.5">
                                                    <p className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">15%</p>
                                                    <span className="text-[10px] text-blue-300/50 font-black uppercase mb-1">Annual</span>
                                                </div>
                                            </div>
                                            <div className="!bg-gradient-to-br !from-emerald-600/20 !via-emerald-900/40 !to-teal-950/60 rounded-2xl p-5 border border-emerald-500/30 group-hover/lt:border-emerald-500/50 shadow-lg transition-all">
                                                <p className="text-[9px] font-black text-emerald-300/80 uppercase tracking-[0.2em] mb-3">Bonus Boost</p>
                                                <div className="flex items-end gap-1.5">
                                                    <p className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">+5%</p>
                                                    <span className="text-[10px] text-emerald-300/50 font-black uppercase mb-1">Per Ref</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/10">
                                            <p className="text-[9px] text-amber-200/40 font-black uppercase tracking-widest leading-relaxed text-center w-full">
                                                * Unlock requirement: Single verified unit in current cycle
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </PageItem>
                    </motion.div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <motion.div variants={itemVariants} className="flex flex-col gap-6">
                        {/* PERFORMANCE OVERVIEW - RUBY THEME */}
                        {monthStats && (
                            <PageItem className="relative z-10 overflow-hidden group/ruby">
                                <GlassCard className="!bg-gradient-to-br !from-rose-800/30 !via-rose-900/40 !to-purple-900/50 border-rose-500/40 shadow-[0_20px_60px_rgba(159,18,57,0.5)] hover:border-rose-500/60 transition-all">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-[40px] -mr-16 -mt-16 rounded-full group-hover/ruby:bg-rose-500/30 transition-colors" />
                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                        <div className="w-1 h-8 bg-gradient-to-b from-rose-500 to-purple-600 rounded-full" />
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase leading-none">Performance</h2>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5 group-hover/ruby:text-rose-400 transition-colors">Yield Tracking</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        <div className="p-4 rounded-[24px] bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all group/stat1 relative overflow-hidden">
                                            {/* Micro-Sparkline: Pending */}
                                            <svg className="absolute top-1/2 right-2 w-16 h-8 -translate-y-1/2 opacity-20 group-hover/stat1:opacity-40 transition-opacity" viewBox="0 0 100 50">
                                                <path d="M0 40 Q 25 35, 50 20 T 100 10" fill="none" stroke="currentColor" strokeWidth="4" className="text-rose-400" />
                                            </svg>
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-2 group-hover/stat1:text-rose-300 transition-colors relative z-10">Pending</span>
                                            <div className="flex items-end gap-1.5 font-black text-white">
                                                <span className="text-4xl tracking-tighter tabular-nums leading-none group-hover/stat1:scale-110 transition-transform">{totalLeadsCount || 0}</span>
                                                <span className="text-[10px] text-rose-400 font-bold uppercase mb-1.5 opacity-60">Leads</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-[24px] bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-all group/stat2 relative overflow-hidden">
                                            {/* Micro-Sparkline: Confirmed */}
                                            <svg className="absolute top-1/2 right-2 w-16 h-8 -translate-y-1/2 opacity-20 group-hover/stat2:opacity-40 transition-opacity" viewBox="0 0 100 50">
                                                <path d="M0 40 L 20 35 L 40 38 L 60 20 L 80 25 L 100 5" fill="none" stroke="currentColor" strokeWidth="4" className="text-indigo-400" />
                                            </svg>
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-2 group-hover/stat2:text-indigo-300 transition-colors relative z-10">Confirmed</span>
                                            <div className="flex items-end gap-1.5 font-black text-white">
                                                <span className="text-4xl tracking-tighter tabular-nums leading-none group-hover/stat2:scale-110 transition-transform">{displayCount}</span>
                                                <span className="text-[10px] text-indigo-400 font-bold uppercase mb-1.5 opacity-60">Units</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/10 blur-[60px] rounded-full group-hover/ruby:bg-purple-600/20 transition-all" />
                                </GlassCard>
                            </PageItem>
                        )}

                        {/* RECENT REFERRALS - EMERALD/CYAN THEME */}
                        <PageItem className="relative z-10 min-h-[300px] group/cyan">
                            <GlassCard className="!bg-gradient-to-br !from-emerald-600/20 !via-emerald-900/40 !to-teal-950/60 border-emerald-500/40 shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:border-emerald-500/60 transition-all h-full p-0">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-400/20 blur-[40px] -ml-16 -mt-16 rounded-full group-hover/cyan:bg-emerald-400/30 transition-colors" />
                                <div className="flex items-center justify-between p-6 border-b border-emerald-400/20 relative z-10 bg-emerald-950/40">
                                    <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Activity</h3>
                                    <Link href="/referrals" className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-1 hover:bg-cyan-400/10 px-3 py-1.5 rounded-full transition-all border border-transparent hover:border-cyan-400/20 group-hover/cyan:translate-x-1 transition-transform">
                                        View Referrals <ChevronRight size={14} />
                                    </Link>
                                </div>

                                {recentReferrals.length === 0 ? (
                                    <div className="p-12 text-center relative z-10">
                                        <motion.div
                                            animate={{
                                                y: [0, -10, 0],
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-slate-500 group-hover/cyan:text-cyan-400 transition-colors shadow-xl"
                                        >
                                            <UserPlus size={24} />
                                        </motion.div>
                                        <p className="text-white font-bold mb-1 uppercase tracking-tight">No Activity</p>
                                        <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest mb-6">Start sharing to earn</p>
                                        <Link href="/refer" className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
                                            Make First Referral
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5 relative z-10">
                                        {recentReferrals.map((referral) => (
                                            <div key={referral.id} className="p-5 hover:bg-white/5 transition-colors group/item">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/10 to-blue-600/10 rounded-xl flex items-center justify-center text-white font-black shadow-inner border border-white/10 uppercase">
                                                        {(referral.studentName || referral.parentName).charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-xs text-slate-200 truncate group-hover/item:text-white transition-colors uppercase tracking-tight">
                                                            {referral.studentName || referral.parentName}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${referral.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                                {referral.status}
                                                            </span>
                                                            <span className="text-[9px] text-slate-500 flex items-center gap-1 font-medium uppercase">
                                                                <Clock size={8} /> {new Date(referral.createdAt).toLocaleDateString('en-GB')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </GlassCard>
                        </PageItem>
                    </motion.div>
                </div>
            </motion.div >
        </PageAnimate >
    )
}
