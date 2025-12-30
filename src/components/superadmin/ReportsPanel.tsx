'use client'

import { Download, FileText, PieChart, BarChart, Users, Building2, ShieldCheck, TrendingUp, FileDown, ArrowRight, Mail } from 'lucide-react'
import { generatePDFReport } from '@/lib/pdf-export'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { emailReport } from '@/app/reporting-actions'
import { toast } from 'sonner'
import { useState } from 'react'

interface ReportsPanelProps {
    users?: any[]
    campuses?: any[]
    admins?: any[]
    campusComparison?: any[]
    onDownloadReport: (reportFunction: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>) => Promise<void>
    generateLeadPipelineReport: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>
    onWeeklyReport?: () => Promise<void>
}

export function ReportsPanel({
    users = [],
    campuses = [],
    admins = [],
    campusComparison = [],
    onDownloadReport,
    generateLeadPipelineReport,
    onWeeklyReport
}: ReportsPanelProps) {
    const [emailingId, setEmailingId] = useState<string | null>(null)

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

    const handlePDFExport = (type: 'users' | 'campus' | 'admins') => {
        switch (type) {
            case 'users':
                generatePDFReport({
                    title: 'Users Report',
                    subtitle: `Total Users: ${users.length}`,
                    fileName: 'users_report',
                    columns: [
                        { header: 'Name', dataKey: 'fullName' },
                        { header: 'Mobile', dataKey: 'mobileNumber' },
                        { header: 'Role', dataKey: 'role' },
                        { header: 'Campus', dataKey: 'assignedCampus' },
                        { header: 'Status', dataKey: 'status' }
                    ],
                    data: users.map(u => ({ ...u, assignedCampus: u.assignedCampus || 'N/A' }))
                })
                break
            case 'campus':
                generatePDFReport({
                    title: 'Campus Performance Report',
                    subtitle: `Total Campuses: ${campusComparison.length}`,
                    fileName: 'campus_performance',
                    columns: [
                        { header: 'Campus', dataKey: 'campus' },
                        { header: 'Total Leads', dataKey: 'totalLeads' },
                        { header: 'Confirmed', dataKey: 'confirmed' },
                        { header: 'Pending', dataKey: 'pending' },
                        { header: 'Conversion %', dataKey: 'conversionRate' }
                    ],
                    data: campusComparison
                })
                break
            case 'admins':
                generatePDFReport({
                    title: 'Admin Directory',
                    subtitle: `Total Admins: ${admins.length}`,
                    fileName: 'admins_directory',
                    columns: [
                        { header: 'Name', dataKey: 'adminName' },
                        { header: 'Mobile', dataKey: 'adminMobile' },
                        { header: 'Role', dataKey: 'role' },
                        { header: 'Campus', dataKey: 'assignedCampus' },
                        { header: 'Status', dataKey: 'status' }
                    ],
                    data: admins.map(a => ({ ...a, assignedCampus: a.assignedCampus || 'N/A' }))
                })
                break
        }
    }

    const reportGroups = [
        {
            id: 'users',
            title: 'All Users Report',
            count: `${users.length} total users`,
            desc: 'Export all registered ambassadors, parents, and staff.',
            icon: Users,
            color: 'from-red-500 to-red-600',
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
            pdfType: 'users' as const,
            action: async () => {
                const headers = ['User ID', 'Full Name', 'Mobile', 'Role', 'Campus', 'Referrals', 'Status', 'Created']
                const rows = users.map(u => [u.userId, u.fullName, u.mobileNumber, u.role, u.assignedCampus || '-', u.referralCount, u.status, new Date(u.createdAt).toLocaleDateString()])
                return {
                    success: true,
                    csv: [headers.join(','), ...rows.map(r => r.join(','))].join('\n'),
                    filename: 'users_report.csv'
                }
            }
        },
        {
            id: 'campus',
            title: 'Campus Analytics',
            count: `${campuses.length} campuses`,
            desc: 'Detailed metrics for each campus and conversion rates.',
            icon: Building2,
            color: 'from-emerald-500 to-emerald-600',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            pdfType: 'campus' as const,
            action: async () => {
                const headers = ['Campus', 'Total Leads', 'Confirmed', 'Pending', 'Conversion Rate', 'Ambassadors']
                const rows = campusComparison.map(c => [c.campus, c.totalLeads, c.confirmed, c.pending, c.conversionRate + '%', c.ambassadors])
                return {
                    success: true,
                    csv: [headers.join(','), ...rows.map(r => r.join(','))].join('\n'),
                    filename: 'campus_performance.csv'
                }
            }
        },
        {
            id: 'admins',
            title: 'Admin Directory',
            count: `${admins.length} administrators`,
            desc: 'Full list of campus heads and admission admins.',
            icon: ShieldCheck,
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            pdfType: 'admins' as const,
            action: async () => {
                const headers = ['Admin ID', 'Name', 'Mobile', 'Role', 'Assigned Campus', 'Status']
                const rows = admins.map(a => [a.adminId, a.adminName, a.adminMobile, a.role, a.assignedCampus || '-', a.status])
                return {
                    success: true,
                    csv: [headers.join(','), ...rows.map(r => r.join(','))].join('\n'),
                    filename: 'admins_report.csv'
                }
            }
        },
        {
            id: 'pipeline',
            title: 'Full Pipeline',
            count: 'All lifecycle stages',
            desc: 'Export the entire lead lifecycle from start to finish.',
            icon: TrendingUp,
            color: 'from-amber-500 to-amber-600',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            action: generateLeadPipelineReport
        },
        {
            id: 'weekly-kpi',
            title: 'Weekly KPI Summary',
            count: 'Last 7 Days',
            desc: 'Consolidated performance report emailed to your address.',
            icon: BarChart,
            color: 'from-purple-500 to-purple-600',
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200',
            isSpecial: true,
            action: onWeeklyReport
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {reportGroups.map((group) => (
                <div key={group.id} className="group relative bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                    {/* Top Accent Gradient */}
                    <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${group.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${group.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <group.icon size={28} className="text-white" />
                            </div>
                            {/* Visual indicator for PDF availability */}
                            {'pdfType' in group && (
                                <div className="px-2 py-1 rounded bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                                    PDF + CSV
                                </div>
                            )}
                        </div>

                        <h3 className="text-lg font-black text-gray-900 mb-1 leading-tight">{group.title}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{group.count}</p>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{group.desc}</p>

                        <div className="grid grid-cols-2 gap-3 mt-auto">
                            <button
                                onClick={() => {
                                    if (group.id !== 'weekly-kpi') {
                                        onDownloadReport(group.action as any)
                                    }
                                }}
                                disabled={group.id === 'weekly-kpi'}
                                className="col-span-1 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                            >
                                <Download size={14} />
                                <span>CSV</span>
                            </button>

                            {'pdfType' in group && group.pdfType ? (
                                <>
                                    <button
                                        onClick={() => handlePDFExport(group.pdfType as any)}
                                        className={`col-span-1 px-4 py-2.5 rounded-xl ${group.bg} ${group.text} border ${group.border} hover:brightness-95 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md`}
                                    >
                                        <FileDown size={14} />
                                        <span>PDF</span>
                                    </button>
                                    <button
                                        onClick={() => handleEmailReport(group.id)}
                                        disabled={emailingId === group.id}
                                        className="col-span-2 mt-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {emailingId === group.id ? (
                                            <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                            <Mail size={14} />
                                        )}
                                        <span>{emailingId === group.id ? 'Sending...' : 'Email Me Report'}</span>
                                    </button>
                                </>
                            ) : 'isSpecial' in group && group.isSpecial ? (
                                <button
                                    onClick={group.action as any}
                                    className="col-span-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                                >
                                    <Mail size={14} />
                                    <span>Generate & Email Report</span>
                                </button>
                            ) : (
                                <div className="col-span-1" /> // Spacer if no PDF
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
