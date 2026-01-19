'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Edit2, Search, Database, Globe, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { getPendingVerifications, approveVerification, rejectVerification, bulkVerifyAgainstDatabase } from '@/app/verification-actions'
import { getCampuses } from '@/app/campus-actions'
import { GRADES } from '@/lib/constants'

interface VerificationQueueProps {
    initialData?: any[]
}

export default function VerificationQueue({ initialData = [] }: VerificationQueueProps) {
    const [users, setUsers] = useState<any[]>(initialData)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<number | null>(null)
    const [isBulking, setIsBulking] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [campuses, setCampuses] = useState<any[]>([])

    // Edit Form State
    const [editForm, setEditForm] = useState({
        childEprNo: '',
        grade: '',
        childCampusId: '',
        childName: ''
    })

    const loadData = async () => {
        setLoading(true)
        const res = await getPendingVerifications()
        if (res.success) {
            setUsers(res.data || [])
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
            setUsers(prev => prev.filter(u => u.userId !== userId))
            setEditingId(null)
        } else {
            toast.error(res.error || 'Verification failed')
        }
        setProcessing(null)
    }

    const handleReject = async (userId: number) => {
        if (!confirm('Are you sure you want to reject this request? It will revert benefits to default.')) return

        setProcessing(userId)
        const res = await rejectVerification(userId)

        if (res.success) {
            toast.success('Request rejected')
            setUsers(prev => prev.filter(u => u.userId !== userId))
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
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCampus, setFilterCampus] = useState('')
    const [filterRole, setFilterRole] = useState('')

    // Derived Filtered Data
    const filteredUsers = users.filter(user => {
        const matchesSearch = (
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.mobileNumber?.includes(searchTerm) ||
            user.childEprNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ('ERP-' + user.userId)?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        const matchesCampus = filterCampus ? (user.assignedCampus === filterCampus || user.campusId?.toString() === filterCampus) : true
        const matchesRole = filterRole ? user.role === filterRole : true

        return matchesSearch && matchesCampus && matchesRole
    })

    const uniqueCampuses = Array.from(new Set(users.map(u => u.assignedCampus).filter(Boolean)))

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Pending Verifications</h2>
                    <p className="text-sm text-gray-500">Verify beneficiary (staff/parent) child details manually or verify against student database.</p>
                </div>

                <button
                    onClick={handleBulkVerify}
                    disabled={isBulking || users.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {isBulking ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                    {isBulking ? 'Verifying...' : 'Auto-Verify (Database)'}
                </button>
            </div>

            {/* Dynamic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Name, ERP, Mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                </div>

                {/* Campus Filter */}
                <select
                    value={filterCampus}
                    onChange={(e) => setFilterCampus(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-700"
                >
                    <option value="">All Campuses</option>
                    {uniqueCampuses.map((c: any) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                {/* Role Filter */}
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-700"
                >
                    <option value="">All Roles</option>
                    <option value="Staff">Staff</option>
                    <option value="Parent">Parent</option>
                </select>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-20 flex justify-center text-gray-300">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-12 text-center border border-gray-200">
                    <Check className="mx-auto text-emerald-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchTerm || filterCampus || filterRole ? 'No matches found' : 'All Caught Up!'}
                    </h3>
                    <p className="text-gray-500">
                        {searchTerm || filterCampus || filterRole ? 'Try adjusting your filters.' : 'No pending verification requests found.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredUsers.map(user => (
                            <motion.div
                                key={user.userId}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all shadow-sm"
                            >
                                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">

                                    {/* User Info */}
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl border border-indigo-100">
                                            {user.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{user.fullName}</h3>
                                            <p className="text-xs text-gray-500">{user.role} • {user.assignedCampus || 'No Campus'}</p>
                                            <p className="text-xs text-indigo-600 font-mono mt-0.5">{user.mobileNumber}</p>
                                        </div>
                                    </div>

                                    {/* Details / Edit Form */}
                                    <div className="flex-1 w-full lg:w-auto">
                                        {editingId === user.userId ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <input
                                                    placeholder="ERP No"
                                                    value={editForm.childEprNo}
                                                    onChange={e => setEditForm({ ...editForm, childEprNo: e.target.value })}
                                                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                                <input
                                                    placeholder="Child Name"
                                                    value={editForm.childName}
                                                    onChange={e => setEditForm({ ...editForm, childName: e.target.value })}
                                                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                                <select
                                                    value={editForm.grade}
                                                    onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                                                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="" className="text-gray-500">Select Grade</option>
                                                    {GRADES.map(g => (
                                                        <option key={g} value={g} className="text-gray-900">{g}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={editForm.childCampusId}
                                                    onChange={e => setEditForm({ ...editForm, childCampusId: e.target.value })}
                                                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="" className="text-gray-500">Select Campus</option>
                                                    {campuses.map(c => (
                                                        <option key={c.id} value={c.id} className="text-gray-900">{c.campusName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold">ERP No</p>
                                                    <p className="text-sm font-mono text-gray-900">{user.childEprNo || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold">Child Name</p>
                                                    <p className="text-sm text-gray-900">{user.childName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold">Grade</p>
                                                    <p className="text-sm text-gray-900">{user.grade || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold">Status</p>
                                                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200 font-bold">Pending</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {editingId === user.userId ? (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(user.userId, true)}
                                                    disabled={!!processing}
                                                    className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                                                    title="Save & Approve"
                                                >
                                                    <Save size={18} />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors"
                                                    title="Cancel Edit"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEdit(user)}
                                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-100"
                                                    title="Edit Details"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(user.userId)}
                                                    disabled={!!processing}
                                                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-100"
                                                    title="Approve"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.userId)}
                                                    disabled={!!processing}
                                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-100"
                                                    title="Reject"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
