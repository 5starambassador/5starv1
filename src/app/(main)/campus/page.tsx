import { getCurrentUser } from '@/lib/auth-service'
import { getCampusStats, getCampusStudents, getCampusReferrals, getCampusFinance, getCampusRecentActivity, getCampusTargets } from '@/app/actions/campus-dashboard-actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, GraduationCap, TrendingUp, Search, Filter, MoreHorizontal, MapPin, CheckCircle2, XCircle, Clock, UserPlus, AlertCircle, BarChart3, ArrowLeft, Activity, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react'
import { CampusReportsClient } from './campus-reports-client'
import { DateRangeSelector } from './date-range-selector'
import { CampusTargetModal } from './campus-target-modal'

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
    const { target } = await (getCampusTargets as any)()

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
            <div className="space-y-6 animate-fade-in text-gray-900">
                <Link href="/campus" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">
                            Campus Analytics
                        </h1>
                        <p className="text-gray-500 mt-1">Strategic overview for {user.assignedCampus || 'All Campuses'}</p>
                    </div>
                    <DateRangeSelector currentDays={days} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                        <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Students</p>
                        <p className="text-3xl font-extrabold mt-1">{stats?.totalStudents || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                        <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">New Leads</p>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-extrabold mt-1">{stats?.newReferrals || 0}</p>
                            {leadChange && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-white/20 mb-1 ${leadChange.isIncrease ? 'text-green-300' : 'text-red-300'}`}>
                                    {leadChange.isIncrease ? '↑' : '↓'} {leadChange.value}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                        <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Pending</p>
                        <p className="text-3xl font-extrabold mt-1">{stats?.pendingAdmissions || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                        <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Confirmed</p>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-extrabold mt-1">{stats?.confirmedAdmissions || 0}</p>
                            {admissionChange && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-white/20 mb-1 ${admissionChange.isIncrease ? 'text-green-300' : 'text-red-300'}`}>
                                    {admissionChange.isIncrease ? '↑' : '↓'} {admissionChange.value}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pipeline Funnel */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="text-primary-maroon" size={20} />
                            <h3 className="font-bold text-gray-900 text-lg">Lead Pipeline Funnel</h3>
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="relative">
                                <div className="bg-blue-500 rounded-xl p-4 text-white flex justify-between items-center z-10 relative">
                                    <div className="flex flex-col">
                                        <span className="text-blue-100 text-xs font-semibold uppercase tracking-wider">New Leads</span>
                                        <span className="text-2xl font-bold">{stats?.leadsNew || 0}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-blue-100 block opacity-80">Top of Funnel</span>
                                        <span className="text-sm font-medium">100%</span>
                                    </div>
                                </div>
                                <div className="flex justify-center -my-1 h-6 items-center">
                                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[10px] border-t-blue-500 opacity-40"></div>
                                </div>
                            </div>

                            <div className="relative scale-[0.9] origin-center -mt-2">
                                <div className="bg-orange-500 rounded-xl p-4 text-white flex justify-between items-center z-10 relative">
                                    <div className="flex flex-col">
                                        <span className="text-orange-100 text-xs font-semibold uppercase tracking-wider">Follow-up</span>
                                        <span className="text-2xl font-bold">{stats?.leadsFollowup || 0}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-orange-100 block opacity-80">Engagement</span>
                                        <span className="text-sm font-medium">
                                            {stats?.leadsNew ? (((stats.leadsFollowup || 0) / (stats.leadsNew + stats.leadsFollowup + stats.leadsConfirmed) * 100).toFixed(0)) : 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-center -my-1 h-6 items-center">
                                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[10px] border-t-orange-500 opacity-40"></div>
                                </div>
                            </div>

                            <div className="relative scale-[0.8] origin-center -mt-4">
                                <div className="bg-green-600 rounded-xl p-4 text-white flex justify-between items-center z-10 relative shadow-lg ring-4 ring-green-100">
                                    <div className="flex flex-col">
                                        <span className="text-green-100 text-xs font-semibold uppercase tracking-wider">Converted</span>
                                        <span className="text-2xl font-bold">{stats?.leadsConfirmed || 0}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-green-100 block opacity-80">Win Rate</span>
                                        <span className="text-sm font-medium">
                                            {stats ? (((stats.leadsConfirmed || 0) / (stats.leadsNew + stats.leadsFollowup + stats.leadsConfirmed || 1) * 100).toFixed(1)) : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-blue-500" />
                            Performance Summary
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Current Period Leads</p>
                                    <p className="text-xl font-bold text-gray-900">{stats?.newReferrals || 0}</p>
                                </div>
                                {leadChange && (
                                    <div className={`flex items-center gap-1 font-bold ${leadChange.isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                                        {leadChange.isIncrease ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                        {leadChange.value}%
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Conversions</p>
                                    <p className="text-xl font-bold text-gray-900">{stats?.confirmedAdmissions || 0}</p>
                                </div>
                                {admissionChange && (
                                    <div className={`flex items-center gap-1 font-bold ${admissionChange.isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                                        {admissionChange.isIncrease ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                        {admissionChange.value}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (view === 'reports') {
        const [studentsResult, referralsResult, financeResult] = await Promise.all([
            getCampusStudents(),
            getCampusReferrals(),
            getCampusFinance()
        ])
        const students = studentsResult.success ? studentsResult.data || [] : []
        const referrals = referralsResult.success ? referralsResult.data || [] : []
        const financeData = financeResult.success ? financeResult.data || [] : []
        const financeSummary = financeResult.success ? financeResult.summary || { totalConfirmed: 0, totalBenefits: 0 } : { totalConfirmed: 0, totalBenefits: 0 }
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
        <div className="space-y-8 animate-fade-in text-gray-900">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">
                        Campus Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">Hello, {user.fullName} 👋 Managing {user.assignedCampus || 'Global'}</p>
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

            {/* Target Progress Section */}
            {!target && user.role === 'Super Admin' ? (
                <div className="bg-white/50 border border-dashed border-gray-200 rounded-3xl p-8 text-center">
                    <Target size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium italic">No targets set for this month yet.</p>
                </div>
            ) : target && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white shadow-xl shadow-gray-200/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp size={16} className="text-blue-500" /> Lead Goal
                            </h3>
                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                {stats?.leadsNew || 0} / {target.leadTarget}
                            </span>
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden p-1">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((stats?.leadsNew || 0) / target.leadTarget) * 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 uppercase font-black tracking-widest text-right">
                            {Math.round(((stats?.leadsNew || 0) / target.leadTarget) * 100)}% Progress
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white shadow-xl shadow-gray-200/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-500" /> Admissions
                            </h3>
                            <span className="text-xs font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                {stats?.leadsConfirmed || 0} / {target.admissionTarget}
                            </span>
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden p-1">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-sm transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((stats?.leadsConfirmed || 0) / target.admissionTarget) * 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 uppercase font-black tracking-widest text-right">
                            {Math.round(((stats?.leadsConfirmed || 0) / target.admissionTarget) * 100)}% Progress
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Students"
                    value={stats?.totalStudents || 0}
                    icon={<Users className="text-blue-500" />}
                    bg="bg-blue-50"
                />
                <StatCard
                    title="New Leads"
                    value={stats?.newReferrals || 0}
                    icon={<UserPlus className="text-purple-500" />}
                    bg="bg-purple-50"
                    change={leadChange}
                />
                <StatCard
                    title="Admissions"
                    value={stats?.confirmedAdmissions || 0}
                    icon={<CheckCircle2 className="text-green-500" />}
                    bg="bg-green-50"
                    change={admissionChange}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentActivitySection />
                </div>
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-white shadow-xl shadow-gray-200/50">
                    <h2 className="text-xl font-bold mb-6 text-gray-800">Quick Actions</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/campus/referrals" className="group flex items-center justify-between p-4 bg-primary-maroon text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-primary-maroon/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl"><UserPlus size={20} /></div>
                                <span className="font-bold">Process Admissions</span>
                            </div>
                            <MoreHorizontal size={20} className="opacity-40" />
                        </Link>
                        <Link href="/campus/students" className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-gold/10 text-primary-gold rounded-xl"><Users size={20} /></div>
                                <span className="font-bold text-gray-700">Student Roster</span>
                            </div>
                            <MoreHorizontal size={20} className="text-gray-300" />
                        </Link>
                        <Link href="/campus?view=analytics" className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><BarChart3 size={20} /></div>
                                <span className="font-bold text-gray-700">Analytics</span>
                            </div>
                            <MoreHorizontal size={20} className="text-gray-300" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

async function RecentActivitySection() {
    const { success, data: activities } = await getCampusRecentActivity()
    if (!success || !activities || activities.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-white shadow-xl shadow-gray-200/50 min-h-[400px] flex flex-col justify-center items-center">
                <Activity size={48} className="text-gray-100 mb-4" />
                <p className="text-gray-400 font-medium">No recent activity detected</p>
            </div>
        )
    }
    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-white shadow-xl shadow-gray-200/50">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="text-primary-maroon" size={20} />
                    <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Live Updates</span>
            </div>
            <div className="space-y-6">
                {activities.map((activity: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-4 group">
                        <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${activity.type === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {activity.type === 'confirmed' ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                        </div>
                        <div className="flex-1 min-w-0 border-b border-gray-50 pb-4 group-last:border-0">
                            <p className="text-sm text-gray-800 font-bold leading-tight">{activity.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {activity.by} • {new Date(activity.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, bg, change }: { title: string, value: number, icon: any, bg: string, change?: any }) {
    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-white flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${bg} group-hover:bg-white transition-colors`}>{icon}</div>
                {change && (
                    <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${change.isIncrease ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {change.isIncrease ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {change.value}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
                <h3 className="text-3xl font-extrabold mt-1 text-gray-900 tracking-tight">{value.toLocaleString()}</h3>
            </div>
        </div>
    )
}
