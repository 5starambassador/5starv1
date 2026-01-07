'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Share2, UserPlus, BarChart3, ChevronRight, Clock, Star, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'

// StatusBadge is defined locally in this file
import { StatCard } from '@/components/ui/StatCard'

interface ActionHomeProps {
    user: {
        fullName: string
        role: string
        referralCode: string
        confirmedReferralCount: number
        yearFeeBenefitPercent: number
        benefitStatus: string
        empId?: string
        assignedCampus?: string
    }
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

export function ActionHome({ user, recentReferrals, whatsappUrl, monthStats }: ActionHomeProps) {
    const firstName = user.fullName.split(' ')[0]
    const greeting = getGreeting()

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return null
        return ((current - previous) / previous) * 100
    }

    const referralTrend = monthStats ? calculateChange(monthStats.currentConfirmed, monthStats.prevConfirmed) : null

    const displayCount = (user as any).currentYearCount !== undefined ? (user as any).currentYearCount : user.confirmedReferralCount
    const isFiveStar = user.benefitStatus === 'Active' && user.yearFeeBenefitPercent >= 50 // Or explicit 5-star flag

    return (
        <div className="space-y-6 md:space-y-8 pb-10 font-[family-name:var(--font-outfit)]">
            {/* Import Premium Font Locally - Standard HTML */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <style dangerouslySetInnerHTML={{
                __html: `
                :root { --font-outfit: 'Outfit', sans-serif; }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-float-slow {
                    animation: float-slow 4s ease-in-out infinite;
                }
            `}} />

            {/* Hero Section - Optimized Mobile Padding */}
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-[24px] md:rounded-[32px] p-6 md:p-10 text-white relative overflow-hidden shadow-[0_20px_50px_-12px_rgba(220,38,38,0.3)] animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                {/* 5-Star Achievement Badge - Ultra Premium Shield Trophy Style */}
                {/* 5-Star Achievement Badge - Using Reference Image Asset */}
                {displayCount >= 5 && (
                    <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30 animate-in fade-in zoom-in duration-1000 delay-500">
                        <div className="relative group flex flex-col items-center">
                            {/* Enhanced Multi-Layer Premium Glow */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 bg-amber-500/30 blur-[50px] rounded-full animate-pulse" />
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 bg-yellow-400/25 blur-[35px] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                            <div className="absolute inset-0 bg-gradient-radial from-amber-400/20 to-transparent blur-xl" />


                            {/* Badge Image with Premium Styling - Transparent Background via CSS */}
                            <div className="relative animate-float-slow drop-shadow-[0_15px_30px_rgba(245,158,11,0.5)]">
                                <Image
                                    src="/images/ambassador-badge.png"
                                    alt="5-Star Ambassador Badge"
                                    width={110}
                                    height={110}
                                    priority
                                    className="w-[90px] md:w-[110px] h-auto transition-transform duration-500 group-hover:scale-110 select-none"
                                    style={{
                                        filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))',
                                        mixBlendMode: 'multiply'
                                    }}
                                />

                                {/* Overlay Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                            </div>

                            {/* Stronger light below */}
                            <div className="absolute -bottom-2 w-3/4 h-2 bg-amber-500/30 blur-lg animate-pulse" />
                        </div>
                    </div>
                )}

                <div className="relative z-10">
                    {/* Greeting */}
                    <p className="text-red-100/90 font-medium mb-1 tracking-wide text-xs md:text-sm uppercase opacity-80">{greeting}</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight leading-tight">{firstName}! 👋</h1>
                    <p className="text-red-100 text-sm opacity-90 mb-8 font-medium">
                        {user.role === 'Alumni'
                            ? 'Welcome back to your Alumni Ambassador Dashboard'
                            : 'Welcome back to your Ambassador Dashboard'}
                    </p>

                    {/* Staff Details Badge */}
                    {user.role === 'Staff' && (
                        <div className="flex flex-wrap gap-3 mb-6 animate-in fade-in slide-in-from-left-4 duration-500">
                            {user.empId && (
                                <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-red-100/60 uppercase tracking-widest">EMP.ID</span>
                                    <span className="text-sm font-bold text-white tracking-wide">{user.empId}</span>
                                </div>
                            )}
                            {user.assignedCampus && (
                                <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-red-100/60 uppercase tracking-widest">CAMPUS</span>
                                    <span className="text-sm font-bold text-white tracking-wide">{user.assignedCampus}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Confirmed / Progress Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-[20px] p-5 relative overflow-hidden group border border-white/10 shadow-lg hover:bg-white/15 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 bg-yellow-400/20 rounded-xl">
                                    <TrendingUp size={22} className="text-yellow-300" />
                                </div>
                                {referralTrend !== null && (
                                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${referralTrend >= 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-amber-500/20 text-amber-100'}`}>
                                        {referralTrend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {Math.abs(referralTrend).toFixed(0)}%
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-red-100/70 mb-1">Active Referrals (This Year)</p>
                                <div className="flex items-baseline gap-2 mb-3">
                                    <h2 className="text-4xl font-black tracking-tight">{displayCount}</h2>
                                    <span className="text-sm font-bold text-red-100/50">/ 5 Goal</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-2 w-full bg-black/20 rounded-full overflow-hidden mb-2.5">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(253,224,71,0.5)]"
                                        style={{ width: `${Math.min((displayCount / 5) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] font-semibold text-red-100/90 flex items-center gap-1.5">
                                    {displayCount >= 5
                                        ? <span><Star size={10} className="inline fill-yellow-300 text-yellow-300" /> You're a 5-Star Ambassador!</span>
                                        : `${5 - displayCount} more to reach 5-Star Status`}
                                </p>
                            </div>
                        </div>

                        {/* Benefit Card */}
                        <StatCard
                            title={user.role === 'Alumni' ? 'Referral Benefit' : 'Fee Benefit'}
                            value={`${user.yearFeeBenefitPercent}%`}
                            icon={Wallet}
                            theme="amber"
                            subValue="Applied to Annual Fee"
                        />
                    </div>

                    {/* WhatsApp Share Button */}
                    <div className="mt-6 md:mt-8">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full relative overflow-hidden group flex items-center justify-center gap-3 bg-white text-[#075e54] px-6 py-4 md:py-5 rounded-[20px] font-black text-sm md:text-base uppercase tracking-widest shadow-[0_20px_40px_-12px_rgba(255,255,255,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:scale-[0.98] transition-all no-underline"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <svg className="w-6 h-6 fill-[#25D366]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span>Share Program Link</span>
                        </a>
                        <p className="text-center text-[10px] text-red-100/70 font-bold uppercase tracking-[0.2em] mt-3 animate-pulse">
                            Official Channel
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
                <Link
                    href="/refer"
                    className="group bg-gradient-to-br from-red-500 to-red-600 text-white rounded-[24px] p-5 md:p-6 flex flex-col items-center justify-center gap-3 shadow-[0_15px_30px_-10px_rgba(239,68,68,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(239,68,68,0.5)] transition-all hover:-translate-y-1 active:scale-[0.98] no-underline relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors" />

                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300 relative z-10 backdrop-blur-sm border border-white/10">
                        <UserPlus size={24} className="text-white drop-shadow-sm" />
                    </div>
                    <span className="font-bold text-sm md:text-base tracking-tight relative z-10">Refer Now</span>
                </Link>

                <Link
                    href="/analytics"
                    className="group bg-white border border-gray-100 text-gray-800 rounded-[24px] p-5 md:p-6 flex flex-col items-center justify-center gap-3 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 active:scale-[0.98] no-underline relative overflow-hidden"
                >
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gray-50 rounded-full blur-2xl group-hover:bg-red-50 transition-colors" />

                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary-maroon/10 relative z-10 border border-gray-100">
                        <BarChart3 size={24} className="text-gray-400 group-hover:text-primary-maroon transition-colors" />
                    </div>
                    <span className="font-bold text-sm md:text-base tracking-tight relative z-10 group-hover:text-primary-maroon transition-colors">My Status</span>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 fill-mode-both">
                <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-50">
                    <h3 className="font-bold text-lg text-gray-900 tracking-tight">Recent Referrals</h3>
                    <div className="flex gap-2">
                        <Link href="/referrals" className="text-xs font-bold text-primary-maroon uppercase tracking-wider flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors">
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {recentReferrals.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 rotate-3">
                            <UserPlus size={28} className="text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-bold mb-1">No referrals yet</p>
                        <p className="text-gray-500 text-sm mb-6">Start sharing your code to earn benefits!</p>
                        <Link
                            href="/refer"
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold no-underline hover:bg-black transition-colors shadow-lg hover:shadow-xl hover:translate-y-[-1px]"
                        >
                            <UserPlus size={16} /> Make Your First Referral
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recentReferrals.slice(0, 5).map((ref) => (
                            <div key={ref.id} className="flex items-center justify-between p-4 md:p-5 hover:bg-gray-50/50 transition-colors group cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-xl md:rounded-2xl flex items-center justify-center text-red-600 font-black text-sm md:text-lg shadow-sm group-hover:scale-105 transition-transform">
                                        {ref.parentName[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm mb-0.5">{ref.parentName}</p>
                                        <p className="text-[11px] text-gray-500 flex items-center gap-1 font-semibold uppercase tracking-wide">
                                            <Clock size={10} /> {formatDate(ref.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={ref.status} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* View Analytics Link */}
            <Link
                href="/analytics"
                className="group flex items-center justify-between bg-white hover:bg-gray-50 border border-gray-100 rounded-[20px] p-4 md:p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] transition-all hover:translate-y-[-2px] no-underline"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-white transition-colors">
                        <BarChart3 size={20} className="text-gray-400 group-hover:text-primary-maroon transition-colors" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-sm md:text-base tracking-tight mb-0.5">View Full Analytics</p>
                        <p className="text-xs text-gray-500 font-medium">Detailed stats & benefit structure</p>
                    </div>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary-maroon group-hover:text-white transition-all">
                    <ChevronRight size={16} />
                </div>
            </Link>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string, text: string }> = {
        'Confirmed': { bg: 'bg-green-100', text: 'text-green-700' },
        'Follow-up': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
        'New': { bg: 'bg-blue-100', text: 'text-blue-700' },
        'Rejected': { bg: 'bg-red-100', text: 'text-red-700' }
    }
    const style = colors[status] || { bg: 'bg-gray-100', text: 'text-gray-700' }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {status}
        </span>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Happy Morning'
    if (hour < 17) return 'Happy Afternoon'
    return 'Happy Evening'
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
