'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Users, TrendingUp, Award, BarChart3, IndianRupee, CheckCircle, RefreshCw, Trophy, Building2, BookOpen, Shield, GraduationCap, Phone, Mail, Clock, Plus, Filter, Search, X, Pencil } from 'lucide-react'
import { ReferralTable } from './referral-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PremiumHeader } from '@/components/premium/PremiumHeader'
import { PremiumStatCard } from '@/components/premium/PremiumStatCard'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { ReportsPanel } from '@/components/superadmin/ReportsPanel'
import {
    generateLeadPipelineReport,
    generateReferralPerformanceReport,
    generateMonthlyTrendsReport,
    generateCampusDistributionReport
} from '@/app/report-actions'
import { addStudent, updateStudent } from '@/app/student-actions'
import { User, Student, ReferralLead, RolePermissions, SystemAnalytics, CampusPerformance, Admin, Campus } from '@/types'

// Local type for AdminAnalytics to fix import error
type AdminAnalytics = SystemAnalytics

interface AdminClientProps {
    referrals: ReferralLead[]
    analytics: AdminAnalytics
    confirmReferral: (leadId: number) => Promise<{ success: boolean; error?: string }>
    initialView?: string
    campuses?: Campus[]
    users?: User[]
    students?: Student[]
    admins?: Admin[]
    campusPerformance?: CampusPerformance[]
    permissions?: RolePermissions
}

export function AdminClient({ referrals, analytics, confirmReferral, initialView = 'analytics', campuses = [], users = [], students = [], admins = [], campusPerformance = [], permissions }: AdminClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [statusFilter, setStatusFilter] = useState<string>('All')

    // Filters for Admins View
    const [adminSearch, setAdminSearch] = useState('')
    const [adminRoleFilter, setAdminRoleFilter] = useState('All')

    // Filters for Users View
    const [filterRole, setFilterRole] = useState('All')
    const [filterCampus, setFilterCampus] = useState('All')
    const [filterStatus, setFilterStatus] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')

    // Filters for Students View
    const [studentSearch, setStudentSearch] = useState('')
    const [studentCampusFilter, setStudentCampusFilter] = useState('All')
    const [studentGradeFilter, setStudentGradeFilter] = useState('All')

    // Student Modal State (Added)
    const [showStudentModal, setShowStudentModal] = useState(false)
    const [studentForm, setStudentForm] = useState<any>({
        fullName: '',
        parentId: '',
        campusId: '',
        grade: '',
        section: '',
        rollNumber: '',
        baseFee: undefined,
        discountPercent: 0,
        isNewParent: false,
        newParentName: '',
        newParentMobile: ''
    })
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)

    // Handlers (Added)
    const handleAddStudent = async () => {
        setModalLoading(true)
        try {
            if (editingStudent) {
                const res = await updateStudent(editingStudent.studentId, studentForm)
                if (res.success) {
                    toast.success('Student updated successfully')
                    setShowStudentModal(false)
                    router.refresh()
                } else {
                    toast.error(res.error || 'Update failed')
                }
            } else {
                const res = await addStudent(studentForm)
                if (res.success) {
                    toast.success('Student added successfully')
                    setShowStudentModal(false)
                    router.refresh()
                } else {
                    toast.error(res.error || 'Addition failed')
                }
            }
        } catch (e) { toast.error('An error occurred') }
        finally { setModalLoading(false) }
    }

    // View state
    const [selectedView, setSelectedView] = useState<string>(initialView)

    // Sync state with URL
    useEffect(() => {
        const view = searchParams.get('view') || 'home'
        setSelectedView(view)
    }, [searchParams])

    const handleCardClick = (filter: string) => {
        setStatusFilter(filter)
    }

    const getTitle = () => {
        switch (selectedView) {
            case 'campuses': return 'Campus Management';
            case 'users': return 'User Directory';
            case 'admins': return 'Admin Management';
            case 'students': return 'Student Management';
            case 'home': return 'Dashboard';
            case 'reports': return 'Detailed Reports';
            default: return 'Analytics Overview';
        }
    }

    const getSubtitle = () => {
        switch (selectedView) {
            case 'campuses': return 'View and manage campus details';
            case 'users': return 'View all system users';
            case 'admins': return 'Manage system administrators';
            case 'students': return 'View registered students';
            case 'home': return 'Quick overview and actions';
            case 'reports': return 'Generate and download data exports';
            default: return 'Operational insights and lead conversion';
        }
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* Premium Header */}
            <PremiumHeader
                title={getTitle()}
                subtitle={getSubtitle()}
                icon={BarChart3}
            >
                <button
                    onClick={() => router.refresh()}
                    className="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-all shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </PremiumHeader>

            {/* CONTENT VIEWS */}

            {/* HOME VIEW - Action Focused */}
            {selectedView === 'home' && (
                <div className="space-y-8">
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <PremiumStatCard
                            title="Total Leads"
                            value={analytics?.totalLeads || 0}
                            icon={<Users size={24} />}
                            gradient="linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)"
                        />
                        <PremiumStatCard
                            title="Confirmed"
                            value={analytics?.confirmedLeads || 0}
                            icon={<CheckCircle size={24} />}
                            gradient="linear-gradient(135deg, #10B981 0%, #047857 100%)"
                        />
                        <PremiumStatCard
                            title="Pending"
                            value={analytics?.pendingLeads || 0}
                            icon={<Clock size={24} />}
                            gradient="linear-gradient(135deg, #F59E0B 0%, #B45309 100%)"
                        />
                        <PremiumStatCard
                            title="Conversion"
                            value={`${analytics?.conversionRate || 0}%`}
                            icon={<TrendingUp size={24} />}
                            gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)"
                        />
                    </div>

                    {/* Quick Actions */}
                    <PremiumCard>
                        <div className="p-8 border-b border-gray-100 mb-8">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Quick Actions</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(permissions?.campusPerformance?.access) && (
                                <button
                                    onClick={() => router.push('/admin?view=campuses')}
                                    className="flex flex-col items-center gap-3 p-6 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-red-500/10 border border-gray-100 hover:border-red-100 rounded-2xl transition-all group"
                                >
                                    <div className="p-3 bg-red-50 rounded-xl group-hover:scale-110 transition-transform">
                                        <Building2 size={24} className="text-red-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Campuses</span>
                                </button>
                            )}
                            {(permissions?.userManagement?.access) && (
                                <button
                                    onClick={() => router.push('/admin?view=users')}
                                    className="flex flex-col items-center gap-3 p-6 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 border border-gray-100 hover:border-blue-100 rounded-2xl transition-all group"
                                >
                                    <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                                        <Users size={24} className="text-blue-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Users</span>
                                </button>
                            )}
                            {(permissions?.studentManagement?.access) && (
                                <button
                                    onClick={() => router.push('/admin?view=students')}
                                    className="flex flex-col items-center gap-3 p-6 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-green-500/10 border border-gray-100 hover:border-green-100 rounded-2xl transition-all group"
                                >
                                    <div className="p-3 bg-green-50 rounded-xl group-hover:scale-110 transition-transform">
                                        <BookOpen size={24} className="text-green-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Students</span>
                                </button>
                            )}
                            {(permissions?.analytics?.access) && (
                                <button
                                    onClick={() => router.push('/admin?view=analytics')}
                                    className="flex flex-col items-center gap-3 p-6 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-purple-500/10 border border-gray-100 hover:border-purple-100 rounded-2xl transition-all group"
                                >
                                    <div className="p-3 bg-purple-50 rounded-xl group-hover:scale-110 transition-transform">
                                        <BarChart3 size={24} className="text-purple-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Full Analytics</span>
                                </button>
                            )}
                        </div>
                    </PremiumCard>

                    {/* Top Performers & Role Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PremiumCard>
                            <div className="p-6 border-b border-gray-100 mb-6">
                                <div className="flex items-center gap-3">
                                    <Trophy className="text-amber-500" size={24} />
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Top Performers</h2>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {(analytics?.topPerformers || []).slice(0, 5).map((performer: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 rounded-2xl transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                            <div>
                                                <span className="text-sm font-bold text-gray-800 block">{performer.name}</span>
                                                <p className="text-xs text-gray-500 font-medium">{performer.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-green-600">{performer.count}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">leads</p>
                                        </div>
                                    </div>
                                ))}
                                {(!analytics?.topPerformers || analytics.topPerformers.length === 0) && (
                                    <p className="text-center text-gray-400 text-sm py-4">No data available</p>
                                )}
                            </div>
                        </PremiumCard>

                        <PremiumCard>
                            <h2 className="text-xl font-black mb-6 text-gray-900 tracking-tight flex items-center gap-3">
                                <Users className="text-blue-500" size={24} />
                                Role Distribution
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                                    <span className="text-sm font-bold text-gray-700">Parents</span>
                                    <span className="text-xl font-black text-red-600">{analytics?.roleBreakdown?.parent?.count || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-green-50/50 border border-green-100 rounded-2xl">
                                    <span className="text-sm font-bold text-gray-700">Staff</span>
                                    <span className="text-xl font-black text-green-600">{analytics?.roleBreakdown?.staff?.count || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                                    <span className="text-sm font-bold text-gray-700">Total Ambassadors</span>
                                    <span className="text-xl font-black text-blue-600">{analytics?.totalAmbassadors || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                                    <span className="text-sm font-bold text-gray-700">Est. Value</span>
                                    <span className="text-xl font-black text-purple-600">₹{(analytics?.totalEstimatedValue || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </PremiumCard>
                    </div>
                </div>
            )}

            {/* CAMPUSES VIEW */}
            {selectedView === 'campuses' && permissions?.campusPerformance?.access && (
                <div className="space-y-6">
                    {/* Summary Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
                            <p className="text-3xl font-black text-red-600">{campusPerformance.length}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Total Campuses</p>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
                            <p className="text-3xl font-black text-amber-500">{campusPerformance.reduce((sum, c) => sum + c.totalLeads, 0)}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Total Leads</p>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
                            <p className="text-3xl font-black text-green-500">{campusPerformance.reduce((sum, c) => sum + c.confirmed, 0)}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Confirmed</p>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
                            <p className="text-3xl font-black text-purple-500">
                                {(campusPerformance.reduce((sum, c) => sum + c.totalLeads, 0) > 0
                                    ? ((campusPerformance.reduce((sum, c) => sum + c.confirmed, 0) / campusPerformance.reduce((sum, c) => sum + c.totalLeads, 0)) * 100).toFixed(1)
                                    : '0')}%
                            </p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Avg Conversion</p>
                        </div>
                    </div>

                    {/* Lead Distribution Chart */}
                    <PremiumCard>
                        <h2 className="text-xl font-black mb-6 text-gray-900 tracking-tight">Lead Distribution by Campus</h2>
                        <div className="space-y-4">
                            {campusPerformance.map((campus) => {
                                const maxLeads = Math.max(...campusPerformance.map(c => c.totalLeads))
                                const widthPercent = maxLeads > 0 ? (campus.totalLeads / maxLeads) * 100 : 0

                                return (
                                    <div key={campus.campus} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-700">{campus.campus}</span>
                                            <span className="text-gray-500 font-medium">{campus.totalLeads} leads</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                                                style={{ width: `${widthPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </PremiumCard>

                    {/* Desktop Table */}
                    <PremiumCard noPadding>
                        <div className="p-8 border-b border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1.5">Campus Performance Details</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Campus</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Total Leads</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Confirmed</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Pending</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Conversion</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Ambassadors</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {campusPerformance.map((campus) => (
                                        <tr key={campus.campus} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{campus.campus}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-gray-600">{campus.totalLeads}</td>
                                            <td className="px-6 py-4 text-center font-bold text-green-600">{campus.confirmed}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-amber-600">{campus.pending}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${campus.conversionRate >= 80 ? 'bg-green-100 text-green-700' : campus.conversionRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {campus.conversionRate}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-gray-500">{campus.ambassadors}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </PremiumCard>
                </div>
            )}

            {/* ANALYTICS VIEW (Default) */}
            {(selectedView === 'analytics' || !selectedView) && permissions?.analytics?.access && (
                <div className="space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PremiumStatCard
                            title="Total Leads"
                            value={analytics?.totalLeads || 0}
                            icon={<Users size={24} />}
                            gradient="linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)"
                            subtext={`${analytics?.conversionRate || 0}% Conversion`}
                        />
                        <PremiumStatCard
                            title="Confirmed"
                            value={analytics?.confirmedLeads || 0}
                            icon={<CheckCircle size={24} />}
                            gradient="linear-gradient(135deg, #10B981 0%, #047857 100%)"
                            subtext="Verified Enrollments"
                        />
                        <PremiumStatCard
                            title="Est. Value"
                            value={`₹${(analytics?.totalEstimatedValue || 0).toLocaleString('en-IN')}`}
                            icon={<IndianRupee size={24} />}
                            gradient="linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)"
                            subtext="Incentive Value"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PremiumCard>
                            <h2 className="text-xl font-black mb-6 text-gray-900 tracking-tight flex items-center gap-3">
                                <BarChart3 className="text-red-600" size={24} />
                                Role Distribution
                            </h2>
                            <div className="space-y-6 py-4">
                                <div>
                                    <div className="flex justify-between mb-2 text-sm font-bold">
                                        <span className="text-gray-700">Parents</span>
                                        <span className="text-red-600">{analytics?.roleBreakdown?.parent?.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3">
                                        <div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `${analytics?.roleBreakdown?.parent?.percentage}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2 text-sm font-bold">
                                        <span className="text-gray-700">Staff</span>
                                        <span className="text-green-600">{analytics?.roleBreakdown?.staff?.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3">
                                        <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${analytics?.roleBreakdown?.staff?.percentage}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </PremiumCard>

                        <PremiumCard>
                            <h2 className="text-xl font-black mb-6 text-gray-900 tracking-tight flex items-center gap-3">
                                <Trophy className="text-amber-500" size={24} />
                                Top Performers
                            </h2>
                            <div className="space-y-3">
                                {analytics.topPerformers.map((performer, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${idx === 0 ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border-transparent border'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-200 text-amber-800' : 'bg-white text-gray-500 shadow-sm'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{performer.name}</p>
                                                <p className="text-xs text-gray-500 font-medium">{performer.role} • {performer.referralCode}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-red-600">{performer.count}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">leads</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PremiumCard>
                    </div>

                    <ReferralTable
                        referrals={referrals}
                        confirmReferral={confirmReferral}
                        initialStatusFilter={statusFilter}
                        isReadOnly={permissions?.referralTracking?.scope === 'view-only'}
                    />
                </div>
            )}

            {/* USERS VIEW */}
            {selectedView === 'users' && permissions?.userManagement?.access && (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{users.length}</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Users</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{users.filter(u => u.role === 'Staff').length}</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Members</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Award size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{users.filter(u => u.role === 'Parent').length}</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parents</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            />
                        </div>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-700"
                        >
                            <option value="All">All Roles</option>
                            <option value="Parent">Parent</option>
                            <option value="Staff">Staff</option>
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-700"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    {/* Table */}
                    <PremiumCard noPadding>
                        <div className="p-8 border-b border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1.5">User Directory</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Campus</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Referrals</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users
                                        .filter((user) => {
                                            const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                user.mobileNumber.includes(searchQuery)
                                            const matchesRole = filterRole === 'All' || user.role === filterRole
                                            const matchesStatus = filterStatus === 'All' || user.status === filterStatus
                                            return matchesSearch && matchesRole && matchesStatus
                                        })
                                        .map((user) => (
                                            <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-800">{user.fullName}</td>
                                                <td className="px-6 py-4 font-medium text-gray-600">{user.mobileNumber}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.role === 'Staff' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-600">{user.assignedCampus || '-'}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-800">{user.confirmedReferralCount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </PremiumCard>
                </div>
            )}

            {/* ADMINS VIEW (Newly Added) */}
            {selectedView === 'admins' && permissions?.adminManagement?.access && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search admins..."
                                value={adminSearch}
                                onChange={(e) => setAdminSearch(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <PremiumCard noPadding>
                        <div className="p-8 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                    <Shield size={20} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">System Administrators</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Campus</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {admins
                                        .filter(admin => admin.adminName.toLowerCase().includes(adminSearch.toLowerCase()))
                                        .map((admin, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-800">{admin.adminName}</td>
                                                <td className="px-6 py-4 font-medium text-gray-600">{admin.adminMobile}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                        {admin.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-600">{admin.assignedCampus || 'All Campuses'}</td>
                                                <td className="px-6 py-4 text-center text-gray-500 text-sm">
                                                    {new Date().toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </PremiumCard>
                </div>
            )}

            {/* STUDENTS VIEW (Newly Added) */}
            {selectedView === 'students' && permissions?.studentManagement?.access && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <PremiumCard noPadding>
                        <div className="p-8 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                    <GraduationCap size={20} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Registered Students</h2>
                            </div>
                            {/* Add Student Button (Conditional) */}
                            {permissions?.studentManagement?.canCreate && (
                                <button
                                    onClick={() => {
                                        setEditingStudent(null)
                                        setStudentForm({
                                            fullName: '', parentId: '', campusId: '', grade: '', section: '',
                                            rollNumber: '', baseFee: undefined, discountPercent: 0,
                                            isNewParent: false, newParentName: '', newParentMobile: ''
                                        })
                                        setShowStudentModal(true)
                                    }}
                                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                                >
                                    <GraduationCap size={16} /> New Student
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Grade</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Campus</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Parent Info</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {students
                                        .filter(student => student.fullName.toLowerCase().includes(studentSearch.toLowerCase()))
                                        .map((student) => (
                                            <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-800">{student.fullName}</td>
                                                <td className="px-6 py-4 text-gray-600 font-medium">{student.grade}</td>
                                                <td className="px-6 py-4 text-gray-600 font-medium">{student.campus?.campusName || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col text-sm">
                                                        <span className="font-bold text-gray-700">{student.parent?.fullName || 'N/A'}</span>
                                                        <span className="text-gray-500 text-xs">{student.parent?.mobileNumber || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                        Active
                                                    </span>
                                                </td>
                                                {/* Edit Action (Conditional) */}
                                                {permissions?.studentManagement?.canEdit && (
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setEditingStudent(student)
                                                                setStudentForm({
                                                                    fullName: student.fullName,
                                                                    parentId: student.parentId,
                                                                    campusId: student.campusId,
                                                                    grade: student.grade,
                                                                    section: student.section,
                                                                    rollNumber: student.rollNumber,
                                                                    baseFee: student.baseFee,
                                                                    discountPercent: student.discountPercent || 0
                                                                })
                                                                setShowStudentModal(true)
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </PremiumCard>
                </div>
            )}

            {/* REPORTS VIEW */}
            {
                selectedView === 'reports' && permissions?.reports?.access && (
                    <ReportsPanel
                        users={users}
                        campuses={campuses}
                        admins={admins}
                        campusComparison={campusPerformance}
                        onDownloadReport={async (fn) => {
                            const res = await fn()
                            if (res.success && res.csv) {
                                const blob = new Blob([res.csv], { type: 'text/csv' })
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = res.filename || 'report.csv'
                                a.click()
                            } else {
                                toast.error(res.error || 'Failed to download report')
                            }
                        }}
                    />
                )
            }

            {/* Student Modal */}
            {
                showStudentModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                        {editingStudent ? 'Edit Student Details' : 'Register New Student'}
                                    </h3>
                                    <p className="text-sm font-medium text-gray-400 mt-1">
                                        {editingStudent ? 'Update academic or personal information' : 'Add a new student to the master database'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">Student Name *</label>
                                        <input
                                            type="text"
                                            value={studentForm.fullName}
                                            onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400 transition-all"
                                            placeholder="First & Last Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">Roll Number</label>
                                        <input
                                            type="text"
                                            value={studentForm.rollNumber}
                                            onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400 transition-all"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>

                                {/* Academic Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">Campus *</label>
                                        <select
                                            value={studentForm.campusId}
                                            onChange={(e) => setStudentForm({ ...studentForm, campusId: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 cursor-pointer transition-all appearance-none"
                                            disabled={!!editingStudent} // Often locked on edit, but consistent with SuperAdmin
                                        >
                                            <option value="">Select Campus</option>
                                            {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">Grade *</label>
                                        <select
                                            value={studentForm.grade}
                                            onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 cursor-pointer transition-all appearance-none"
                                        >
                                            <option value="">Select</option>
                                            {['Pre-KG', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Parent Selection (Simplified for now - strictly existing parents or new) */}
                                {!editingStudent && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setStudentForm({ ...studentForm, isNewParent: false })}
                                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${!studentForm.isNewParent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                            >
                                                Existing Parent
                                            </button>
                                            <button
                                                onClick={() => setStudentForm({ ...studentForm, isNewParent: true })}
                                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${studentForm.isNewParent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                            >
                                                New Parent
                                            </button>
                                        </div>

                                        {studentForm.isNewParent ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                                <input
                                                    type="text"
                                                    placeholder="Parent Full Name"
                                                    value={studentForm.newParentName}
                                                    onChange={(e) => setStudentForm({ ...studentForm, newParentName: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 transition-all"
                                                />
                                                <input
                                                    type="tel"
                                                    placeholder="Mobile Number"
                                                    value={studentForm.newParentMobile}
                                                    onChange={(e) => setStudentForm({ ...studentForm, newParentMobile: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 transition-all"
                                                />
                                            </div>
                                        ) : (
                                            <select
                                                value={studentForm.parentId}
                                                onChange={(e) => setStudentForm({ ...studentForm, parentId: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 cursor-pointer transition-all appearance-none"
                                            >
                                                <option value="">Select Existing Parent</option>
                                                {users.filter(u => u.role === 'Parent').map(u => (
                                                    <option key={u.userId} value={u.userId}>{u.fullName} ({u.mobileNumber})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white">
                                    <button
                                        onClick={() => setShowStudentModal(false)}
                                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddStudent}
                                        disabled={modalLoading}
                                        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-red-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                    >
                                        {modalLoading ? <Clock className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                        {editingStudent ? 'Save Changes' : 'Register Student'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
