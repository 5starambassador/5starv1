'use client'

import { useState, useEffect, useRef } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Edit2, Search, Database, Globe, Loader2, Save, Clock, GraduationCap, Building, User as UserIcon, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getPendingVerifications, getVerifiedUsers, approveVerification, rejectVerification, bulkVerifyAgainstDatabase } from '@/app/verification-actions'
import { getCampuses } from '@/app/campus-actions'
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
    const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending')
    const [pendingUsers, setPendingUsers] = useState<any[]>(initialData || [])
    const [verifiedUsers, setVerifiedUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<number | null>(null)
    const [isBulking, setIsBulking] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [showRejectConfirm, setShowRejectConfirm] = useState(false)
    const [rejectUserId, setRejectUserId] = useState<number | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCampus, setFilterCampus] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [campuses, setCampuses] = useState<any[]>([])
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [activeFilter, setActiveFilter] = useState<'campus' | 'grade' | 'role' | null>(null)
    const [verifiedCountToday, setVerifiedCountToday] = useState(0)
    const [serverPotentialMatches, setServerPotentialMatches] = useState(0)
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

    // Edit Form State
    const [editForm, setEditForm] = useState({
        childEprNo: '',
        grade: '',
        childCampusId: '',
        childName: ''
    })

    const [selectedUserIdForReject, setSelectedUserIdForReject] = useState<number | null>(null)

    const loadData = async () => {
        setLoading(true)
        const resPending = await getPendingVerifications()
        if (resPending.success) {
            setPendingUsers(resPending.data || [])
            setVerifiedCountToday(resPending.verifiedToday || 0)
            setServerPotentialMatches(resPending.potentialMatches || 0)
        }

        const resVerified = await getVerifiedUsers()
        if (resVerified.success) {
            setVerifiedUsers(resVerified.data || [])
        }
        setLoading(false)
    }

    const loadCampuses = async () => {
        const res = await getCampuses()
        if (res.success) setCampuses(res.campuses || [])
    }

    useEffect(() => {
        loadData()
        loadCampuses()
    }, [])

    const handleApprove = async (userId: number, withEdits = false) => {
        setProcessing(userId)

        const payload = withEdits ? {
            childEprNo: editForm.childEprNo,
            grade: editForm.grade,
            childCampusId: parseInt(editForm.childCampusId),
            childName: editForm.childName
        } : undefined

        const res = await approveVerification(userId, payload)

        if (res.success) {
            toast.success('User verified successfully')
            setEditingId(null)
            loadData() // Refresh list and stats (Matches, Today, Pending)
        } else {
            toast.error(res.error || 'Verification failed')
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

    const startEdit = (user: any) => {
        setEditingId(user.userId)
        setEditForm({
            childEprNo: user.childEprNo || '',
            grade: user.grade || '',
            childCampusId: user.childCampusId ? user.childCampusId.toString() : '',
            childName: user.childName || ''
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
    }

    // Filter State
    // Filter Logic
    const currentUsers = activeTab === 'pending' ? pendingUsers : verifiedUsers

    // Derived Stats
    const stats = {
        pending: pendingUsers.length,
        verified: verifiedUsers.length,
        staff: currentUsers.filter(u => u.role === 'Staff').length,
        parents: currentUsers.filter(u => u.role === 'Parent').length,
        matched: serverPotentialMatches || pendingUsers.filter(u => u.childEprNo && u.childEprNo.length > 3).length
    }

    const filteredUsers = currentUsers.filter(user => {
        const matchesSearch = (
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.mobileNumber?.includes(searchTerm) ||
            user.childEprNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.childName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        const matchesCampus = filterCampus ? (user.assignedCampus === filterCampus || user.campusId?.toString() === filterCampus) : true
        const matchesRole = filterRole ? user.role === filterRole : true

        return matchesSearch && matchesCampus && matchesRole
    })

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
                        <h4 className="text-2xl font-black text-gray-900 leading-none" suppressHydrationWarning>{verifiedCountToday || '--'}</h4>
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
                        >
                            Pending
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                                {stats.pending}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('verified')}
                            className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all z-10 ${activeTab === 'verified' ? "text-white shadow-md bg-emerald-500" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Verified
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'verified' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                                {stats.verified}
                            </span>
                        </button>
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search name, ERP, or mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
                                options={uniqueCampuses as string[]}
                                onApply={(vals) => setFilterCampus(vals[0] || '')}
                                onClose={() => setActiveFilter(null)}
                            />
                        )}
                    </div>

                    <div className="relative" ref={roleFilterRef}>
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
                                onApply={(vals) => setFilterRole(vals[0] || '')}
                                onClose={() => setActiveFilter(null)}
                            />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
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

            {/* Verification List - Table View */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Child Details</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Benefit Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center">
                                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Fetching verification requests...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900">All Clear!</h3>
                                    <p className="text-sm text-gray-500 font-medium">No pending verification requests found.</p>
                                </td>
                            </tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.userId} className="group hover:bg-gray-50/50 transition-all duration-300">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                                            {user.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 text-sm">{user.fullName}</div>
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
                                                {user.childName || 'N/A'}
                                                {user.childEprNo && (
                                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">
                                                        {user.childEprNo}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    {user.grade || 'No Grade'}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    {user.assignedCampus || 'No Campus'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.benefitStatus === 'Active' ? (
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
                                                <button
                                                    onClick={() => handleApprove(user.userId)}
                                                    className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all border border-emerald-100 bg-white"
                                                    title="Quick Approve"
                                                    disabled={!!processing && processing === user.userId}
                                                    suppressHydrationWarning
                                                >
                                                    {processing === user.userId ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.userId)}
                                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition-all border border-red-100 bg-white"
                                                    title="Reject Request"
                                                    disabled={!!processing && processing === user.userId}
                                                    suppressHydrationWarning
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
