'use client'

import { Download, FileText, PieChart, BarChart, Users, Building2, ShieldCheck, TrendingUp, FileDown } from 'lucide-react'
import { generatePDFReport } from '@/lib/pdf-export'

interface ReportsPanelProps {
    users?: any[]
    campuses?: any[]
    admins?: any[]
    campusComparison?: any[]
    onDownloadReport: (reportFunction: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>) => Promise<void>
    generateLeadPipelineReport: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>
}

export function ReportsPanel({
    users = [],
    campuses = [],
    admins = [],
    campusComparison = [],
    onDownloadReport,
    generateLeadPipelineReport
}: ReportsPanelProps) {

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
            desc: 'Export all registered ambassadors, parents, and staff with full details.',
            icon: Users,
            color: 'from-red-500 to-red-700',
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
            desc: 'Detailed metrics for each campus including conversion rates and enrollments.',
            icon: Building2,
            color: 'from-emerald-500 to-emerald-700',
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
            desc: 'Full list of campus heads and admission admins with assigned locations.',
            icon: ShieldCheck,
            color: 'from-blue-500 to-blue-700',
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
            desc: 'Export the entire lead lifecycle from initial referral to final admission.',
            icon: TrendingUp,
            color: 'from-amber-500 to-amber-700',
            action: generateLeadPipelineReport
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {reportGroups.map((group) => (
                <div key={group.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center shadow-lg`}>
                                <group.icon size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{group.title}</h3>
                                <p className="text-xs text-gray-500">{group.count}</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{group.desc}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onDownloadReport(group.action)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200"
                        >
                            <Download size={16} /> CSV
                        </button>
                        {'pdfType' in group && group.pdfType && (
                            <button
                                onClick={() => handlePDFExport(group.pdfType)}
                                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                            >
                                <FileDown size={16} /> PDF
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

