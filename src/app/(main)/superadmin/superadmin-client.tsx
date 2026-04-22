'use client'

import { AcademicYearFilter } from '@/components/AcademicYearFilter'
import { StudentSourceFilter } from '@/components/StudentSourceFilter'

import { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
    LayoutDashboard, Users, UserCheck, GraduationCap, Building2, 
    Shield, Settings, GitFork, Megaphone, IndianRupee, Zap, 
    BarChart3, LifeBuoy, FileSearch, HelpCircle, GraduationCap as GraduationIcon,
    Plus, Calculator, ExternalLink, MousePointerClick, Table as TableIcon,
    AlertCircle, Search, Filter, Download, MessageSquare, Briefcase,
    Calendar, CheckCircle, ChevronRight, MoreVertical, Trash2, Edit2 as Edit, 
    ShieldAlert, Target, TrendingUp, TrendingDown, RefreshCw, Loader2, Save
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// Import only what's needed for client-managed state
import { getCampuses } from '@/app/campus-actions'
import { getBenefitSlabs, updateBenefitSlab, addBenefitSlab, deleteBenefitSlab } from '@/app/benefit-actions'
import { getAllProgramLeads } from '@/app/superadmin-actions'
const PermissionsMatrix = dynamic(() => import('@/components/superadmin/PermissionsMatrix').then(m => m.PermissionsMatrix), { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-gray-100 rounded-lg" /> })
const BenefitSlabTable = dynamic(() => import('@/components/superadmin/BenefitSlabTable').then(m => m.BenefitSlabTable), { ssr: false })
const FeeManagementTable = dynamic(() => import('@/components/superadmin/FeeManagementTable').then(m => m.FeeManagementTable), { ssr: false })
const EngagementPanel = dynamic(() => import('@/components/superadmin/EngagementPanel').then(m => m.EngagementPanel), { ssr: false })
const AuditLogPanel = dynamic(() => import('@/components/superadmin/AuditLogPanel').then(m => m.AuditLogPanel), { ssr: false })
const SettingsPanel = dynamic(() => import('@/components/superadmin/SettingsPanel').then(m => m.SettingsPanel), { ssr: false })
const SettlementTable = dynamic(() => import('@/components/superadmin/SettlementTable').then(m => m.SettlementTable), { ssr: false })
const SettlementCalculatorModal = dynamic(() => import('@/components/superadmin/SettlementCalculatorModal').then(m => m.SettlementCalculatorModal), { ssr: false })
const AdminPanel = dynamic(() => import('@/components/superadmin/AdminPanel').then(m => m.AdminPanel), { ssr: false })
const ProgramLeadsTable = dynamic(() => import('@/components/superadmin/ProgramLeadsTable').then(m => m.ProgramLeadsTable), { ssr: false })
const ProgramManager = dynamic(() => import('@/components/superadmin/ProgramManager').then(m => m.ProgramManager), { ssr: false })
const MarketingManager = dynamic(() => import('@/components/MarketingManager').then(m => m.MarketingManager), { ssr: false })
const AnalyticsDashboard = dynamic(() => import('@/components/superadmin/AnalyticsDashboard').then(m => m.AnalyticsDashboard), { ssr: false })
const AutomationInsights = dynamic(() => import('@/components/superadmin/AutomationInsights'), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white rounded-3xl" /> })
const ReportsPanel = dynamic(() => import('@/components/superadmin/ReportsPanel').then(m => m.ReportsPanel), { ssr: false })
const CSVUploader = dynamic(() => import('@/components/CSVUploader').then(m => m.default), { ssr: false })
const WhatsAppConfigPanel = dynamic(() => import('@/components/superadmin/WhatsAppConfigPanel'), { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-white rounded-3xl" /> })

import { getWhatsAppAnalytics, WhatsAppAnalytics } from '@/app/automation-actions'
import { DailyLeaderboardWarRoom } from '@/components/campus/DailyLeaderboardWarRoom'


import { getSettlements, processSettlement, deleteSettlement } from '@/app/settlement-actions'
import { getRolePermissions, updateRolePermissions, resetRolePermissions } from '@/app/permission-actions'
import { confirmReferral, convertLeadToStudent, rejectReferral, syncLegacyConfirmedLeads } from '@/app/admin-actions'
import { Modal } from '@/components/ui/Modal'

import { User, Student, SystemAnalytics, CampusPerformance, Admin, SystemSettings, MarketingAsset, Campus, BenefitSlab, RolePermissions } from '@/types'

// ... existing imports

type ViewType = 'home' | 'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash' | 'referrals' | 'fees' | 'engagement' | 'programs' | 'program-leads' | 'automation';

// ... in SuperadminClient

const mapViewParam = (view: string): ViewType => {
    const validViews = ['home', 'analytics', 'admins', 'settings', 'reports', 'settlements', 'marketing', 'audit', 'support', 'permissions', 'staff-dash', 'parent-dash', 'fees', 'engagement', 'programs', 'program-leads']
    return validViews.includes(view) ? (view as ViewType) : 'home'
}

// ... inside return (render logic)



interface Props {
    analytics: SystemAnalytics
    campusComparison: CampusPerformance[]
    users: User[]
    admins: Admin[]
    students: Student[]
    currentUser: User | Admin
    initialView?: string
    marketingAssets?: MarketingAsset[]
    growthTrend: { date: string; users: number }[]
    deepTrends?: any
    urgentTicketCount?: number
    referrals?: any[]
    referralMeta?: any
    campuses?: Campus[]
    initialReportMode?: 'classic' | 'visual'
    permissions?: RolePermissions
}

export default function SuperadminClient({ analytics, campusComparison = [], users = [], admins = [], students = [], initialView = 'analytics', marketingAssets = [],
    currentUser,
    growthTrend = [],
    deepTrends = null,
    urgentTicketCount = 0,
    referrals = [],
    referralMeta,
    campuses: initialCampuses = [],
    initialReportMode = 'classic',
    permissions
}: Props) {
    const searchParams = useSearchParams()
    const router = useRouter()

    console.log('DEBUG: SuperadminClient Rendered')
    console.log(`DEBUG: Referrals Prop Length: ${referrals?.length || 0}`)
    if (referrals && referrals.length > 0) {
        console.log('DEBUG: First Referral:', JSON.stringify(referrals[0].user || {}, null, 2))
    }

    // Core State
    const [loading, setLoading] = useState(true)
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [uploadType, setUploadType] = useState<'students' | 'users' | 'fees' | 'campuses' | 'referrals' | 'crm-leads'>('referrals')

    // View State
    const mapViewParam = (view: string | null): ViewType => {
        const validViews = ['home', 'analytics', 'admins', 'settings', 'reports', 'settlements', 'marketing', 'audit', 'support', 'permissions', 'staff-dash', 'parent-dash', 'fees', 'engagement', 'programs', 'program-leads', 'automation']
        return validViews.includes(view || '') ? (view as ViewType) : 'home'
    }
    const [selectedView, setSelectedView] = useState<ViewType>(mapViewParam(initialView))
    const [activePermissionTab, setActivePermissionTab] = useState<'matrix' | 'automation'>('matrix')

    useEffect(() => {
        const viewParam = searchParams.get('view') || 'home'
        setSelectedView(mapViewParam(viewParam))
    }, [searchParams])

    // Data State (Fetched on mount)
    const [campuses, setCampuses] = useState<Campus[]>(initialCampuses) // Fetch for dropdowns in other panels
    const [slabs, setSlabs] = useState<BenefitSlab[]>([])
    const [settlements, setSettlements] = useState<any[]>([]) // Placeholder
    const [programLeads, setProgramLeads] = useState<any[]>([])

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(analytics)
    const [trendData, setTrendData] = useState(growthTrend)
    const [campusCompData, setCampusCompData] = useState(campusComparison)
    const [showCalcModal, setShowCalcModal] = useState(false)
    const [resetConfirm, setResetConfirm] = useState<{ isOpen: boolean, role: string | null }>({ isOpen: false, role: null })

    // Sync State with Server Props (Next.js Soft Navigation Fix)
    useEffect(() => {
        setAnalyticsData(analytics)
    }, [analytics])

    useEffect(() => {
        setTrendData(growthTrend)
    }, [growthTrend])

    useEffect(() => {
        setCampusCompData(campusComparison)
    }, [campusComparison])

    useEffect(() => {
        setCampuses(initialCampuses)
    }, [initialCampuses])

    useEffect(() => {
        if (selectedView === 'program-leads') {
            const loadLeads = async () => {
                setLoading(true)
                try {
                    const res = await getAllProgramLeads() as any
                    if (res.success && res.leads) setProgramLeads(res.leads)
                } catch (error) {
                    toast.error('Failed to load program leads')
                } finally {
                    setLoading(false)
                }
            }
            loadLeads()
        }
    }, [selectedView])

    const loadSettlements = async () => {
        const res = await getSettlements()
        if (res.success && res.settlements) setSettlements(res.settlements)
    }

    // Load Initial Data
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                // If campuses passed via prop, we don't strictly need to fetch, but we can refresh.
                // Fetching slabs and settlements still needed.
                const promises: Promise<any>[] = [getBenefitSlabs()]
                if (campuses.length === 0) promises.push(getCampuses())

                const [slb, cmp] = await Promise.all(promises)

                if (slb?.success && slb.data) setSlabs(slb.data)
                if (cmp?.success && cmp.campuses) setCampuses(cmp.campuses)

                await loadSettlements()
            } catch (error) {
                console.error('Failed to load initial data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Urgent Ticket Alert
    useEffect(() => {
        if (urgentTicketCount > 0) {
            toast.error(`⚠️ ACTION REQUIRED: ${urgentTicketCount} tickets have escalated to Level 4 (Urgent).`, {
                duration: Infinity,
                action: { label: 'View Tickets', onClick: () => router.push('/tickets') }
            })
        }
    }, [urgentTicketCount, router])

    // Generic Report Handler (Executing the function passed from ReportsPanel)
    const handleDownloadReport = async (reportFunction: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>) => {
        const promise = (async () => {
            const res = await reportFunction()

            if (!res.success) throw new Error(res.error)

            if (res.csv && res.filename) {
                const blob = new Blob([res.csv], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = res.filename
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                // Phase 2: Add a short delay before returning to ensure the 
                // ReportsPanel can clear its loading state after the browser 
                // handles the download dialog. This prevents UI "collision" hangs.
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
            return 'Report downloaded'
        })()

        toast.promise(promise, {
            loading: 'Generating report...',
            success: (data) => `${data}`,
            error: 'Failed to generate report'
        })
    }

    const handleWeeklyReport = async () => {
        toast.info("Weekly report trigger not implemented in this refactor yet.")
    }

    const handleSyncLegacy = async () => {
        const tid = toast.loading('Syncing legacy records...')
        try {
            const res = await syncLegacyConfirmedLeads() as any
            if (res.success) {
                toast.success(`Synced ${res.processed} records`, { id: tid })
                router.refresh()
            } else {
                toast.error(res.error || 'Sync failed', { id: tid })
            }
        } catch (e) {
            toast.error('An error occurred during sync', { id: tid })
        }
    }

    // Role Permissions State
    const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, RolePermissions>>({})
    useEffect(() => {
        if (selectedView === 'permissions' || selectedView === 'automation') {
            const loadPermissions = async () => {
                setLoading(true)
                try {
                    const roles = ['Super Admin', 'Campus Head', 'Finance Admin', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent', 'Alumni', 'Others']
                    const results = await Promise.all(roles.map(role => getRolePermissions(role)))
                    const matrix: Record<string, RolePermissions> = {}
                    roles.forEach((role, i) => { if (results[i].success && results[i].permissions) matrix[role] = results[i].permissions! })
                    setRolePermissionsMatrix(matrix)
                } catch (err) {
                    console.error('Failed to load permissions matrix:', err)
                } finally {
                    setLoading(false)
                }
            }
            loadPermissions()
        }
    }, [selectedView])

    const handleSavePermissions = async (matrix?: Record<string, RolePermissions>) => {
        const matrixToSave = matrix || rolePermissionsMatrix
        setLoading(true)
        try {
            const roles = Object.keys(matrixToSave)
            const results = await Promise.all(roles.map(role =>
                updateRolePermissions(role, matrixToSave[role])
            ))
            const failures = results.filter(r => !r.success)
            if (failures.length > 0) {
                toast.error(`Failed to save some permissions: ${failures.map(f => f.error).join(', ')}`)
            } else {
                toast.success('Permissions saved successfully!')
            }
        } catch (err) {
            toast.error('Failed to save permissions')
        } finally {
            setLoading(false)
        }
    }


    // Benefit Slab Modal State
    const [showBenefitModal, setShowBenefitModal] = useState(false)
    const [editingSlab, setEditingSlab] = useState<BenefitSlab | null>(null)
    const [slabForm, setSlabForm] = useState<Partial<BenefitSlab>>({ tierName: '', referralCount: 1, yearFeeBenefitPercent: 10, longTermExtraPercent: 0, baseLongTermPercent: 0 })

    const handleSaveSlab = async () => {
        let res
        if (editingSlab) {
            res = await updateBenefitSlab(editingSlab.slabId, slabForm as any)
        } else {
            res = await addBenefitSlab(slabForm as any)
        }
        if (res.success) {
            toast.success('Slab saved')
            setShowBenefitModal(false)
            // Refresh slabs
            const slb = await getBenefitSlabs()
            if (slb.success && slb.data) setSlabs(slb.data)
        } else {
            toast.error(res.error || 'Failed to save')
        }
    }

    return (
        <div className="bg-slate-50/50 min-h-screen">
            <div className={`${['program-leads', 'permissions'].includes(selectedView) ? 'max-w-full px-2' : 'max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10'} py-10 space-y-10`}>

                {(selectedView === 'analytics' || selectedView === 'home') && (
                    <div className="space-y-10">
                        {/* Data Integrity / Maintenance Section */}
                        {(analyticsData?.missingStudentCount || 0) > 0 && (
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl shadow-2xl shadow-indigo-100 border border-indigo-400/20 text-white animate-in slide-in-from-top-4 duration-700 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-1000" />
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-[24px] flex items-center justify-center border border-white/30 shadow-inner group-hover:rotate-12 transition-transform">
                                            <RefreshCw size={32} className="text-white animate-spin-slow" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight italic uppercase">Data Sync Required</h3>
                                            <p className="text-indigo-100 text-sm font-bold mt-1 max-w-md leading-relaxed">
                                                We found <span className="text-white underline underline-offset-4 decoration-2">{analyticsData.missingStudentCount} confirmed leads</span> that need to be synchronized with the master student database.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSyncLegacy}
                                        className="w-full md:w-auto px-10 py-4 bg-white text-indigo-700 rounded-2xl font-black text-xs shadow-2xl hover:shadow-white/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest group/btn"
                                    >
                                        <CheckCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                                        Repair Records Now
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end px-2">
                            <StudentSourceFilter />
                            <AcademicYearFilter />
                        </div>

                        <AnalyticsDashboard


                            analyticsData={analyticsData}
                            trendData={trendData}
                            campusCompData={campusCompData}
                            deepTrends={deepTrends}
                        />
                    </div>
                )}





                {selectedView === 'admins' && (
                    <AdminPanel
                        admins={admins}
                        campuses={campuses}
                    />
                )}





                {selectedView === 'reports' && (
                    <ReportsPanel
                        users={users}
                        campuses={campuses}
                        admins={admins}
                        campusComparison={campusCompData}
                        onDownloadReport={handleDownloadReport}
                        onWeeklyReport={handleWeeklyReport}
                        initialReportMode={initialReportMode}
                    />
                )}

                {selectedView === 'fees' && <FeeManagementTable />}

                {selectedView === 'engagement' && <EngagementPanel permissions={permissions} />}

                {selectedView === 'marketing' && <MarketingManager assets={marketingAssets || []} />}

                {/* Audit Trail View */}
                {selectedView === 'audit' && <AuditLogPanel />}

                {/* Settings View */}
                {selectedView === 'settings' && <SettingsPanel permissions={permissions} />}

                {/* External Programs View */}
                {selectedView === 'programs' && <ProgramManager />}

                {/* Program Leads View */}
                {selectedView === 'program-leads' && (
                    <div className="space-y-6 animate-fade-in">
                        <ProgramLeadsTable leads={programLeads} />
                    </div>
                )}

                {/* Access Control View (Permissions & Automation) */}
                {selectedView === 'permissions' && (
                    <div className="space-y-6 animate-fade-in w-full">
                        {/* Tab Header */}
                        <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100 w-fit mb-8">
                            <button
                                onClick={() => setActivePermissionTab('matrix')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePermissionTab === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Permissions Matrix
                                </div>
                            </button>
                        </div>

                        <PermissionsMatrix
                            rolePermissionsMatrix={rolePermissionsMatrix}
                            isLoading={loading}
                            onChange={setRolePermissionsMatrix}
                            onSave={() => handleSavePermissions()}
                            onReset={async (role: string) => {
                                setResetConfirm({ isOpen: true, role })
                            }}
                        />
                    </div>
                )}

                {/* Revenue & Settlements View */}
                {selectedView === 'settlements' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-3xl font-black italic text-gray-900 tracking-tight uppercase">Settlement Management</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Payouts (Processed)</p>
                                <p className="text-4xl font-black text-gray-900">₹{settlements.filter(s => s.status === 'Processed').reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Liabilities</p>
                                <p className="text-4xl font-black text-amber-500">₹{settlements.filter(s => s.status === 'Pending').reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-lg font-black italic text-gray-800 uppercase tracking-tight">Recent Payouts</h3>
                                <button
                                    onClick={() => setShowCalcModal(true)}
                                    className="px-5 py-2.5 bg-violet-600 text-white text-xs font-black italic rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 flex items-center gap-2 uppercase tracking-tight"
                                >
                                    <Calculator size={16} /> New Settlement Request
                                </button>
                            </div>
                            <SettlementTable
                                settlements={settlements}
                                onProcess={async (id, data) => {
                                    const res = await processSettlement(id, data)
                                    if (res.success) loadSettlements()
                                    return res
                                }}
                                onDelete={async (id) => {
                                    const res = await deleteSettlement(id)
                                    if (res.success) loadSettlements()
                                    return res
                                }}
                            />
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6 px-2">
                                <h3 className="text-lg font-black italic text-gray-800 uppercase tracking-tight">Benefit Distribution Rules</h3>
                            </div>
                            <BenefitSlabTable
                                slabs={slabs}
                                onAddSlab={() => {
                                    setEditingSlab(null)
                                    setSlabForm({ tierName: '', referralCount: 1, yearFeeBenefitPercent: 10, longTermExtraPercent: 0, baseLongTermPercent: 0 })
                                    setShowBenefitModal(true)
                                }}
                                onEditSlab={(slab: BenefitSlab) => {
                                    setEditingSlab(slab)
                                    setSlabForm({
                                        tierName: slab.tierName,
                                        referralCount: slab.referralCount,
                                        yearFeeBenefitPercent: slab.yearFeeBenefitPercent,
                                        longTermExtraPercent: slab.longTermExtraPercent || 0,
                                        baseLongTermPercent: slab.baseLongTermPercent || 0
                                    })
                                    setShowBenefitModal(true)
                                }}
                                onDeleteSlab={deleteBenefitSlab}
                            />
                        </div>
                    </div>
                )}

                {/* Modals for Settlements */}
                <SettlementCalculatorModal
                    isOpen={showCalcModal}
                    onClose={() => setShowCalcModal(false)}
                    users={users}
                    onSuccess={loadSettlements}
                />

                {/* Support Desk View */}
                {selectedView === 'support' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                            <div className="p-10 text-center text-slate-400">
                                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                                <p>No active support cases. Ambassadors are happy!</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Standardized Benefit Slab Modal */}
                <Modal
                    isOpen={showBenefitModal}
                    onClose={() => setShowBenefitModal(false)}
                    variant="blue"
                    title={editingSlab ? 'Update Configuration' : 'Create New Slab'}
                    subtitle="Benefit Distribution Intelligence"
                    icon={editingSlab ? <Edit size={20} /> : <Plus size={20} />}
                    footer={
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowBenefitModal(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSlab}
                                disabled={loading}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {editingSlab ? 'Commit Changes' : 'Ignite Slab'}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="slab-tier-name" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tier Designation</label>
                            <input
                                id="slab-tier-name"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all placeholder:text-gray-300"
                                placeholder="e.g. Platinum Elite"
                                value={slabForm.tierName || ''}
                                onChange={e => setSlabForm({ ...slabForm, tierName: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="slab-referral-threshold" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Referral Threshold</label>
                                <div className="relative">
                                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <input
                                        id="slab-referral-threshold"
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all"
                                        value={slabForm.referralCount || 0}
                                        onChange={e => setSlabForm({ ...slabForm, referralCount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="slab-base-benefit" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Base Benefit (%)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <input
                                        id="slab-base-benefit"
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all"
                                        value={slabForm.yearFeeBenefitPercent || 0}
                                        onChange={e => setSlabForm({ ...slabForm, yearFeeBenefitPercent: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                    <TrendingUp size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-900 uppercase tracking-tight italic">Yield Potential</p>
                                    <p className="text-[11px] font-bold text-blue-600 tracking-wide">This slab triggers at {slabForm.referralCount} successfully confirmed referrals.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

            </div>

            <ConfirmDialog
                isOpen={resetConfirm.isOpen}
                title="Reset Permissions?"
                description={`Are you sure you want to RESET permissions for ${resetConfirm.role} to system defaults? This action cannot be undone.`}
                confirmText="Yes, Reset to Default"
                variant="danger"
                onConfirm={async () => {
                    if (resetConfirm.role) {
                        setResetConfirm(prev => ({ ...prev, isOpen: false }))
                        setLoading(true)
                        try {
                            const res = await resetRolePermissions(resetConfirm.role)
                            if (res.success) {
                                toast.success(`Permissions for ${resetConfirm.role} reset to defaults.`)
                                const newPerms = await getRolePermissions(resetConfirm.role)
                                if (newPerms.success && newPerms.permissions) {
                                    setRolePermissionsMatrix(prev => ({ ...prev, [resetConfirm.role!]: newPerms.permissions! }))
                                }
                            } else {
                                toast.error(res.error || 'Failed to reset permissions')
                            }
                        } catch (err) {
                            toast.error('Error resetting permissions')
                        } finally {
                            setLoading(false)
                        }
                    }
                }}
                onCancel={() => setResetConfirm({ isOpen: false, role: null })}
            />
        </div>
    )
}
