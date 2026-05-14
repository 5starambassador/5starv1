'use client'

import { useState } from 'react'
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
    Mail,
    Loader2,
    Activity,
    LayoutDashboard
} from 'lucide-react'
import { generatePDFReport } from '@/lib/pdf-export'
import { emailReport } from '@/app/reporting-actions'
import { DailyReferralDashboard } from '@/components/reports/DailyReferralDashboard'
import { DailyLeaderboardWarRoom } from '@/components/campus/DailyLeaderboardWarRoom'

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
    generateAuditTrailReport,
    generateSettlementIntegrityReport,
    generateMasterPipelineExport,
    generateMasterReferralReport,
    generateWhatsAppLogReport,
    generateAppReferralStatusReport,
    generateAmbassadorMasterRegistry,
    generateReferralStudentDetailsReport
} from '@/app/report-actions'

interface ReportsPanelProps {
    users?: any[]
    campuses?: any[]
    admins?: any[]
    campusComparison?: any[]
    onDownloadReport: (reportFunction: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>) => Promise<void>
    onWeeklyReport?: () => Promise<void>
    initialReportMode?: 'classic' | 'visual'
}

export function ReportsPanel({
    users = [],
    campuses = [],
    admins = [],
    campusComparison = [],
    onDownloadReport,
    onWeeklyReport,
}: ReportsPanelProps) {
    const [emailingId, setEmailingId] = useState<string | null>(null)
    const [isExportingId, setIsExportingId] = useState<string | null>(null)
    const [showVisualSummary, setShowVisualSummary] = useState(false)
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
    const [selectedCampus, setSelectedCampus] = useState<string>('All')
    const [academicYear, setAcademicYear] = useState<string>('All')
    const uniqueCampuses = Array.from(new Set(campuses.map(c => c.campusName || c.campus).filter(Boolean)))
    const academicYears = ['All', '2024-2025', '2025-2026', '2026-2027']

    const handleEmailReport = async (reportId: string) => {
        setEmailingId(reportId)
        try {
            const filters = {
                startDate: dateRange.start || undefined,
                endDate: dateRange.end || undefined,
                campus: selectedCampus !== 'All' ? selectedCampus : undefined,
                academicYear: academicYear
            }
            const res = await emailReport(reportId, filters)
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

    const handleDownload = async (groupId: string, action: any) => {
        if (isExportingId) return
        setIsExportingId(groupId)
        const filters = {
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined,
            campus: selectedCampus !== 'All' ? selectedCampus : undefined,
            academicYear: academicYear
        }
        try {
            await onDownloadReport(() => action(filters))
        } finally {
            setIsExportingId(null)
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
            id: 'app-referral-status',
            title: 'APP User Status',
            count: 'University Summary',
            desc: 'Campus-wise registration audit for Staff and Parents with potential referral tracking.',
            icon: Activity,
            color: 'from-blue-600 to-blue-700',
            bg: 'bg-blue-50',
            text: 'text-blue-800',
            border: 'border-blue-200',
            action: generateAppReferralStatusReport,
            canEmail: true
        },
        {
            id: 'ambassador-registry',
            title: 'Ambassador Master Registry',
            count: 'Detailed User Status',
            desc: 'Individual line-by-line status of all registered ambassadors with contact details.',
            icon: Users,
            color: 'from-indigo-600 to-indigo-700',
            bg: 'bg-indigo-50',
            text: 'text-indigo-800',
            border: 'border-indigo-200',
            action: generateAmbassadorMasterRegistry,
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
        },
        {
            id: 'audit-trail',
            title: 'System Audit Trail',
            count: 'Admin accountability',
            desc: 'Chronological log of critical system actions and permission changes.',
            icon: ShieldCheck,
            color: 'from-slate-500 to-slate-600',
            bg: 'bg-slate-50',
            text: 'text-slate-700',
            border: 'border-slate-200',
            action: generateAuditTrailReport,
            canEmail: false
        },
        {
            id: 'integrity-audit',
            title: 'Settlement Integrity',
            count: 'Payment vs Admissions',
            desc: 'Audit report to verify lead confirmation vs successful settlements.',
            icon: Activity,
            color: 'from-pink-500 to-pink-600',
            bg: 'bg-pink-50',
            text: 'text-pink-700',
            border: 'border-pink-200',
            action: generateSettlementIntegrityReport,
            canEmail: true
        },
        {
            id: 'master-pipeline',
            title: 'Master Pipeline',
            count: 'Full History Export',
            desc: 'Detailed CSV of every lead in the system with all status and referral data.',
            icon: FileDown,
            color: 'from-gray-700 to-gray-800',
            bg: 'bg-gray-50',
            text: 'text-gray-900',
            border: 'border-gray-200',
            action: generateMasterPipelineExport,
            canEmail: true
        },
        {
            id: 'master-referral',
            title: 'Master Referral Report',
            count: 'Detailed Audit Export',
            desc: 'Combined report of Ambassador details joined with all their Referral Leads.',
            icon: Users,
            color: 'from-blue-700 to-blue-800',
            bg: 'bg-blue-50',
            text: 'text-blue-900',
            border: 'border-blue-200',
            action: generateMasterReferralReport,
            canEmail: true
        },
        {
            id: 'whatsapp-log',
            title: 'WhatsApp Activity Log',
            count: 'Full Message History',
            desc: 'Complete log of all WhatsApp messages sent — including template, status, delivery, and reference IDs.',
            icon: Mail,
            color: 'from-green-600 to-green-700',
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200',
            action: generateWhatsAppLogReport,
            canEmail: true
        },
        {
            id: 'referral-student-details',
            title: 'Referral Student Details',
            count: 'Share breakdown Export',
            desc: 'Complete report of Student admissions with Ambassador details and financial share calculations.',
            icon: FileText,
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            action: generateReferralStudentDetailsReport,
            canEmail: true
        }
    ]

    return (
        <div className="space-y-6 animate-fade-in pb-4">
            {/* Header & Mode Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <FileDown className="text-blue-600" size={32} />
                        Export & Historical Center
                    </h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">Download raw data and administrative audit logs.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => setShowVisualSummary(!showVisualSummary)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${showVisualSummary ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        <LayoutDashboard size={14} />
                        {showVisualSummary ? 'Switch to Export List' : 'Daily Achievement Summary'}
                    </button>

                    <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2">
                        <div className="px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
                            <label htmlFor="report-start-date" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Analysis Period</label>
                            <div className="flex items-center gap-2 mt-0.5">
                                <input
                                    id="report-start-date"
                                    type="date"
                                    className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none w-24"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    suppressHydrationWarning
                                />
                                <span className="text-gray-300">-</span>
                                <label htmlFor="report-end-date" className="sr-only">End Date</label>
                                <input
                                    id="report-end-date"
                                    type="date"
                                    className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none w-24"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center">
                        <div className="px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
                            <label htmlFor="report-campus-select" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Campus View</label>
                            <select
                                id="report-campus-select"
                                className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none mt-0.5 min-w-[140px] cursor-pointer"
                                value={selectedCampus}
                                onChange={(e) => setSelectedCampus(e.target.value)}
                                suppressHydrationWarning
                            >
                                <option value="All">All Campuses</option>
                                {uniqueCampuses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center">
                        <div className="px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
                            <label htmlFor="report-year-select" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Academic Year</label>
                            <select
                                id="report-year-select"
                                className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none mt-0.5 min-w-[100px] cursor-pointer"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                suppressHydrationWarning
                            >
                                {academicYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {showVisualSummary ? (


                <DailyReferralDashboard 
                    globalDateRange={dateRange} 
                    globalCampus={selectedCampus} 
                    globalAcademicYear={academicYear} 
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {reportGroups.map((group) => (
                        <div key={group.id} className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all duration-300 overflow-hidden flex flex-col h-full">
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-xl ${group.bg} flex items-center justify-center`}>
                                        <group.icon size={24} className={group.text} />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{group.title}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{group.count}</p>
                                <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{group.desc}</p>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button
                                        onClick={() => handleDownload(group.id, group.action)}
                                        disabled={!!isExportingId}
                                        suppressHydrationWarning
                                        aria-label={`Download ${group.title} as CSV`}
                                        className="col-span-1 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                                    >
                                        {isExportingId === group.id ? (
                                            <Loader2 size={14} className="animate-spin text-blue-600" />
                                        ) : (
                                            <Download size={14} />
                                        )}
                                        <span>{isExportingId === group.id ? 'Loading...' : 'CSV'}</span>
                                    </button>

                                    <button
                                        onClick={() => handleEmailReport(group.id)}
                                        disabled={emailingId === group.id}
                                        suppressHydrationWarning
                                        aria-label={`Email ${group.title} Report`}
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
            )}
        </div>
    )
}
