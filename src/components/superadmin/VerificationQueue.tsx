'use client'

import { useState, useEffect, useRef } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Edit2, Search, Database, Globe, Loader2, Save, Clock, GraduationCap, Building, User as UserIcon, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp, Users, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getPendingVerifications, getVerifiedUsers, getErpStagingData, approveVerification, rejectVerification, bulkVerifyAgainstDatabase, getVerificationsForExport } from '@/app/verification-actions'
import { getCampuses } from '@/app/campus-actions'
import { exportToCSV } from '@/lib/export-utils'
import { GRADES } from '@/lib/constants'
import { getGradesForCampus } from '@/lib/grade-utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import CSVUploader from '@/components/CSVUploader'
import { bulkAddStudents } from '@/app/student-actions'
import { Badge } from '@/components/ui/Badge'
import { FilterDropdown } from '@/components/ui/FilterDropdown'

interface VerificationQueueProps {
    initialData?: any[]
}

export default function VerificationQueue({ initialData = [] }: VerificationQueueProps) {
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'staged'>('pending')
    const [pendingUsers, setPendingUsers] = useState<any[]>(initialData || [])
    const [verifiedUsers, setVerifiedUsers] = useState<any[]>([])
    const [stagedUsers, setStagedUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalRecords, setTotalRecords] = useState(0)
    const [processing, setProcessing] = useState<number | null>(null)
    const [isBulking, setIsBulking] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [showRejectConfirm, setShowRejectConfirm] = useState(false)
    const [rejectUserId, setRejectUserId] = useState<number | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCampus, setFilterCampus] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [filterGrade, setFilterGrade] = useState('')
    const [campuses, setCampuses] = useState<any[]>([])
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [activeFilter, setActiveFilter] = useState<'campus' | 'grade' | 'role' | null>(null)
    const [verifiedCountToday, setVerifiedCountToday] = useState(0)
    const [serverPotentialMatches, setServerPotentialMatches] = useState(0)
    const [totalPending, setTotalPending] = useState(0)
    const [totalVerifiedOnServer, setTotalVerifiedOnServer] = useState(0)
    const [totalStaged, setTotalStaged] = useState(0)
    const [staffCount, setStaffCount] = useState(0)
    const [parentCount, setParentCount] = useState(0)
    const [visibleColumns, setVisibleColumns] = useState({
        user: true,
        child: true,
        grade: true,
        campus: true,
        status: true,
        actions: true
    })
    const campusFilterRef = useRef<HTMLDivElement>(null)
    const roleFilterRef = useRef<HTMLDivElement>(null)

    useClickOutside(campusFilterRef, () => activeFilter === 'campus' && setActiveFilter(null))
    useClickOutside(roleFilterRef, () => activeFilter === 'role' && setActiveFilter(null))

    useEffect(() => {
        setMounted(true)
    }, [])

    // Edit Form State
    const [editForm, setEditForm] = useState({
        childEprNo: '',
        grade: '',
        childCampusId: '',
        childName: ''
    })

    const [selectedUserIdForReject, setSelectedUserIdForReject] = useState<number | null>(null)

    const loadPendingData = async (
        pageNum: number = page,
        search: string = searchTerm,
        campus: string = filterCampus,
        role: string = filterRole,
        grade: string = filterGrade
    ) => {
        setLoading(true)
        const res = await getPendingVerifications(pageNum, 50, search, campus, role, grade)
        if (res.success) {
            setPendingUsers(res.data || [])
            setVerifiedCountToday(res.verifiedToday || 0)
            setServerPotentialMatches(res.potentialMatches || 0)
            setTotalPending(res.total || 0)
            setTotalVerifiedOnServer(res.totalVerified || 0)
            setTotalStaged(res.stagedCount || 0)
            setStaffCount(res.staffCount || 0)
            setParentCount(res.parentCount || 0)
            setTotalPages(res.totalPages || 1)
            setTotalRecords(res.total || 0)
        }
        setLoading(false)
    }

    const loadVerifiedData = async (
        pageNum: number = page,
        search: string = searchTerm,
        campus: string = filterCampus,
        role: string = filterRole,
        grade: string = filterGrade
    ) => {
        setLoading(true)
        const res = await getVerifiedUsers(pageNum, 50, search, campus, role, grade)
        if (res.success) {
            setVerifiedUsers(res.data || [])
            setTotalPages(res.totalPages || 1)
            setTotalRecords(res.total || 0)
            setTotalVerifiedOnServer(res.total || 0)
        }
        setLoading(false)
    }

    const loadStagedData = async (
        pageNum: number = page,
        search: string = searchTerm,
        campus: string = filterCampus,
        grade: string = filterGrade
    ) => {
        setLoading(true)
        const res = await getErpStagingData(pageNum, 50, search, campus, grade)
        if (res.success) {
            setStagedUsers(res.data || [])
            setTotalPages(res.totalPages || 1)
            setTotalStaged(res.total || 0)
        }
        setLoading(false)
    }

    const loadData = () => {
        if (activeTab === 'pending') loadPendingData(1)
        else if (activeTab === 'verified') loadVerifiedData(1)
        else loadStagedData(1)
        setPage(1)
    }

    const loadCampuses = async () => {
        const res = await getCampuses()
        if (res.success) setCampuses(res.campuses || [])
    }

    useEffect(() => {
        if (activeTab === 'pending') loadPendingData(page, searchTerm, filterCampus, filterRole, filterGrade)
        else if (activeTab === 'verified') loadVerifiedData(page, searchTerm, filterCampus, filterRole, filterGrade)
        else loadStagedData(page, searchTerm, filterCampus, filterGrade)
    }, [page, activeTab, filterCampus, filterRole, filterGrade])

    const handleSearch = () => {
        setPage(1)
        if (activeTab === 'pending') loadPendingData(1, searchTerm, filterCampus, filterRole, filterGrade)
        else if (activeTab === 'verified') loadVerifiedData(1, searchTerm, filterCampus, filterRole, filterGrade)
        else loadStagedData(1, searchTerm, filterCampus, filterGrade)
    }

    // Reset page on search
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        loadCampuses()
    }, [])

    const handleApprove = async (userId: number, withEdits = false, suggestion: any = null) => {
        setProcessing(userId)

        let payload = withEdits ? {
            childEprNo: editForm.childEprNo,
            grade: editForm.grade,
            childCampusId: parseInt(editForm.childCampusId),
            childName: editForm.childName
        } : undefined

        if (!payload && suggestion) {
            payload = {
                childEprNo: suggestion.admissionNumber,
                grade: suggestion.grade,
                childCampusId: suggestion.campusId,
                childName: suggestion.studentName
            }
        }

        const res = await approveVerification(userId, payload)

        if (res.success) {
            toast.success(suggestion ? 'Details synced successfully' : 'User verified successfully')
            setEditingId(null)
            loadData() // Refresh list and stats (Matches, Today, Pending)
        } else {
            toast.error(res.error || 'Action failed')
        }
        setProcessing(null)
    }

    const handleReject = async (userId: number) => {
        setSelectedUserIdForReject(userId)
        setShowRejectConfirm(true)
    }

    const confirmReject = async () => {
        if (!selectedUserIdForReject) return
        setShowRejectConfirm(false)
        const userId = selectedUserIdForReject
        setProcessing(userId)
        const res = await rejectVerification(userId)

        if (res.success) {
            toast.success('Request rejected')
            setPendingUsers(prev => prev.filter(u => u.userId !== userId))
        } else {
            toast.error(res.error || 'Rejection failed')
        }
        setProcessing(null)
    }

    const handleBulkVerify = async () => {
        setIsBulking(true)
        const res = await bulkVerifyAgainstDatabase()
        if (res.success) {
            toast.success(`Bulk Verification Complete: Verified ${res.verifiedCount} users.`)
            loadData() // Reload to remove verified ones
        } else {
            toast.error(res.error || 'Bulk verification failed')
        }
        setIsBulking(false)
    }

    const handleExport = async () => {
        setLoading(true)
        try {
            const res = await getVerificationsForExport(activeTab as any, searchTerm, filterCampus, filterRole, filterGrade)
            if (res.success && res.data) {
                const headers = activeTab === 'staged' ? [
                    { header: 'Student Name', accessor: (r: any) => r.fullName },
                    { header: 'Parent Name', accessor: (r: any) => r.parentName || '-' },
                    { header: 'ERP No', accessor: (r: any) => r.admissionNumber },
                    { header: 'Parent Mobile', accessor: (r: any) => r.parentMobile || '-' },
                    { header: 'Grade', accessor: (r: any) => r.grade },
                    { header: 'Campus', accessor: (r: any) => r.campusName },
                    { header: 'Import Date', accessor: (r: any) => new Date(r.createdAt).toLocaleDateString() }
                ] : [
                    { header: 'Full Name', accessor: (r: any) => r.fullName },
                    { header: 'Mobile', accessor: (r: any) => r.mobileNumber },
                    { header: 'Role', accessor: (r: any) => r.role },
                    { header: 'Campus', accessor: (r: any) => r.assignedCampus || '-' },
                    { header: 'Grade', accessor: (r: any) => r.grade || '-' },
                    { header: 'ERP No', accessor: (r: any) => r.childEprNo || '-' },
                    { header: 'Child Name', accessor: (r: any) => r.childName || '-' },
                    { header: 'Applied Date', accessor: (r: any) => new Date(r.createdAt).toLocaleDateString() }
                ];

                exportToCSV(res.data, `Verification_${activeTab}`, headers);
                toast.success('Export started')
            } else {
                toast.error(res.error || 'Export failed')
            }
        } catch (error) {
            console.error('Export error:', error)
            toast.error('An unexpected error occurred during export')
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (user: any) => {
        setEditingId(user.userId)

        // 1. Resolve Grade (handle variations like 'PRE MONT' vs 'Pre-Mont')
        const rawGrade = user.grade || user.matchSuggestion?.grade || ''
        const matchedGrade = GRADES.find(g =>
            g.toLowerCase().replace(/[^a-z0-9]/g, '') === rawGrade.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        ) || ''

        // 2. Resolve Campus ID (handle missing IDs from staging records)
        let campusId = (user.childCampusId || user.campusId)?.toString() || user.matchSuggestion?.campusId?.toString() || ''
        if (!campusId) {
            const campusName = user.assignedCampus || user.matchSuggestion?.campus
            if (campusName) {
                const found = campuses.find(c => c.campusName === campusName)
                if (found) campusId = found.id.toString()
            }
        }

        setEditForm({
            childEprNo: user.childEprNo || user.matchSuggestion?.admissionNumber || '',
            grade: matchedGrade || rawGrade,
            childCampusId: campusId,
            childName: user.childName || user.matchSuggestion?.studentName || ''
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
    }

    // Filter State
    // Filter Logic
    const currentUsers = activeTab === 'pending' ? pendingUsers : (activeTab === 'verified' ? verifiedUsers : stagedUsers)

    // Derived Stats
    const stats = {
        pending: totalPending,
        verified: totalVerifiedOnServer,
        staff: staffCount,
        parents: parentCount,
        matched: serverPotentialMatches,
        staged: totalStaged
    }

    const filteredUsers = currentUsers // Search/Filtering is now server-side for scale

    const uniqueCampuses = Array.from(new Set(currentUsers.map(u => u.assignedCampus).filter(Boolean)))

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pending Requests</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none" suppressHydrationWarning>{stats.pending}</h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Staff / Parents</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none" suppressHydrationWarning>{stats.staff} / {stats.parents}</h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Database size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Potential Matches</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none" suppressHydrationWarning>{stats.matched}</h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Verified Today</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none" suppressHydrationWarning>{verifiedCountToday}</h4>
                    </div>
                </div>
            </div>

            {/* Toolbar & Tabs */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-4 z-30">
                <div className="flex flex-1 items-center gap-3 w-full">

                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl relative mr-2">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all z-10 ${activeTab === 'pending' ? "text-white shadow-md bg-amber-500" : "text-gray-500 hover:text-gray-700"}`}
                            suppressHydrationWarning
                        >
                            Pending
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`} suppressHydrationWarning>
                                {stats.pending}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('verified')}
                            className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all z-10 ${activeTab === 'verified' ? "text-white shadow-md bg-emerald-500" : "text-gray-500 hover:text-gray-700"}`}
                            suppressHydrationWarning
                        >
                            Verified
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'verified' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`} suppressHydrationWarning>
                                {stats.verified}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('staged')}
                            className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all z-10 ${activeTab === 'staged' ? "text-white shadow-md bg-indigo-500" : "text-gray-500 hover:text-gray-700"}`}
                            suppressHydrationWarning
                        >
                            <div className="flex items-center gap-1.5">
                                <Database size={12} />
                                ERP Master
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'staged' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`} suppressHydrationWarning>
                                    {stats.staged}
                                </span>
                            </div>
                        </button>
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, Mobile Number or ERP..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setPage(1)
                                    handleSearch()
                                }
                            }}
                            suppressHydrationWarning
                        />
                    </div>

                    <div className="relative" ref={campusFilterRef}>
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'campus' ? null : 'campus')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${filterCampus ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            suppressHydrationWarning
                        >
                            <Building size={14} />
                            Campus {filterCampus && `(${filterCampus})`}
                        </button>
                        {activeFilter === 'campus' && (
                            <FilterDropdown
                                label="Campus"
                                activeValues={filterCampus ? [filterCampus] : []}
                                options={campuses.map(c => c.campusName)}
                                onApply={(vals) => {
                                    setPage(1)
                                    setFilterCampus(vals[0] || '')
                                }}
                                onClose={() => setActiveFilter(null)}
                            />
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'role' ? null : 'role')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${filterRole ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            suppressHydrationWarning
                        >
                            <UserIcon size={14} />
                            Role {filterRole && `(${filterRole})`}
                        </button>
                        {activeFilter === 'role' && (
                            <FilterDropdown
                                label="Role"
                                activeValues={filterRole ? [filterRole] : []}
                                options={['Staff', 'Parent']}
                                onApply={(vals) => {
                                    setPage(1)
                                    setFilterRole(vals[0] || '')
                                }}
                                onClose={() => setActiveFilter(null)}
                            />
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'grade' ? null : 'grade')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${filterGrade ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            suppressHydrationWarning
                        >
                            <GraduationCap size={14} />
                            Grade {filterGrade && `(${filterGrade})`}
                        </button>
                        {activeFilter === 'grade' && (
                            <FilterDropdown
                                label="Grade"
                                activeValues={filterGrade ? [filterGrade] : []}
                                options={[...GRADES]}
                                onApply={(vals) => {
                                    setPage(1)
                                    setFilterGrade(vals[0] || '')
                                }}
                                onClose={() => setActiveFilter(null)}
                            />
                        )}
                    </div>

                    {(searchTerm || filterCampus || filterRole || filterGrade) && (
                        <button
                            onClick={() => {
                                setSearchTerm('')
                                setFilterCampus('')
                                setFilterRole('')
                                setFilterGrade('')
                                setPage(1)
                            }}
                            className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-1 active:scale-95"
                            suppressHydrationWarning
                        >
                            <X size={14} />
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        title="Download CSV"
                        suppressHydrationWarning
                    >
                        <Download size={16} />
                        Export
                    </button>

                    <button
                        onClick={() => setShowBulkUpload(true)}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95"
                        suppressHydrationWarning
                    >
                        <Database size={16} />
                        Upload ERP Data
                    </button>

                    <button
                        onClick={handleBulkVerify}
                        disabled={isBulking || stats.matched === 0 || activeTab === 'verified'}
                        className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 ${activeTab === 'verified' ? 'bg-gray-300 shadow-none' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'}`}
                        suppressHydrationWarning
                    >
                        {isBulking ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        {isBulking ? 'Verifying...' : 'Auto-Verify'}
                    </button>
                </div>
            </div>

            {/* Active Filters Disclosure */}
            {(searchTerm || filterCampus || filterRole || filterGrade) && (
                <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Active Filters:</span>
                    {searchTerm && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black flex items-center gap-1 border border-indigo-100">
                            Search: "{searchTerm}"
                            <X size={10} className="cursor-pointer" onClick={() => setSearchTerm('')} />
                        </span>
                    )}
                    {filterCampus && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black flex items-center gap-1 border border-indigo-100">
                            Campus: {filterCampus}
                            <X size={10} className="cursor-pointer" onClick={() => setFilterCampus('')} />
                        </span>
                    )}
                    {filterRole && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black flex items-center gap-1 border border-indigo-100">
                            Role: {filterRole}
                            <X size={10} className="cursor-pointer" onClick={() => setFilterRole('')} />
                        </span>
                    )}
                    {filterGrade && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black flex items-center gap-1 border border-indigo-100">
                            Grade: {filterGrade}
                            <X size={10} className="cursor-pointer" onClick={() => setFilterGrade('')} />
                        </span>
                    )}
                </div>
            )}

            {/* Verification List - Table View */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === 'staged' ? 'Student Name' : 'User Details'}</th>
                            {activeTab === 'staged' && (
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent Name</th>
                            )}
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === 'staged' ? 'Parent Mobile' : 'Child Details'}</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{activeTab === 'staged' ? 'Grade / Campus' : 'Benefit Status'}</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === 'staged' ? 'Admission No' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={activeTab === 'staged' ? 5 : 4} className="py-20 text-center">
                                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Fetching verification requests...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={activeTab === 'staged' ? 5 : 4} className="py-20 text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900">All Clear!</h3>
                                    <p className="text-sm text-gray-500 font-medium">No pending verification requests found.</p>
                                </td>
                            </tr>
                        ) : activeTab === 'staged' ? (stagedUsers.map((student: any) => (
                            <tr key={student.id} className="group hover:bg-gray-50/50 transition-all duration-300">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                                            {student.fullName?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 text-sm">{student.fullName}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ERP Master Record</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-700">
                                    {student.parentName || 'N/A'}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-700">
                                    {student.parentMobile || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <Badge variant="info" className="rounded-md px-1.5 py-0 text-[9px] mb-1">
                                            {student.grade}
                                        </Badge>
                                        <span className="text-[10px] text-gray-400 font-bold">{student.campusName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">
                                        {student.admissionNumber}
                                    </span>
                                </td>
                            </tr>
                        ))) : filteredUsers.map(user => (
                            <tr key={user.userId} className="group hover:bg-gray-50/50 transition-all duration-300">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                                            {user.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="font-black text-gray-900 text-sm">{user.fullName}</div>
                                                {(() => {
                                                    const normalize = (name: string) => {
                                                        return name
                                                            .toLowerCase()
                                                            .replace(/[^a-z0-9]/g, ' ') // Replace punctuation/special chars with space
                                                            .split(/\s+/)              // Split into words
                                                            .filter(w => w.length > 0)  // Remove empty strings
                                                            .sort()                   // Sort words alphabetically
                                                            .join('');                // Join into single string
                                                    };

                                                    const parentNorm = normalize(user.fullName);
                                                    const studentNameStr = user.childName || user.matchSuggestion?.studentName || '';
                                                    const studentNorm = normalize(studentNameStr);

                                                    if (!studentNorm || parentNorm === '') return false;

                                                    // Catch "R Aaradhana" vs "AARADHANA R" and "Lithisha . B" vs "LITHISHA B"
                                                    return parentNorm === studentNorm ||
                                                        (parentNorm.length > 3 && (parentNorm.includes(studentNorm) || studentNorm.includes(parentNorm)));
                                                })() && (
                                                        <div className="group/warn relative cursor-help">
                                                            <AlertCircle size={14} className="text-amber-500 animate-pulse" />
                                                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover/warn:opacity-100 transition-opacity pointer-events-none z-[100] shadow-xl">
                                                                <div className="font-black text-amber-400 mb-1">DATA ENTRY WARNING</div>
                                                                Parent/Student names are identical or highly similar (Initial/Order variation).
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant={user.role === 'Staff' ? 'info' : 'purple'} className="rounded-md px-1.5 py-0 text-[9px]">
                                                    {user.role}
                                                </Badge>
                                                <span className="text-[10px] text-gray-400 font-bold">{user.mobileNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {editingId === user.userId ? (
                                        <div className="grid grid-cols-2 gap-2 max-w-md">
                                            <input
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={editForm.childEprNo}
                                                onChange={e => setEditForm({ ...editForm, childEprNo: e.target.value })}
                                                placeholder="ERP No"
                                            />
                                            <input
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={editForm.childName}
                                                onChange={e => setEditForm({ ...editForm, childName: e.target.value })}
                                                placeholder="Name"
                                            />
                                            <select
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={editForm.grade}
                                                onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                                            >
                                                <option value="">Grade</option>
                                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                            <select
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={editForm.childCampusId}
                                                onChange={e => setEditForm({ ...editForm, childCampusId: e.target.value })}
                                            >
                                                <option value="">Campus</option>
                                                {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                {user.childName || (user.matchSuggestion ? (
                                                    <span className="text-emerald-600 flex items-center gap-1">
                                                        <Check size={14} />
                                                        {user.matchSuggestion.studentName}
                                                    </span>
                                                ) : 'N/A')}
                                                {user.childEprNo && (
                                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">
                                                        {user.childEprNo}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    {user.grade || user.matchSuggestion?.grade || 'No Grade'}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    {(user.assignedCampus && user.assignedCampus !== 'Global') ? user.assignedCampus : (user.matchSuggestion?.campus || 'Unassigned')}
                                                </span>
                                            </div>
                                            {!user.childName && user.matchSuggestion && (
                                                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter flex items-center gap-0.5">
                                                    <Database size={10} /> Smart Suggestion (Found in ERP)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.childInAchariya === true ? (
                                        <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                                            Pending Verification
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {editingId === user.userId ? (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(user.userId, true)}
                                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm"
                                                    title="Save & Approve"
                                                    disabled={!!processing}
                                                >
                                                    <Save size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-all border border-gray-100"
                                                    title="Cancel"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEdit(user)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 bg-white"
                                                    title="Edit Details"
                                                    suppressHydrationWarning
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {(activeTab === 'pending' || (activeTab === 'verified' && !user.childName && user.matchSuggestion)) && (
                                                    <button
                                                        onClick={() => handleApprove(user.userId, false, user.matchSuggestion)}
                                                        className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all border border-emerald-100 bg-white"
                                                        title={activeTab === 'verified' ? "Sync Student Name" : "Quick Approve"}
                                                        disabled={!!processing && processing === user.userId}
                                                        suppressHydrationWarning
                                                    >
                                                        {processing === user.userId ? <Loader2 className="animate-spin" size={14} /> : (activeTab === 'verified' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <CheckCircle2 size={14} />)}
                                                    </button>
                                                )}
                                                {activeTab === 'pending' && (
                                                    <button
                                                        onClick={() => handleReject(user.userId)}
                                                        className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition-all border border-red-100 bg-white"
                                                        title="Reject Request"
                                                        disabled={!!processing && processing === user.userId}
                                                        suppressHydrationWarning
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Showing {((page - 1) * 50) + 1}-{Math.min(page * 50, totalRecords)} of {totalRecords}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let pageNum = page
                                    if (totalPages <= 5) pageNum = i + 1
                                    else if (page <= 3) pageNum = i + 1
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                                    else pageNum = page - 2 + i

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === pageNum ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showRejectConfirm}
                title="Reject Request"
                description="Are you sure you want to reject this verification request? This will disable beneficiary benefits for this user."
                confirmText="Confirm Rejection"
                onConfirm={confirmReject}
                onCancel={() => setShowRejectConfirm(false)}
            />

            {showBulkUpload && (
                <CSVUploader
                    onClose={() => setShowBulkUpload(false)}
                    type="students"
                    onUpload={async (data) => {
                        const res = await bulkAddStudents(data)
                        if (res.success) {
                            toast.success(`Upload Successful: Added ${res.added} students.`)
                            loadData()
                        }
                        return res
                    }}
                />
            )}
        </div>
    )
}
