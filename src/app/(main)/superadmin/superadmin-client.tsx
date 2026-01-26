'use client'

import { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageSquare, Calculator } from 'lucide-react'

// Import only what's needed for client-managed state
import { getCampuses } from '@/app/campus-actions'
import { getBenefitSlabs, updateBenefitSlab, addBenefitSlab, deleteBenefitSlab } from '@/app/benefit-actions'
import { getCampusDetails } from '@/app/superadmin-actions'
import { getSettlements, processSettlement, deleteSettlement } from '@/app/settlement-actions'
import { getRolePermissions, updateRolePermissions, resetRolePermissions } from '@/app/permission-actions'
import { confirmReferral, convertLeadToStudent, rejectReferral } from '@/app/admin-actions' // Import server actions

import { MarketingManager } from '@/components/MarketingManager'
import { Modal } from '@/components/ui/Modal'
import { Plus, Edit, Target, Save, Loader2, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react'
// Report actions are handled within ReportsPanel, superadmin-client just executes the passed function

// Modular Components (Static Imports for core panels)
import { AnalyticsDashboard } from '@/components/superadmin/AnalyticsDashboard'
import { CampusPanel } from '@/components/superadmin/CampusPanel'
import { UserPanel } from '@/components/superadmin/UserPanel'
import { AdminPanel } from '@/components/superadmin/AdminPanel'
import { StudentPanel } from '@/components/superadmin/StudentPanel'
// import { ReferralPanel } from '@/components/superadmin/ReferralPanel' // Removing old panel
import { ReferralManagementTable } from '@/app/(main)/admin/referral-table-advanced' // New Table
import { ReportsPanel } from '@/components/superadmin/ReportsPanel'
import CSVUploader from '@/components/CSVUploader' // Re-added CSVUploader

// Dynamic Imports
const PermissionsMatrix = dynamic(() => import('@/components/superadmin/PermissionsMatrix').then(m => m.PermissionsMatrix), { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-gray-100 rounded-lg" /> })
const BenefitSlabTable = dynamic(() => import('@/components/superadmin/BenefitSlabTable').then(m => m.BenefitSlabTable), { ssr: false })
const FeeManagementTable = dynamic(() => import('@/components/superadmin/FeeManagementTable').then(m => m.FeeManagementTable), { ssr: false })
const EngagementPanel = dynamic(() => import('@/components/superadmin/EngagementPanel').then(m => m.EngagementPanel), { ssr: false })
const AuditLogPanel = dynamic(() => import('@/components/superadmin/AuditLogPanel').then(m => m.AuditLogPanel), { ssr: false })
const SettingsPanel = dynamic(() => import('@/components/superadmin/SettingsPanel').then(m => m.SettingsPanel), { ssr: false })
const SettlementTable = dynamic(() => import('@/components/superadmin/SettlementTable').then(m => m.SettlementTable), { ssr: false })
const SettlementCalculatorModal = dynamic(() => import('@/components/superadmin/SettlementCalculatorModal').then(m => m.SettlementCalculatorModal), { ssr: false })

import { User, Student, SystemAnalytics, CampusPerformance, Admin, SystemSettings, MarketingAsset, Campus, BenefitSlab, RolePermissions } from '@/types'

type ViewType = 'home' | 'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash' | 'referrals' | 'fees' | 'engagement';

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
}

export default function SuperadminClient({ analytics, campusComparison = [], users = [], admins = [], students = [], initialView = 'analytics', marketingAssets = [],
    currentUser,
    growthTrend = [],
    deepTrends = null,
    urgentTicketCount = 0,
    referrals = [],
    referralMeta,
    campuses: initialCampuses = []
}: Props) {
    const searchParams = useSearchParams()
    const router = useRouter()

    console.log('DEBUG: SuperadminClient Rendered')
    console.log(`DEBUG: Referrals Prop Length: ${referrals?.length || 0}`)
    if (referrals && referrals.length > 0) {
        console.log('DEBUG: First Referral:', JSON.stringify(referrals[0].user || {}, null, 2))
    }

    // Core State
    const [loading, setLoading] = useState(false)
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [uploadType, setUploadType] = useState<'students' | 'users' | 'fees' | 'campuses' | 'referrals' | 'crm-leads'>('referrals')

    // View State
    const mapViewParam = (view: string): ViewType => {
        const validViews = ['home', 'analytics', 'users', 'admins', 'campuses', 'settings', 'reports', 'students', 'settlements', 'marketing', 'audit', 'support', 'permissions', 'staff-dash', 'parent-dash', 'referrals', 'fees', 'engagement']
        return validViews.includes(view) ? (view as ViewType) : 'home'
    }
    const [selectedView, setSelectedView] = useState<ViewType>(mapViewParam(initialView))

    useEffect(() => {
        const viewParam = searchParams.get('view') || 'home'
        setSelectedView(mapViewParam(viewParam))
    }, [searchParams])

    // Data State (Fetched on mount)
    const [campuses, setCampuses] = useState<Campus[]>(initialCampuses) // Fetch for dropdowns in other panels
    const [slabs, setSlabs] = useState<BenefitSlab[]>([])
    const [settlements, setSettlements] = useState<any[]>([]) // Placeholder

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(analytics)
    const [trendData, setTrendData] = useState(growthTrend)
    const [campusCompData, setCampusCompData] = useState(campusComparison)
    const [campusDetails, setCampusDetails] = useState<{ topAmbassadors: any[], recentLeads: any[] } | null>(null)
    const [showCalcModal, setShowCalcModal] = useState(false)

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

    const handleCampusClick = async (campusName: string) => {
        try {
            const res = await getCampusDetails(campusName)
            if (res.success) {
                setCampusDetails({ topAmbassadors: res.topAmbassadors || [], recentLeads: res.recentLeads || [] })
            } else {
                toast.error('Failed to load campus details')
            }
        } catch (error) {
            toast.error('Error loading details')
        }
    }

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

    // Role Permissions State
    const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, RolePermissions>>({})
    useEffect(() => {
        if (selectedView === 'permissions') {
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
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-10">

                {(selectedView === 'analytics' || selectedView === 'home') && (
                    <AnalyticsDashboard
                        analyticsData={analyticsData}
                        trendData={trendData}
                        campusCompData={campusCompData}
                        onCampusClick={handleCampusClick}
                        deepTrends={deepTrends}
                    />
                )}

                {selectedView === 'campuses' && (
                    <CampusPanel campusComparison={campusCompData} mode="management" />
                )}

                {selectedView === 'users' && (
                    <UserPanel
                        users={users}
                        campuses={campuses}
                        currentUserRole={currentUser?.role}
                    />
                )}

                {selectedView === 'admins' && (
                    <AdminPanel
                        admins={admins}
                        campuses={campuses}
                    />
                )}

                {selectedView === 'students' && (
                    <StudentPanel
                        students={students}
                        users={users}
                        campuses={campuses}
                    />
                )}

                {selectedView === 'referrals' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Referral Management</h1>
                        </div>
                        <ReferralManagementTable
                            referrals={referrals}
                            meta={referralMeta || { page: 1, limit: 50, total: referrals.length, totalPages: 1 }}
                            onBulkAdd={() => { setUploadType('referrals'); setShowBulkUpload(true); }}
                            onImportCrm={() => { setUploadType('crm-leads'); setShowBulkUpload(true); }}
                            confirmReferral={confirmReferral}
                            convertLeadToStudent={convertLeadToStudent}
                            rejectReferral={rejectReferral}
                            campuses={campuses}
                        />
                        {showBulkUpload && (
                            <CSVUploader
                                type={uploadType}
                                onClose={() => setShowBulkUpload(false)}
                                onUpload={async () => {
                                    router.refresh()
                                    return { success: true, added: 0, failed: 0, errors: [] }
                                }}
                            />
                        )}
                    </div>
                )}

                {selectedView === 'reports' && (
                    <ReportsPanel
                        users={users}
                        campuses={campuses}
                        admins={admins}
                        campusComparison={campusCompData}
                        onDownloadReport={handleDownloadReport}
                        onWeeklyReport={handleWeeklyReport}
                    />
                )}

                {selectedView === 'fees' && <FeeManagementTable />}

                {selectedView === 'engagement' && <EngagementPanel />}

                {selectedView === 'marketing' && <MarketingManager assets={marketingAssets || []} />}

                {/* Audit Trail View */}
                {selectedView === 'audit' && <AuditLogPanel />}

                {/* Settings View */}
                {selectedView === 'settings' && <SettingsPanel />}

                {/* Permissions Matrix View - Use full available width */}
                {selectedView === 'permissions' && (
                    <div className="space-y-6 animate-fade-in w-full">
                        <PermissionsMatrix
                            rolePermissionsMatrix={rolePermissionsMatrix}
                            isLoading={loading}
                            onChange={setRolePermissionsMatrix}
                            onSave={async () => {
                                setLoading(true)
                                try {
                                    const roles = Object.keys(rolePermissionsMatrix)
                                    const results = await Promise.all(roles.map(role =>
                                        updateRolePermissions(role, rolePermissionsMatrix[role])
                                    ))
                                    const failures = results.filter(r => !r.success)
                                    if (failures.length > 0) {
                                        toast.error(`Failed to save some permissions: ${failures.map(f => f.error).join(', ')}`)
                                    } else {
                                        toast.success('Permissions saved successfully! Changes will reflect on refresh.')
                                    }
                                } catch (err) {
                                    toast.error('Failed to save permissions')
                                } finally {
                                    setLoading(false)
                                }
                            }}
                            onReset={async (role: string) => {
                                if (confirm(`Are you sure you want to RESET permissions for ${role} to system defaults? This cannot be undone.`)) {
                                    setLoading(true)
                                    try {
                                        const res = await resetRolePermissions(role)
                                        if (res.success) {
                                            toast.success(`Permissions for ${role} reset to defaults.`)
                                            // Refresh permissions
                                            const newPerms = await getRolePermissions(role)
                                            if (newPerms.success && newPerms.permissions) {
                                                setRolePermissionsMatrix(prev => ({ ...prev, [role]: newPerms.permissions! }))
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
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                                <MessageSquare size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
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
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tier Designation</label>
                            <input
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all placeholder:text-gray-300"
                                placeholder="e.g. Platinum Elite"
                                value={slabForm.tierName || ''}
                                onChange={e => setSlabForm({ ...slabForm, tierName: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Referral Threshold</label>
                                <div className="relative">
                                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all"
                                        value={slabForm.referralCount || 0}
                                        onChange={e => setSlabForm({ ...slabForm, referralCount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Base Benefit (%)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <input
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
        </div>
    )
}
