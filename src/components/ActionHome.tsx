'use client'

import Link from 'next/link'
import { UserPlus, List, BarChart3, ChevronRight, Star, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface ActionHomeProps {
    user: {
        fullName: string
        role: string
        referralCode: string
        confirmedReferralCount: number
        yearFeeBenefitPercent: number
        benefitStatus: string
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

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden shadow-[0_24px_60px_-12px_rgba(220,38,38,0.3)]">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative z-10">
                    {/* Greeting */}
                    <p className="text-red-100/90 font-medium mb-1 tracking-wide text-sm">{greeting}</p>
                    <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">{firstName}! 👋</h1>
                    <p className="text-red-100 text-sm opacity-90 mb-8 font-medium">
                        {user.role === 'Alumni'
                            ? 'Welcome back to your Alumni Ambassador Dashboard'
                            : 'Welcome back to your Ambassador Dashboard'}
                    </p>

                    {/* Quick Stats Row */}
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-[20px] px-5 py-4 flex items-center gap-4 relative overflow-hidden group border border-white/10 shadow-inner">
                            <div className="p-2 bg-yellow-400/20 rounded-xl">
                                <TrendingUp size={20} className="text-yellow-300" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider font-bold text-red-100/80 mb-0.5">Confirmed</p>
                                <p className="text-2xl font-black tracking-tight">{user.confirmedReferralCount}</p>
                            </div>
                            {referralTrend !== null && (
                                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${referralTrend >= 0 ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-100 border border-amber-500/30'}`}>
                                    {referralTrend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                    {Math.abs(referralTrend).toFixed(0)}%
                                </div>
                            )}
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-[20px] px-5 py-4 flex items-center gap-4 border border-white/10 shadow-inner">
                            <div className="p-2 bg-yellow-400/20 rounded-xl">
                                <Star size={20} className="text-yellow-300" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider font-bold text-red-100/80 mb-0.5">{user.role === 'Alumni' ? 'Referral Benefit' : 'Fee Benefit'}</p>
                                <p className="text-2xl font-black tracking-tight">{user.yearFeeBenefitPercent}%</p>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Share Button */}
                    <div className="mt-8 flex flex-col gap-3">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-3 bg-white text-red-600 px-6 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-red-50 hover:scale-[1.02] active:scale-[0.98] transition-all no-underline group"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="w-5 h-5 fill-current"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Share Program Link
                        </a>
                        <p className="text-center text-[10px] text-red-100/60 font-medium uppercase tracking-[0.2em]">
                            Share this link with parents to earn benefits
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <Link
                    href="/refer"
                    className="group bg-gradient-to-br from-red-500 to-red-600 text-white rounded-[28px] p-6 flex flex-col items-center justify-center gap-3 shadow-[0_20px_40px_-12px_rgba(239,68,68,0.4)] hover:shadow-[0_24px_50px_-12px_rgba(239,68,68,0.5)] transition-all hover:-translate-y-1 active:scale-[0.98] no-underline relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <UserPlus size={28} className="text-white" />
                    </div>
                    <span className="font-bold text-base tracking-tight">Refer Now</span>
                </Link>

                <Link
                    href="/analytics"
                    className="group bg-white border border-gray-100 text-gray-800 rounded-[28px] p-6 flex flex-col items-center justify-center gap-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_50px_-15px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 active:scale-[0.98] no-underline"
                >
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-gray-100">
                        <BarChart3 size={28} className="text-gray-600 group-hover:text-primary-maroon transition-colors" />
                    </div>
                    <span className="font-bold text-base tracking-tight">My Status</span>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
                    <h3 className="font-bold text-xl text-gray-900 tracking-tight">Recent Referrals</h3>
                    <Link href="/referrals" className="text-primary-maroon text-sm font-bold flex items-center gap-1 no-underline hover:brightness-110 transition-all bg-red-50 px-3 py-1 rounded-full">
                        View All <ChevronRight size={16} />
                    </Link>
                </div>

                {recentReferrals.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <UserPlus size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-bold mb-1">No referrals yet</p>
                        <p className="text-gray-500 text-sm mb-6">Start sharing your code to earn benefits!</p>
                        <Link
                            href="/refer"
                            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold no-underline hover:bg-black transition-colors shadow-lg hover:translate-y-[-2px]"
                        >
                            <UserPlus size={18} /> Make Your First Referral
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recentReferrals.slice(0, 5).map((ref) => (
                            <div key={ref.id} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center text-red-600 font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                                        {ref.parentName[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm mb-0.5">{ref.parentName}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                                            <Clock size={12} /> {formatDate(ref.createdAt)}
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
                className="group flex items-center justify-between bg-white hover:bg-gray-50 border border-gray-100 rounded-[24px] p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] transition-all hover:translate-y-[-2px] no-underline"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-white transition-colors">
                        <BarChart3 size={24} className="text-gray-400 group-hover:text-primary-maroon transition-colors" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-base tracking-tight mb-0.5">View Full Analytics</p>
                        <p className="text-xs text-gray-500 font-medium">Detailed stats & benefit structure</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary-maroon group-hover:text-white transition-all">
                    <ChevronRight size={20} />
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
