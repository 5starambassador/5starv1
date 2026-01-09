'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
    Download,
    FileText,
    PieChart,
    BarChart,
    Users,
    Building2,
    ShieldCheck,
    TrendingUp,
    FileDown,
    ArrowRight,
    Mail,
    LayoutGrid,
    Presentation,
    Loader2,
    Calendar,
    Target,
    Zap,
    Star,
    Sparkles,
    Compass,
    Activity,
    Heart,
    Clock
} from 'lucide-react'
import {
    ResponsiveContainer,
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as ReTooltip,
    CartesianGrid,
    Cell,
    LineChart as ReLineChart,
    Line,
    Legend,
    AreaChart,
    Area,
    PieChart as RePieChart,
    Pie
} from 'recharts'
import { generatePDFReport } from '@/lib/pdf-export'
import { emailReport } from '@/app/reporting-actions'
import {
    generateReferralPerformanceReport,
    generatePendingLeadsReport,
    generateMonthlyTrendsReport,
    generateInactiveUsersReport,
    generateTopPerformersReport,
    generateCampusDistributionReport,
    generateBenefitTierReport,
    generateNewRegistrationsReport,
    generateStaffVsParentReport,
    generateLeadPipelineReport,
    generateStarMilestoneReport,
    generateConversionFunnelData,
    generateFinancialROIData,
    generateTargetAchievementData,
    generateStarMilestonesData,
    generateAdmissionIntelligenceData,
    generateRetentionAnalyticsData
} from '@/app/report-actions'

interface ReportsPanelProps {
    users?: any[]
    campuses?: any[]
    admins?: any[]
    campusComparison?: any[]
    onDownloadReport: (reportFunction: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>) => Promise<void>
    onWeeklyReport?: () => Promise<void>
}

export function ReportsPanel({
    users = [],
    campuses = [],
    admins = [],
    campusComparison = [],
    onDownloadReport,
    onWeeklyReport
}: ReportsPanelProps) {
    const searchParams = useSearchParams()
    const modeParam = searchParams.get('mode')

    const [emailingId, setEmailingId] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
    const [selectedCampus, setSelectedCampus] = useState<string>('All')
    const [reportMode, setReportMode] = useState<'classic' | 'visual'>((modeParam as any) || 'classic')
    const [isLoadingVisual, setIsLoadingVisual] = useState(false)
    const [visualData, setVisualData] = useState<{
        funnel: any[],
        roi: any,
        achievement: any[],
        velocity: string,
        milestones: { distribution: any[], risingStars: any[] },
        intelligence: { campuses: any[], totalPredicted: number, avgVelocity: string },
        retention: { cohorts: any[], avgDaysToConfirm: string }
    }>({
        funnel: [],
        roi: null,
        achievement: [],
        velocity: '0',
        milestones: { distribution: [], risingStars: [] },
        intelligence: { campuses: [], totalPredicted: 0, avgVelocity: '0' },
        retention: { cohorts: [], avgDaysToConfirm: '0' }
    })

    const fetchVisualData = async () => {
        setIsLoadingVisual(true)
        try {
            const filters = {
                startDate: dateRange.start || undefined,
                endDate: dateRange.end || undefined,
                campus: selectedCampus !== 'All' ? selectedCampus : undefined
            }

            const [funnelRes, roiRes, achievementRes, milestoneRes, intelligenceRes, retentionRes] = await Promise.all([
                generateConversionFunnelData(filters),
                generateFinancialROIData(filters),
                generateTargetAchievementData({ campus: filters.campus }),
                generateStarMilestonesData({ campus: filters.campus }),
                generateAdmissionIntelligenceData({ campus: filters.campus }),
                generateRetentionAnalyticsData({ campus: filters.campus })
            ])

            setVisualData({
                funnel: funnelRes.success ? (funnelRes.funnelData || []) : [],
                roi: roiRes.success ? roiRes.roi : null,
                achievement: achievementRes.success ? (achievementRes.achievementData || []) : [],
                velocity: funnelRes.success ? (funnelRes.avgVelocity || '0') : '0',
                milestones: (milestoneRes.success && milestoneRes.milestones) ? milestoneRes.milestones : { distribution: [], risingStars: [] },
                intelligence: intelligenceRes.success ? (intelligenceRes.intelligence || { campuses: [], totalPredicted: 0, avgVelocity: '0' }) : { campuses: [], totalPredicted: 0, avgVelocity: '0' },
                retention: retentionRes.success ? (retentionRes.retention || { cohorts: [], avgDaysToConfirm: '0' }) : { cohorts: [], avgDaysToConfirm: '0' }
            })
        } catch (error) {
            toast.error('Failed to load visual insights')
        } finally {
            setIsLoadingVisual(false)
        }
    }

    // Sync mode with query param
    useEffect(() => {
        if (modeParam === 'visual' || modeParam === 'classic') {
            setReportMode(modeParam as 'classic' | 'visual')
        }
    }, [modeParam])

    // Refetch when filters change while in visual mode
    useEffect(() => {
        if (reportMode === 'visual') {
            fetchVisualData()
        }
    }, [reportMode, dateRange.start, dateRange.end, selectedCampus])

    const uniqueCampuses = Array.from(new Set(campuses.map(c => c.campusName || c.campus).filter(Boolean)))

    const handleEmailReport = async (reportId: string) => {
        setEmailingId(reportId)
        try {
            const res = await emailReport(reportId)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error('Failed to send email')
        } finally {
            setEmailingId(null)
        }
    }

    const handleDownload = (action: any) => {
        const filters = {
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined,
            campus: selectedCampus !== 'All' ? selectedCampus : undefined
        }
        onDownloadReport(() => action(filters))
    }

    const handlePDFExport = (type: 'users' | 'campus' | 'admins') => {
        let filteredUsers = users
        let filteredAdmins = admins
        let filteredCampusComparison = campusComparison

        if (selectedCampus !== 'All') {
            filteredUsers = users.filter(u => u.assignedCampus === selectedCampus)
            filteredAdmins = admins.filter(a => a.assignedCampus === selectedCampus)
            filteredCampusComparison = campusComparison.filter(c => c.campus === selectedCampus)
        }

        switch (type) {
            case 'users':
                generatePDFReport({
                    title: `Users Report ${selectedCampus !== 'All' ? `- ${selectedCampus}` : ''}`,
                    subtitle: `Total Users: ${filteredUsers.length}`,
                    fileName: 'users_report',
                    columns: [
                        { header: 'Name', dataKey: 'fullName' },
                        { header: 'Mobile', dataKey: 'mobileNumber' },
                        { header: 'Role', dataKey: 'role' },
                        { header: 'Campus', dataKey: 'assignedCampus' },
                        { header: 'Status', dataKey: 'status' }
                    ],
                    data: filteredUsers.map(u => ({ ...u, assignedCampus: u.assignedCampus || 'N/A' }))
                })
                break
            case 'campus':
                generatePDFReport({
                    title: 'Campus Management Report',
                    subtitle: `Total Campuses: ${filteredCampusComparison.length}`,
                    fileName: 'campus_management',
                    columns: [
                        { header: 'Campus', dataKey: 'campus' },
                        { header: 'Total Leads', dataKey: 'totalLeads' },
                        { header: 'Confirmed', dataKey: 'confirmed' },
                        { header: 'Pending', dataKey: 'pending' },
                        { header: 'Conversion %', dataKey: 'conversionRate' }
                    ],
                    data: filteredCampusComparison
                })
                break
            case 'admins':
                generatePDFReport({
                    title: 'Admin Directory',
                    subtitle: `Total Admins: ${filteredAdmins.length}`,
                    fileName: 'admins_directory',
                    columns: [
                        { header: 'Name', dataKey: 'adminName' },
                        { header: 'Mobile', dataKey: 'adminMobile' },
                        { header: 'Role', dataKey: 'role' },
                        { header: 'Campus', dataKey: 'assignedCampus' },
                        { header: 'Status', dataKey: 'status' }
                    ],
                    data: filteredAdmins.map(a => ({ ...a, assignedCampus: a.assignedCampus || 'N/A' }))
                })
                break
        }
    }

    const reportGroups = [
        {
            id: 'monthly-trends',
            title: 'Growth Trends',
            count: '12-Month Analysis',
            desc: 'Analyze registration and conversion trends over the past year.',
            icon: FileText,
            color: 'from-amber-500 to-amber-600',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            action: generateMonthlyTrendsReport,
            canEmail: true
        },
        {
            id: 'top-performers',
            title: 'Top Performers',
            count: 'Leaderboard Export',
            desc: 'Detailed breakdown of high-impact ambassadors and their benefits.',
            icon: ShieldCheck,
            color: 'from-emerald-500 to-emerald-600',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            action: generateTopPerformersReport,
            canEmail: true
        },
        {
            id: 'benefit-tiers',
            title: 'Benefit Analysis',
            count: 'Tier Distribution',
            desc: 'Analyze how many users are in each star slab and the payout spread.',
            icon: PieChart,
            color: 'from-indigo-500 to-indigo-600',
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            border: 'border-indigo-200',
            action: generateBenefitTierReport,
            canEmail: true
        },
        {
            id: 'pipeline-lifecycle',
            title: 'Pipeline Lifecycle',
            count: 'All conversion stages',
            desc: 'Track leads from referral through follow-up to admission.',
            icon: BarChart,
            color: 'from-purple-500 to-purple-600',
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200',
            action: generateLeadPipelineReport,
            canEmail: true
        },
        {
            id: 'star-milestones',
            title: 'Star Milestones',
            count: 'Targeted Outreach',
            desc: 'Identify users near their next star tier for localized campaigns.',
            icon: TrendingUp,
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            action: generateStarMilestoneReport,
            canEmail: true
        },
        {
            id: 'new-registrations',
            title: 'New Ambassadors',
            count: 'Recent Joiners',
            desc: 'Export a list of ambassadors who joined within the selected period.',
            icon: Users,
            color: 'from-teal-500 to-teal-600',
            bg: 'bg-teal-50',
            text: 'text-teal-700',
            border: 'border-teal-200',
            action: generateNewRegistrationsReport,
            canEmail: true
        },
        {
            id: 'segment-comparison',
            title: 'Segment Analysis',
            count: 'Staff vs Parent',
            desc: 'Compare engagement levels and conversion across roles.',
            icon: PieChart,
            color: 'from-orange-500 to-orange-600',
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
            action: generateStaffVsParentReport,
            canEmail: true
        },
        {
            id: 'campus-dist',
            title: 'Campus Footprint',
            count: 'Regional Comparison',
            desc: 'Distribution of ambassadors and leads across all campuses.',
            icon: Building2,
            color: 'from-cyan-500 to-cyan-600',
            bg: 'bg-cyan-50',
            text: 'text-cyan-700',
            border: 'border-cyan-200',
            action: generateCampusDistributionReport,
            canEmail: true
        },
        {
            id: 'churn-risk',
            title: 'Inactive Ambassadors',
            count: 'Re-engagement List',
            desc: 'Identify ambassadors with zero activity in the selected window.',
            icon: Users,
            color: 'from-red-500 to-red-600',
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
            action: generateInactiveUsersReport,
            canEmail: true
        }
    ]

    return (
        <div className="space-y-6 animate-fade-in pb-4">
            {/* Mode Switcher & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-2xl w-fit border border-gray-200/50">
                    <button
                        onClick={() => setReportMode('classic')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${reportMode === 'classic' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid size={14} />
                        Classic Downloads
                    </button>
                    <button
                        onClick={() => setReportMode('visual')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${reportMode === 'visual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Zap size={14} className={reportMode === 'visual' ? 'text-amber-500' : ''} />
                        Visual Insights
                    </button>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2">
                        <div className="px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Analysis Period</label>
                            <div className="flex items-center gap-2 mt-0.5">
                                <input
                                    type="date"
                                    className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none w-24"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                />
                                <span className="text-gray-300">-</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none w-24"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center">
                        <div className="px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Campus View</label>
                            <select
                                className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none mt-0.5 min-w-[140px] cursor-pointer"
                                value={selectedCampus}
                                onChange={(e) => setSelectedCampus(e.target.value)}
                            >
                                <option value="All">All Campuses</option>
                                {uniqueCampuses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {reportMode === 'classic' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {reportGroups.map((group) => (
                        <div key={group.id} className="group relative bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${group.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${group.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <group.icon size={28} className="text-white" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-gray-900 mb-1 leading-tight">{group.title}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{group.count}</p>
                                <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{group.desc}</p>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button
                                        onClick={() => handleDownload(group.action)}
                                        className="col-span-1 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Download size={14} />
                                        <span>CSV</span>
                                    </button>

                                    <button
                                        onClick={() => handleEmailReport(group.id)}
                                        disabled={emailingId === group.id}
                                        className="col-span-1 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                                    >
                                        {emailingId === group.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Mail size={14} />
                                        )}
                                        <span>Email</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                    {isLoadingVisual ? (
                        <div className="h-[400px] bg-white rounded-[32px] border border-gray-100 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center border border-amber-100 mb-4">
                                <Loader2 className="text-amber-500 animate-spin" size={32} />
                            </div>
                            <h3 className="text-lg font-black text-gray-900">Crunching Real-time Data...</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-2">We're aggregating campus performance and financial ROI for your selected filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Funnel Insight */}
                            <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                                <div className="flex justify-between items-start mb-8 text-gray-900">
                                    <div>
                                        <h3 className="text-xl font-black flex items-center gap-2">
                                            <TrendingUp className="text-blue-500" size={24} />
                                            Conversion Funnel Efficiency
                                        </h3>
                                        <p className="text-sm text-gray-500">Pipeline health and drop-off analysis</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl flex flex-col items-end">
                                        <span className="text-[10px] font-black text-blue-400 uppercase">Avg. Velocity</span>
                                        <span className="text-lg font-black text-blue-600">{visualData.velocity} Days</span>
                                    </div>
                                </div>

                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ReBarChart data={visualData.funnel} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="stage" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                                            <ReTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={40}>
                                                {visualData.funnel.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </ReBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* ROI Yield */}
                            <div className="bg-gray-900 rounded-[32px] shadow-2xl p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[100px]" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-[100px]" />

                                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                    <Zap className="text-amber-400" size={24} />
                                    Financial ROI
                                </h3>

                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Gross Revenue Yield</p>
                                        <p className="text-3xl font-black">₹{visualData.roi?.revenue?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Benefit burden</p>
                                        <p className="text-3xl font-black text-red-400">- ₹{visualData.roi?.cost?.toLocaleString()}</p>
                                    </div>
                                    <div className="h-px bg-white/10" />
                                    <div>
                                        <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">Net Program Yield</p>
                                        <p className="text-4xl font-black text-emerald-400">₹{visualData.roi?.netYield?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 text-center">ROI Efficiency Ratio</p>
                                        <p className="text-2xl font-black text-center text-amber-400">{visualData.roi?.roiRatio}x</p>
                                    </div>

                                    {/* Segmented Profitability */}
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Profitability by Role</p>
                                        {visualData.roi?.breakdown?.map((seg: any) => (
                                            <div key={seg.role} className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-gray-300">{seg.role}</span>
                                                    <span className="text-emerald-400">₹{(seg.net / 1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (seg.net / (visualData.roi?.netYield || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Star Distribution & Performance */}
                            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Star Distribution */}
                                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex flex-col">
                                    <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                        <Star className="text-amber-500" size={24} fill="currentColor" />
                                        Ambassador Stars
                                    </h3>
                                    <div className="h-[250px] w-full flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                                <Pie
                                                    data={visualData.milestones.distribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {[
                                                        '#EAB308', // 1-Star
                                                        '#F59E0B', // 2-Star
                                                        '#D97706', // 3-Star
                                                        '#B45309', // 4-Star
                                                        '#78350F'  // 5-Star
                                                    ].map((color, index) => (
                                                        <Cell key={`cell-${index}`} fill={color} />
                                                    ))}
                                                </Pie>
                                                <ReTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Rising Stars */}
                                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] shadow-xl p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32" />
                                    <div className="relative z-10 h-full flex flex-col">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-xl font-black flex items-center gap-2">
                                                    <Sparkles className="text-amber-300" size={24} />
                                                    Rising Stars
                                                </h3>
                                                <p className="text-indigo-100/70 text-sm font-medium">Almost at the next milestone</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {visualData.milestones.risingStars.length > 0 ? (
                                                visualData.milestones.risingStars.map((star: any) => (
                                                    <div key={star.name} className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/20 transition-all cursor-default">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                                                                {star.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">{star.name}</p>
                                                                <p className="text-[10px] text-indigo-200 mt-0.5 uppercase tracking-wider font-black">{star.campus}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest leading-none mb-1">Needs {star.needed - star.current}</p>
                                                            <p className="text-xs font-bold text-white">for {star.nextTier}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 flex flex-col items-center justify-center py-8 opacity-50">
                                                    <Target size={32} className="mb-2" />
                                                    <p className="text-sm font-bold">All stars are currently stable.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strategic Forecast & Admission Intelligence */}
                            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Compass size={120} className="rotate-12" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                <Sparkles className="text-indigo-400" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black">Strategic Forecast</h3>
                                                <p className="text-indigo-300/70 text-sm font-medium">30-Day Predictive Admissions Yield</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mb-8">
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Expected Yield</p>
                                                <p className="text-4xl font-black text-white">+{visualData.intelligence.totalPredicted}</p>
                                                <p className="text-xs text-indigo-200/60 mt-1">Next 30 Days Forecast</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Rolling Velocity</p>
                                                <p className="text-4xl font-black text-emerald-400">{visualData.intelligence.avgVelocity}</p>
                                                <p className="text-xs text-indigo-200/60 mt-1">Days to Confirm (Avg)</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {visualData.intelligence.campuses.slice(0, 3).map((camp: any) => (
                                                <div key={camp.campus} className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                                                    <span className="font-bold text-indigo-100">{camp.campus}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs text-indigo-300">Pipeline: {camp.pipelineSize}</span>
                                                        <span className="font-black text-emerald-400">Yield: +{camp.predictedYield}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-8 text-gray-900">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-2">
                                                <Activity className="text-emerald-500" size={24} />
                                                Admission Velocity
                                            </h3>
                                            <p className="text-sm text-gray-500">Processing speed by campus (Days)</p>
                                        </div>
                                    </div>

                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={visualData.intelligence.campuses}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="campus" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '10px', fontWeight: 700 } }} />
                                                <ReTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                <Bar name="Velocity (Days)" dataKey="velocity" fill="#10B981" radius={[8, 8, 0, 0]} barSize={40}>
                                                    {visualData.intelligence.campuses.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.velocity > 15 ? '#EF4444' : entry.velocity > 7 ? '#F59E0B' : '#10B981'} />
                                                    ))}
                                                </Bar>
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-gray-400">Fast (&lt;7d)</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] font-bold text-gray-400">Moderate (7-15d)</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] font-bold text-gray-400">Slow (&gt;15d)</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Ambassador Health & Retention Analytics */}
                            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-8 text-gray-900">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-2">
                                                <Heart className="text-rose-500" size={24} />
                                                Ambassador Health
                                            </h3>
                                            <p className="text-sm text-gray-500">Activity cohorts & retention risk</p>
                                        </div>
                                    </div>

                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                                <Pie
                                                    data={visualData.retention.cohorts}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {visualData.retention.cohorts.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <ReTooltip />
                                                <Legend iconType="circle" />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-8 text-gray-900">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-2">
                                                <Clock className="text-amber-500" size={24} />
                                                Conversion Efficiency
                                            </h3>
                                            <p className="text-sm text-gray-500">Processing speed across the pipeline</p>
                                        </div>
                                        <div className="bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100 text-right">
                                            <p className="text-[10px] font-black text-amber-500 uppercase leading-none mb-1">Total Velocity</p>
                                            <p className="text-lg font-black text-amber-700">{visualData.retention.avgDaysToConfirm} Days</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 mt-8">
                                        {[
                                            { label: 'Lead Entry', time: '0 Days', color: 'bg-emerald-500' },
                                            { label: 'Nurturing', time: (parseFloat(visualData.retention.avgDaysToConfirm || '0') * 0.4).toFixed(1) + ' Days', color: 'bg-amber-500' },
                                            { label: 'Follow-up', time: (parseFloat(visualData.retention.avgDaysToConfirm || '0') * 0.3).toFixed(1) + ' Days', color: 'bg-orange-500' },
                                            { label: 'Admission', time: (parseFloat(visualData.retention.avgDaysToConfirm || '0') * 0.3).toFixed(1) + ' Days', color: 'bg-rose-500' }
                                        ].map((step, idx, arr) => (
                                            <div key={step.label} className="flex-1 relative">
                                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{step.label}</p>
                                                    <p className="text-lg font-black text-gray-800">{step.time}</p>
                                                </div>
                                                {idx < arr.length - 1 && (
                                                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                                                        <ArrowRight size={16} className="text-gray-300" />
                                                    </div>
                                                )}
                                                <div className={`h-1 mt-2 rounded-full ${step.color} opacity-20`} style={{ width: '100%' }} />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-center text-[11px] font-medium text-gray-400 mt-8 italic">
                                        * Stage times are estimated based on total conversion velocity patterns.
                                    </p>
                                </div>
                            </div>

                            {/* Campus Comparison & Capacity */}
                            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-8 text-gray-900">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-2">
                                                <Target className="text-purple-500" size={24} />
                                                Target Achievement
                                            </h3>
                                            <p className="text-sm text-gray-500">Admissions vs. Monthly Goals</p>
                                        </div>
                                    </div>

                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={visualData.achievement}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="campus" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                                <ReTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700 }} />
                                                <Bar name="Target" dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                                <Bar name="Actual" dataKey="actual" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-8 text-gray-900">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-2">
                                                <ShieldCheck className="text-emerald-500" size={24} />
                                                Capacity Buffer
                                            </h3>
                                            <p className="text-sm text-gray-500">Enrollment vs. Campus Capacity</p>
                                        </div>
                                    </div>

                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={visualData.achievement} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="campus" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} width={80} />
                                                <ReTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                <Bar name="Capacity Buffer" dataKey="capacity" fill="#f1f5f9" radius={[0, 4, 4, 0]} barSize={12} />
                                                <Bar name="Current Enrollment" dataKey="enrolled" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} />
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
