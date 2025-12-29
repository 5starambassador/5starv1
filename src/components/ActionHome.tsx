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
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    {/* Greeting */}
                    <p className="text-red-200 text-sm font-medium mb-1">{greeting}</p>
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{firstName}! 👋</h1>
                    <p className="text-red-100 text-sm opacity-80 mb-6">
                        Welcome back to your Ambassador Dashboard
                    </p>

                    {/* Quick Stats Row */}
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden group">
                            <TrendingUp size={20} className="text-yellow-300" />
                            <div>
                                <p className="text-xs text-red-200">Confirmed</p>
                                <p className="text-xl font-bold">{user.confirmedReferralCount}</p>
                            </div>
                            {referralTrend !== null && (
                                <div className={`absolute -right-1 -top-1 px-1.5 py-0.5 rounded-bl-lg text-[8px] font-black flex items-center gap-0.5 ${referralTrend >= 0 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {referralTrend >= 0 ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                                    {Math.abs(referralTrend).toFixed(0)}%
                                </div>
                            )}
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
                            <Star size={20} className="text-yellow-300" />
                            <div>
                                <p className="text-xs text-red-200">Fee Benefit</p>
                                <p className="text-xl font-bold">{user.yearFeeBenefitPercent}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
                <Link
                    href="/refer"
                    className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all hover:-translate-y-0.5 no-underline"
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <UserPlus size={24} />
                    </div>
                    <span className="font-bold text-sm">Refer Now</span>
                </Link>

                <Link
                    href="/analytics"
                    className="bg-white border border-gray-200 text-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 no-underline"
                >
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <BarChart3 size={24} className="text-gray-600" />
                    </div>
                    <span className="font-bold text-sm">My Status</span>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Recent Referrals</h3>
                    <Link href="/referrals" className="text-red-600 text-sm font-medium flex items-center gap-1 no-underline">
                        View All <ChevronRight size={16} />
                    </Link>
                </div>

                {recentReferrals.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserPlus size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm mb-4">No referrals yet</p>
                        <Link
                            href="/refer"
                            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium no-underline"
                        >
                            <UserPlus size={16} /> Make Your First Referral
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recentReferrals.slice(0, 5).map((ref) => (
                            <div key={ref.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">
                                        {ref.parentName[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{ref.parentName}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
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
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-colors no-underline"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <BarChart3 size={20} className="text-gray-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 text-sm">View Full Analytics</p>
                        <p className="text-xs text-gray-500">Detailed stats & benefit structure</p>
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
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
