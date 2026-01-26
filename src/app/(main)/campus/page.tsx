import { getCurrentUser } from '@/lib/auth-service'
import { getCampusStats, getCampusStudents, getCampusReferrals, getCampusFinance, getCampusRecentActivity, getCampusTargets, getCampusAmbassadorStats, getCampusDeadLeads, getCampusConversionStats } from '@/app/actions/campus-dashboard-actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, GraduationCap, TrendingUp, Search, Filter, MoreHorizontal, MapPin, CheckCircle2, XCircle, Clock, UserPlus, AlertCircle, BarChart3, ArrowLeft, Activity, ArrowUpRight, ArrowDownRight, Target, Building2 } from 'lucide-react'
import { CampusReportsClient } from './campus-reports-client'
import { DateRangeSelector } from './date-range-selector'
import { CampusTargetModal } from './campus-target-modal'

// Imports at top

import { CampusAnalyticsView } from '@/components/campus/CampusAnalyticsView'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ view?: string, days?: string }>
}

export default async function CampusDashboard({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Campus') && user.role !== 'Super Admin')) {
        return <div className="p-8 text-center text-red-500">Access Denied: Campus Admin Role Required</div>
    }

    const params = await searchParams
    const view = params?.view || 'home'
    const days = params?.days ? parseInt(params.days) : 30

    const { success, stats, error } = await getCampusStats(days)
    const targetsResult = await getCampusTargets()
    const target = targetsResult.success ? targetsResult.target : null

    if (error) {
        return <div className="p-8 text-center text-red-500 flex flex-col items-center gap-4">
            <AlertCircle size={48} className="text-red-300" />
            <p>{error}</p>
            <Link href="/campus" className="btn btn-outline">Retry</Link>
        </div>
    }

    // Helper for comparison percentages
    const getChange = (current: number, previous: number) => {
        if (!previous) return null
        const diff = ((current - previous) / previous) * 100
        return {
            value: Math.abs(diff).toFixed(0),
            isIncrease: diff >= 0
        }
    }

    const leadChange = getChange(stats?.newReferrals || 0, stats?.prevNewReferrals || 0)
    const admissionChange = getChange(stats?.confirmedAdmissions || 0, stats?.prevConfirmedAdmissions || 0)

    // View Components Array for easier management
    if (view === 'analytics') {
        return (
            <CampusAnalyticsView
                stats={stats}
                campusName={user.assignedCampus || 'All Campuses'}
                currentDays={days}
            />
        )
    }

    if (view === 'reports') {
        const [studentsResult, referralsResult, financeResult, ambassadorResult, deadResult, funnelResult] = await Promise.all([
            getCampusStudents(),
            getCampusReferrals(),
            getCampusFinance(),
            getCampusAmbassadorStats(),
            getCampusDeadLeads(),
            getCampusConversionStats()
        ])
        const students = studentsResult.success ? studentsResult.data || [] : []
        const referrals = referralsResult.success ? referralsResult.data || [] : []
        const financeData = financeResult.success ? financeResult.data || [] : []
        const financeSummary = financeResult.success ? financeResult.summary || { totalConfirmed: 0, totalBenefits: 0 } : { totalConfirmed: 0, totalBenefits: 0 }
        const ambassadorStats = ambassadorResult.success ? ambassadorResult.data || [] : []
        const deadLeads = deadResult.success ? deadResult.data || [] : []
        const conversionStats = funnelResult.success ? funnelResult.data || [] : []
        return (
            <div className="space-y-6 animate-fade-in">
                <Link href="/campus" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">Campus Reports</h1>
                    <p className="text-gray-500 mt-1">Export your campus data</p>
                </div>
                <CampusReportsClient
                    campusName={user.assignedCampus || 'All Campuses'}
                    students={students}
                    referrals={referrals}
                    financeData={financeData}
                    financeSummary={financeSummary}
                    ambassadorStats={ambassadorStats}
                    deadLeads={deadLeads}
                    conversionStats={conversionStats}
                />
            </div>
        )
    }

    if (view === 'finance') {
        const financeResult = await getCampusFinance(days)
        const financeData = financeResult.success ? financeResult.data || [] : []
        const financeSummary = financeResult.success ? financeResult.summary || { totalConfirmed: 0, totalBenefits: 0 } : { totalConfirmed: 0, totalBenefits: 0 }
        return (
            <div className="space-y-6 animate-fade-in">
                <Link href="/campus" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">Campus Finance</h1>
                        <p className="text-gray-500 mt-1">Earnings and incentive tracking</p>
                    </div>
                    <DateRangeSelector currentDays={days} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                        <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Confirmed</p>
                        <p className="text-3xl font-extrabold mt-1">{financeSummary.totalConfirmed}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                        <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Total Benefits</p>
                        <p className="text-3xl font-extrabold mt-1">₹{(financeSummary.totalBenefits || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                        <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Ambassadors</p>
                        <p className="text-3xl font-extrabold mt-1">{new Set(financeData.map((r: any) => r.ambassadorName)).size}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-hidden">
                    <h3 className="font-bold text-gray-900 mb-4">Incentive Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-400">
                                    <th className="text-left py-3 px-2 font-bold uppercase text-[10px] tracking-widest">Ambassador</th>
                                    <th className="text-left py-3 px-2 font-bold uppercase text-[10px] tracking-widest">Student</th>
                                    <th className="text-right py-3 px-2 font-bold uppercase text-[10px] tracking-widest">Base Fee</th>
                                    <th className="text-right py-3 px-2 font-bold uppercase text-[10px] tracking-widest">Benefit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {financeData.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-2 font-medium text-gray-800">{row.ambassadorName}</td>
                                        <td className="py-3 px-2 text-gray-600">{row.studentName}</td>
                                        <td className="py-3 px-2 text-right text-gray-600">₹{row.baseFee.toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right text-green-600 font-bold">₹{row.estimatedBenefit.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    // Default Home View
    return (
        <div className="space-y-8 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            {/* Premium Header - Library Component */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-100">
                        <Building2 size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{user.assignedCampus || 'Global Campus'}</h1>
                        <p className="text-sm text-gray-500 font-bold tracking-wide">Campus Overview • {user.fullName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {user.role === 'Super Admin' && (
                        <CampusTargetModal
                            currentLeads={target?.leadTarget}
                            currentAdmissions={target?.admissionTarget}
                        />
                    )}
                    <DateRangeSelector currentDays={days} />
                </div>
            </div>

            {/* Target Progress Section - Glass Cards */}
            {!target && user.role === 'Super Admin' ? (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-[32px] p-12 text-center shadow-inner">
                    <Target size={48} className="mx-auto text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-500 font-bold text-lg">No monthly targets set.</p>
                    <p className="text-gray-400 text-sm mt-1">Set a target to track performance.</p>
                </div>
            ) : target && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lead Goal Card */}
                    <div className="group relative overflow-hidden bg-white rounded-[32px] p-8 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.1)] border border-gray-100 hover:shadow-[0_30px_60px_-12px_rgba(37,99,235,0.2)] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full translate-x-10 -translate-y-10 blur-3xl opacity-50" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                        <TrendingUp size={20} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="font-black text-gray-900 text-lg tracking-tight">Lead Goal</h3>
                                </div>
                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                    {stats?.leadsNew || 0} / {target.leadTarget}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 mb-2">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(100, ((stats?.leadsNew || 0) / target.leadTarget) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest text-right">
                                {Math.round(((stats?.leadsNew || 0) / target.leadTarget) * 100)}% Achieved
                            </p>
                        </div>
                    </div>

                    {/* Admission Goal Card */}
                    <div className="group relative overflow-hidden bg-white rounded-[32px] p-8 shadow-[0_20px_40px_-12px_rgba(5,150,105,0.1)] border border-gray-100 hover:shadow-[0_30px_60px_-12px_rgba(5,150,105,0.2)] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-10 -translate-y-10 blur-3xl opacity-50" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <CheckCircle2 size={20} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="font-black text-gray-900 text-lg tracking-tight">Admissions</h3>
                                </div>
                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                                    {stats?.leadsConfirmed || 0} / {target.admissionTarget}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 mb-2">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(100, ((stats?.leadsConfirmed || 0) / target.admissionTarget) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest text-right">
                                {Math.round(((stats?.leadsConfirmed || 0) / target.admissionTarget) * 100)}% Achieved
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Stats Grid - Library Component */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Total Students</h3>
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <Users size={24} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-black text-gray-900">{stats?.totalStudents || 0}</h2>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">New Leads</h3>
                            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                                <UserPlus size={24} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-black text-gray-900">{stats?.newReferrals || 0}</h2>
                            {leadChange && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${leadChange.isIncrease ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {leadChange.isIncrease ? '+' : '-'}{leadChange.value}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Admissions</h3>
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                <CheckCircle2 size={24} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-black text-gray-900">{stats?.confirmedAdmissions || 0}</h2>
                            {admissionChange && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${admissionChange.isIncrease ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {admissionChange.isIncrease ? '+' : '-'}{admissionChange.value}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <RecentActivitySection />
                </div>

                {/* Quick Actions */}
                {/* Quick Actions */}
                <div className="h-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold mb-8 text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/campus/referrals" className="group flex items-center justify-between p-5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 shadow-inner">
                                    <UserPlus size={20} strokeWidth={2.5} />
                                </div>
                                <span className="font-bold text-lg">Process Admissions</span>
                            </div>
                            <MoreHorizontal size={24} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                        </Link>

                        <Link href="/campus/students" className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                                    <Users size={20} strokeWidth={2.5} />
                                </div>
                                <span className="font-bold text-gray-700 text-lg">Student Roster</span>
                            </div>
                            <MoreHorizontal size={24} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </Link>

                        <Link href="/campus?view=analytics" className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <BarChart3 size={20} strokeWidth={2.5} />
                                </div>
                                <span className="font-bold text-gray-700 text-lg">Detailed Analytics</span>
                            </div>
                            <MoreHorizontal size={24} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS (Refactored to Premium)
// ----------------------------------------------------------------------

async function RecentActivitySection() {
    const { success, data: activities } = await getCampusRecentActivity()

    if (!success || !activities || activities.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col justify-center items-center text-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 bg-gray-50 rounded-full mb-6">
                    <Activity size={32} className="text-gray-300" strokeWidth={1.5} />
                </div>
                <p className="text-gray-900 font-bold text-lg mb-1">No recent activity</p>
                <p className="text-gray-400 text-sm">New actions will appear here in real-time.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Recent Activity</h2>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Live Feed
                </span>
            </div>
            <div className="p-6 space-y-6">
                {activities.map((activity: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-5 group p-2 hover:bg-gray-50 rounded-2xl transition-colors">
                        <div className={`p-4 rounded-2xl shadow-sm border transition-all group-hover:scale-105 group-hover:shadow-md ${activity.type === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                            {activity.type === 'confirmed' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <UserPlus size={20} strokeWidth={2.5} />}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <p className="text-base text-gray-900 font-bold leading-snug group-hover:text-red-700 transition-colors">
                                {activity.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                    {activity.by}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                    • {new Date(activity.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
