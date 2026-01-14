'use client'


import { CheckCircle, Filter, ChevronDown, Clock, AlertCircle, Phone, MapPin, User, Search, Square, CheckSquare, Trash, XCircle, Download, X, Pencil } from 'lucide-react'
import { useState, useMemo } from 'react'

import { toast } from 'sonner'
import { bulkRejectReferrals, bulkDeleteReferrals } from '@/app/admin-actions'

interface ReferralTableProps {
    referrals: any[]
    confirmReferral: (leadId: number, admissionNumber?: string, selectedFeeType?: 'OTP' | 'WOTP') => Promise<any>
    convertLeadToStudent?: (leadId: number, details: any) => Promise<any>
    initialRoleFilter?: string
    initialStatusFilter?: string
    isReadOnly?: boolean
    onBulkAdd?: () => void
}

export function ReferralTable({
    referrals,
    confirmReferral,
    convertLeadToStudent,
    initialRoleFilter,
    initialStatusFilter,
    isReadOnly = false,
    onBulkAdd
}: ReferralTableProps) {
    const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter || 'All')
    const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'All')
    const [campusFilter, setCampusFilter] = useState<string>('All')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Get unique values for filters
    const campuses = useMemo(() => {
        const uniqueCampuses = new Set(referrals.map(r => r.campus))
        return Array.from(uniqueCampuses).sort()
    }, [referrals])

    const [confirmModalOpen, setConfirmModalOpen] = useState(false)
    const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
    const [erpNumber, setErpNumber] = useState('')
    const [isConfirming, setIsConfirming] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false) // Track if we are editing an existing ERP #

    // Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Filtered referrals
    const filteredReferrals = useMemo(() => {
        return referrals.filter(r => {
            const matchesRole = roleFilter === 'All' || r.user.role === roleFilter
            const matchesStatus = statusFilter === 'All' || r.leadStatus === statusFilter
            const matchesCampus = campusFilter === 'All' || r.campus === campusFilter
            const matchesSearch = searchQuery === '' ||
                r.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.parentMobile.includes(searchQuery) ||
                r.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())

            return matchesRole && matchesStatus && matchesCampus && matchesSearch
        })
    }, [referrals, roleFilter, statusFilter, campusFilter, searchQuery])

    // Toggle Selection
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredReferrals.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredReferrals.map(r => r.leadId))
        }
    }

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleConfirmClick = (leadId: number, currentErp?: string) => {
        setSelectedLeadId(leadId)
        setErpNumber(currentErp || '')
        setIsEditMode(!!currentErp)
        setConfirmModalOpen(true)
    }

    // Bulk Actions Handlers
    const handleBulkReject = async () => {
        if (!confirm(`Are you sure you want to REJECT ${selectedIds.length} referrals?`)) return

        const tid = toast.loading('Rejecting referrals...')
        const res = await bulkRejectReferrals(selectedIds)
        if (res.success) {
            toast.success('Selected referrals rejected', { id: tid })
            setSelectedIds([])
        } else {
            toast.error(res.error || 'Failed to reject', { id: tid })
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} referrals? This cannot be undone.`)) return

        const tid = toast.loading('Deleting referrals...')
        const res = await bulkDeleteReferrals(selectedIds)
        if (res.success) {
            toast.success('Selected referrals deleted', { id: tid })
            setSelectedIds([])
        } else {
            toast.error(res.error || 'Failed to delete', { id: tid })
        }
    }

    const submitConfirm = async () => {
        if (!selectedLeadId) return
        if (!erpNumber.trim()) {
            toast.error('Student ERP Number is required')
            return
        }

        setIsConfirming(true)
        const tid = toast.loading(isEditMode ? 'Updating Info...' : 'Confirming Admission...')
        try {
            const res = await confirmReferral(selectedLeadId, erpNumber)
            if (res.success) {
                toast.success(isEditMode ? 'ERP Number Updated' : 'Lead Confirmed Successfully', { id: tid })
                setConfirmModalOpen(false)
            } else {
                toast.error(res.error || 'Operation Failed', { id: tid })
            }
        } catch (error) {
            toast.error('Unexpected error', { id: tid })
        }
        setIsConfirming(false)
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                        <User size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Active Referrals</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{filteredReferrals.length} Leads Found</p>
                    </div>
                </div>

                {onBulkAdd && !isReadOnly && (
                    <button
                        onClick={onBulkAdd}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-transform active:scale-95 shadow-lg shadow-gray-200"
                    >
                        <Download size={14} /> Bulk Import
                    </button>
                )}
            </div>
            <div className="space-y-6">
                {/* Filters */}
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[240px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by parent name or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium"
                        />
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="All">All Roles</option>
                        <option value="Parent">Parent</option>
                        <option value="Staff">Staff</option>
                    </select>

                    <select
                        value={campusFilter}
                        onChange={(e) => setCampusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="All">All Campuses</option>
                        {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        <option value="New">New</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Confirmed">Confirmed</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto pb-20"> {/* Extra padding for FAB */}
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                                        {selectedIds.length > 0 && selectedIds.length === filteredReferrals.length ? <CheckSquare size={20} className="text-red-600" /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Referrer</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Lead Details</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Campus</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredReferrals.map((r: any) => {
                                const isNew = r.leadStatus === 'New'
                                const createdDate = new Date(r.createdAt)
                                const hoursOld = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60)
                                const isUrgent = isNew && hoursOld > 48
                                const isSelected = selectedIds.includes(r.leadId)

                                return (
                                    <tr key={r.leadId} className={`transition-colors group ${isSelected ? 'bg-red-50/30' : 'hover:bg-gray-50/80'}`}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleSelect(r.leadId)} className="text-gray-400 hover:text-gray-600">
                                                {isSelected ? <CheckSquare size={20} className="text-red-600" /> : <Square size={20} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.user.role === 'Staff' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{r.user.fullName}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{r.user.referralCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${r.user.role === 'Staff' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                {r.user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900">{r.parentName}</p>
                                                    {isUrgent && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold uppercase">
                                                            <AlertCircle size={10} /> Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Show Grade/Section for context */}
                                                {(r.gradeInterested || r.section) && (
                                                    <p className="text-xs text-gray-500 font-medium ml-0.5">
                                                        {r.gradeInterested} {r.section ? `- ${r.section}` : ''}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Phone size={12} />
                                                        <span>{r.parentMobile}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        <span>
                                                            {hoursOld < 24 ? `${Math.round(hoursOld)}h ago` : `${Math.round(hoursOld / 24)}d ago`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1.5 text-gray-600">
                                                <MapPin size={14} className="text-gray-400" />
                                                <span className="text-sm font-medium">{r.campus || 'General'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${r.leadStatus === 'Confirmed' ? 'bg-green-500' : r.leadStatus === 'Follow-up' ? 'bg-amber-500' : 'bg-gray-400'}`}></div>
                                                <span className={`text-sm font-bold ${r.leadStatus === 'Confirmed' ? 'text-green-700' : r.leadStatus === 'Follow-up' ? 'text-amber-700' : 'text-gray-600'}`}>
                                                    {r.leadStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {r.leadStatus !== 'Confirmed' ? (
                                                !isReadOnly && (
                                                    <button
                                                        onClick={() => handleConfirmClick(r.leadId)}
                                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                                    >
                                                        Confirm
                                                    </button>
                                                )
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-1.5 text-green-600">
                                                        <span className="text-xs font-bold">Verified</span>
                                                        <CheckCircle size={16} />
                                                    </div>
                                                    {r.admissionNumber && (
                                                        <div className="group/edit flex items-center gap-1">
                                                            <span className="text-[10px] font-mono text-gray-500">
                                                                ERP: {r.admissionNumber}
                                                            </span>
                                                            {!isReadOnly && (
                                                                <button onClick={() => handleConfirmClick(r.leadId, r.admissionNumber)} className="opacity-0 group-hover/edit:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity">
                                                                    <Pencil size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Missing ERP Backfill Button */}
                                                    {!r.admissionNumber && !isReadOnly && (
                                                        <button onClick={() => handleConfirmClick(r.leadId)} className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 flex items-center gap-1 hover:bg-orange-100">
                                                            <Pencil size={10} /> Add ERP
                                                        </button>
                                                    )}

                                                    {r.student ? (
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                            In Student Mgmt
                                                        </span>
                                                    ) : (
                                                        convertLeadToStudent && !isReadOnly && (
                                                            <ConversionButton
                                                                leadId={r.leadId}
                                                                studentName={r.studentName || r.parentName + "'s Child"}
                                                                convertLeadToStudent={convertLeadToStudent}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredReferrals.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-400">
                                        <Filter size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-sm font-bold">No matching referrals found</p>
                                        <p className="text-xs">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Action Bar */}
            {selectedIds.length > 0 && !isReadOnly && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#1e293b] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-gray-700">
                        <div className="flex items-center gap-3 pr-6 border-r border-gray-600">
                            <div className="w-8 h-8 rounded-full bg-white text-gray-900 font-black flex items-center justify-center text-sm">
                                {selectedIds.length}
                            </div>
                            <span className="font-bold text-sm tracking-wide">Selected</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBulkReject}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm font-bold text-red-400 hover:text-red-300"
                            >
                                <XCircle size={18} />
                                REJECT
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm font-bold text-red-400 hover:text-red-300"
                            >
                                <Trash size={18} />
                                DELETE
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="ml-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}


            {/* Confirmation Modal */}
            {confirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{isEditMode ? 'Update ERP Number' : 'Confirm Admission'}</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                {isEditMode ? 'Update the Student ERP Number for this referral.' : 'Please enter the Student ERP/Admission Number to confirm this referral.'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Student ERP No <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-mono text-sm"
                                    placeholder="e.g. ADM2026001"
                                    value={erpNumber}
                                    onChange={(e) => setErpNumber(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={submitConfirm}
                                disabled={isConfirming || !erpNumber.trim()}
                                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${erpNumber.trim()
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30 hover:-translate-y-0.5'
                                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                                    }`}
                            >
                                {isConfirming ? 'Processing...' : (isEditMode ? 'Update Details' : 'Confirm Admission')}
                            </button>

                            <button
                                onClick={() => setConfirmModalOpen(false)}
                                disabled={isConfirming}
                                className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ConversionButton({ leadId, studentName, convertLeadToStudent }: { leadId: number, studentName: string, convertLeadToStudent: (id: number, details: any) => Promise<any> }) {
    const [isConverting, setIsConverting] = useState(false)

    return (
        <button
            onClick={async () => {
                if (isConverting) return

                const tid = toast.loading(`Converting ${studentName} to student...`)
                setIsConverting(true)
                try {
                    const res = await convertLeadToStudent(leadId, { studentName })
                    if (res.success) {
                        toast.success('Successfully added to students!', { id: tid })
                    } else {
                        toast.error(res.error || 'Conversion failed', { id: tid })
                        setIsConverting(false)
                    }
                } catch (error) {
                    toast.error('An unexpected error occurred', { id: tid })
                    setIsConverting(false)
                }
            }}
            disabled={isConverting}
            className={`px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-md transition-all uppercase tracking-tight flex items-center gap-2 ${isConverting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
            {isConverting ? (
                <>
                    <Clock size={12} className="animate-spin" />
                    Processing...
                </>
            ) : (
                'Add to Students'
            )}
        </button>
    )
}
