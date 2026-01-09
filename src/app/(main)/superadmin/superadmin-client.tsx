'use client'

import { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageSquare } from 'lucide-react'

// Import only what's needed for client-managed state
import { getCampuses } from '@/app/campus-actions'
import { getBenefitSlabs, updateBenefitSlab, addBenefitSlab, deleteBenefitSlab } from '@/app/benefit-actions'
import { getCampusDetails } from '@/app/superadmin-actions'
import { getRolePermissions, updateRolePermissions } from '@/app/permission-actions'

import { MarketingManager } from '@/components/MarketingManager'
// Report actions are handled within ReportsPanel, superadmin-client just executes the passed function

// Modular Components (Static Imports for core panels)
import { AnalyticsDashboard } from '@/components/superadmin/AnalyticsDashboard'
import { CampusPanel } from '@/components/superadmin/CampusPanel'
import { UserPanel } from '@/components/superadmin/UserPanel'
import { AdminPanel } from '@/components/superadmin/AdminPanel'
import { StudentPanel } from '@/components/superadmin/StudentPanel'
import { ReferralPanel } from '@/components/superadmin/ReferralPanel'
import { ReportsPanel } from '@/components/superadmin/ReportsPanel'

// Dynamic Imports
const PermissionsMatrix = dynamic(() => import('@/components/superadmin/PermissionsMatrix').then(m => m.PermissionsMatrix), { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-gray-100 rounded-lg" /> })
const BenefitSlabTable = dynamic(() => import('@/components/superadmin/BenefitSlabTable').then(m => m.BenefitSlabTable), { ssr: false })
const FeeManagementTable = dynamic(() => import('@/components/superadmin/FeeManagementTable').then(m => m.FeeManagementTable), { ssr: false })
const EngagementPanel = dynamic(() => import('@/components/superadmin/EngagementPanel').then(m => m.EngagementPanel), { ssr: false })
const AuditLogPanel = dynamic(() => import('@/components/superadmin/AuditLogPanel').then(m => m.AuditLogPanel), { ssr: false })
const SettingsPanel = dynamic(() => import('@/components/superadmin/SettingsPanel').then(m => m.SettingsPanel), { ssr: false })

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
    urgentTicketCount?: number
}

export default function SuperadminClient({ analytics, campusComparison = [], users = [], admins = [], students = [], initialView = 'analytics', marketingAssets = [],
    currentUser,
    growthTrend = [],
    urgentTicketCount = 0
}: Props) {
    const searchParams = useSearchParams()
    const router = useRouter()

    // Core State
    const [loading, setLoading] = useState(false)

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
    const [campuses, setCampuses] = useState<Campus[]>([]) // Fetch for dropdowns in other panels
    const [slabs, setSlabs] = useState<BenefitSlab[]>([])
    const [settlements, setSettlements] = useState<any[]>([]) // Placeholder

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(analytics)
    const [trendData, setTrendData] = useState(growthTrend)
    const [campusCompData, setCampusCompData] = useState(campusComparison)
    const [campusDetails, setCampusDetails] = useState<{ topAmbassadors: any[], recentLeads: any[] } | null>(null)

    // Load Initial Data
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [cmp, slb] = await Promise.all([
                    getCampuses(),
                    getBenefitSlabs()
                ])

                if (cmp.success && cmp.campuses) setCampuses(cmp.campuses)
                if (slb.success && slb.slabs) setSlabs(slb.slabs)
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
            if (slb.success && slb.slabs) setSlabs(slb.slabs)
        } else {
            toast.error(res.error || 'Failed to save')
        }
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {(selectedView === 'analytics' || selectedView === 'home') && (
                    <AnalyticsDashboard
                        analyticsData={analyticsData}
                        trendData={trendData}
                        campusCompData={campusCompData}
                        onCampusClick={handleCampusClick}
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
                    <ReferralPanel />
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
                        />
                    </div>
                )}

                {/* Revenue & Settlements View */}
                {selectedView === 'settlements' && (
                    <div className="space-y-6 animate-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Total Payouts</p>
                                <p style={{ fontSize: '24px', fontWeight: '800', color: '#111827' }}>₹{settlements.reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}</p>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Pending</p>
                                <p style={{ fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>₹{settlements.filter(s => s.status === 'Pending').reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}</p>
                            </div>
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
                )
                }

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

                {/* Modals that are still managed here (Slab Modal) */}
                {/* Benefit Slab Modal */}
                {showBenefitModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{editingSlab ? 'Edit Slab' : 'Add Slab'}</h3>
                            <div className="space-y-4">
                                <input placeholder="Tier Name (e.g. Gold)" className="w-full border p-2 rounded" value={slabForm.tierName || ''} onChange={e => setSlabForm({ ...slabForm, tierName: e.target.value })} />
                                <input type="number" placeholder="Referral Count" className="w-full border p-2 rounded" value={slabForm.referralCount || 0} onChange={e => setSlabForm({ ...slabForm, referralCount: Number(e.target.value) })} />
                                <input type="number" placeholder="Year Fee Benefit %" className="w-full border p-2 rounded" value={slabForm.yearFeeBenefitPercent || 0} onChange={e => setSlabForm({ ...slabForm, yearFeeBenefitPercent: Number(e.target.value) })} />
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setShowBenefitModal(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                                    <button onClick={handleSaveSlab} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
