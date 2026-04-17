import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Phone, MapPin, Calendar, CreditCard, Hash, Shield, Key, Clock, AlertCircle, CheckCircle, Pencil, Trash2, IndianRupee, RefreshCcw } from 'lucide-react'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getGradeFee, revertReferralConfirmation, revertReferralRejection, getCampusGrades } from '@/app/admin-actions'
import { GRADES } from '@/lib/constants'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ReferralDetailPanelProps {
    referral: any | null
    onClose: () => void
    onUpdate: (id: number, data: any) => Promise<any>
    onConfirm?: (id: number, erp: string, feeType: 'OTP' | 'WOTP', admFee?: number, donFee?: number, annualFee?: number, academicYear?: string) => Promise<any>
    onReject?: (id: number, reason: string) => Promise<any>
    onDelete?: (id: number) => Promise<any>
    campuses?: any[]
    isSuperAdmin?: boolean
}

export function ReferralDetailPanel({
    referral,
    onClose,
    onUpdate,
    onConfirm,
    onReject,
    onDelete,
    campuses = [],
    isSuperAdmin = false
}: ReferralDetailPanelProps) {
    const [isConfirming, setIsConfirming] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [confirmForm, setConfirmForm] = useState({
        erp: '',
        feeType: 'OTP' as 'OTP' | 'WOTP',
        admFee: 0,
        donFee: 0,
        annualFee: 0
    })
    const [editForm, setEditForm] = useState({
        studentName: '',
        parentName: '',
        parentMobile: '',
        gradeInterested: '',
        campus: '',
        admittedYear: ''
    })
    const [loading, setLoading] = useState(false)
    const [standardFees, setStandardFees] = useState<{ otp: number | null, wotp: number | null }>({ otp: null, wotp: null })
    const [fetchingFees, setFetchingFees] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [availableGrades, setAvailableGrades] = useState<string[]>([...GRADES])
    const [fetchingGrades, setFetchingGrades] = useState(false)

    // Special Logic Campuses (No admission/donation fees)
    const isSpecialCampus = ['ACET', 'AASC', 'ACCHM'].includes(referral?.campus || '')

    // Reset local state when referral changes
    useEffect(() => {
        if (referral) {
            setConfirmForm({
                erp: referral.admissionNumber || '',
                feeType: (referral.selectedFeeType as any) || 'OTP',
                admFee: referral.admissionFeeCollected || 0,
                donFee: referral.donationFeeCollected || 0,
                annualFee: referral.annualFee || 0
            })
            setEditForm({
                studentName: referral.studentName || '',
                parentName: referral.parentName || '',
                parentMobile: referral.parentMobile || '',
                gradeInterested: referral.gradeInterested || '',
                campus: referral.campus || '',
                admittedYear: referral.admittedYear || '2026-2027'
            })
            setIsConfirming(false)
            setIsRejecting(false)
            setIsEditing(false)
            setRejectionReason('')

            // Fetch standard fees for this campus/grade
            if (!isSpecialCampus && referral.campus && referral.gradeInterested) {
                setFetchingFees(true)
                getGradeFee(referral.campus, referral.gradeInterested, referral.admittedYear || '2026-2027')
                    .then(res => {
                        console.log('DEBUG: getGradeFee response:', res) // [DEBUG LOG]
                        if (res.success && res.fees) {
                            setStandardFees(res.fees)

                            // AUTO-POPULATE: If current annualFee is 0, set it based on current feeType
                            setConfirmForm(prev => {
                                // Only update if annualFee is missing/zero to avoid overwriting user edits (if any)
                                // But on first open, it's usually 0.
                                if (!prev.annualFee) {
                                    const type = prev.feeType as 'OTP' | 'WOTP'
                                    const autoFee = type === 'OTP' ? (res.fees?.otp || 0) : (res.fees?.wotp || 0)
                                    return { ...prev, annualFee: autoFee }
                                }
                                return prev
                            })
                        } else {
                            console.warn('Could not fetch standard fees:', res.error)
                        }
                    })
                    .finally(() => setFetchingFees(false))
            }

            // Fetch available grades for this campus
            if (referral.campus) {
                setFetchingGrades(true)
                getCampusGrades(referral.campus)
                    .then(res => {
                        if (res.success && res.grades && res.grades.length > 0) {
                            setAvailableGrades(res.grades)
                        } else {
                            setAvailableGrades([...GRADES]) // Fallback
                        }
                    })
                    .finally(() => setFetchingGrades(false))
            }
        }
    }, [referral, isSpecialCampus])

    // Fetch grades when campus is changed in Edit Mode
    useEffect(() => {
        if (isEditing && editForm.campus) {
            setFetchingGrades(true)
            getCampusGrades(editForm.campus)
                .then(res => {
                    if (res.success && res.grades && res.grades.length > 0) {
                        setAvailableGrades(res.grades)
                    } else {
                        setAvailableGrades([...GRADES]) // Fallback
                    }
                })
                .finally(() => setFetchingGrades(false))
        }
    }, [editForm.campus, isEditing])

    // Handle body scroll locking when panel is open
    useEffect(() => {
        if (referral) {
            const html = document.documentElement
            const body = document.body
            html.classList.add('no-scroll')
            body.classList.add('no-scroll')
            return () => {
                html.classList.remove('no-scroll')
                body.classList.remove('no-scroll')
            }
        }
    }, [referral])

    if (!referral) return null

    const handleConfirm = async () => {
        if (!confirmForm.erp) {
            toast.error('ERP Number is required for confirmation')
            return
        }

        if (!isSpecialCampus) {
            if (!confirmForm.feeType) {
                toast.error('Fee Plan is required')
                return
            }
            if (!confirmForm.admFee && confirmForm.admFee !== 0) {
                toast.error('Admission Fee is required')
                return
            }
            if (!confirmForm.donFee && confirmForm.donFee !== 0) {
                toast.error('Donation Fee is required')
                return
            }
        }

        setLoading(true)
        try {
            // Pass manual annual fee override to action
            const res = await onConfirm?.(referral.leadId, confirmForm.erp, confirmForm.feeType, confirmForm.admFee, confirmForm.donFee, confirmForm.annualFee, editForm.admittedYear)
            if (res?.success) {
                toast.success('Referral confirmed successfully')
                onClose()
            } else {
                toast.error(res?.error || 'Failed to confirm referral')
            }
        } catch (error) {
            toast.error('An error occurred during confirmation')
        } finally {
            setLoading(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionReason || rejectionReason.trim().length < 3) {
            toast.error('Please provide a valid rejection reason (min 3 chars)')
            return
        }
        setLoading(true)
        try {
            const res = await onReject?.(referral.leadId, rejectionReason)
            if (res?.success) {
                toast.success('Lead rejected')
                onClose()
            } else {
                toast.error(res?.error || 'Rejection failed')
            }
        } catch (error) {
            toast.error('Rejection failed')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (newStatus: string) => {
        setLoading(true)
        try {
            const res = await onUpdate(referral.leadId, { leadStatus: newStatus })
            if (res?.success) {
                toast.success('Status updated')
            } else {
                toast.error(res?.error || 'Update failed')
            }
        } catch (error) {
            toast.error('Update failed')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveEdit = async () => {
        if (!editForm.studentName || !editForm.parentName || !editForm.parentMobile) {
            toast.error('All fields are required')
            return
        }
        setLoading(true)
        try {
            const res = await onUpdate?.(referral.leadId, {
                studentName: editForm.studentName,
                parentName: editForm.parentName,
                parentMobile: editForm.parentMobile,
                gradeInterested: editForm.gradeInterested,
                campus: editForm.campus,
                admittedYear: editForm.admittedYear
            })
            if (res?.success) {
                toast.success('Details updated successfully')
                setIsEditing(false)
            } else {
                toast.error(res?.error || 'Update failed')
            }
        } catch (error) {
            toast.error('Update failed')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        setShowDeleteConfirm(false)
        setLoading(true)
        try {
            const res = await onDelete?.(referral.leadId)
            if (res?.success) {
                toast.success('Lead deleted')
                onClose()
            } else {
                toast.error(res?.error || 'Delete failed')
            }
        } catch (error) {
            toast.error('Delete failed')
        } finally {
            setLoading(false)
        }
    }

    const getStatusStep = (status: string) => {
        switch (status) {
            case 'New': return 1
            case 'Contacted': return 2
            case 'Interested': return 3
            case 'Confirmed': return 4
            default: return 0
        }
    }

    const currentStep = getStatusStep(referral.leadStatus)

    const handleRevert = async () => {
        if (!confirm('Are you sure you want to revert this confirmation? The status will be reset to New and the ambassador benefit count will be decreased.')) return

        setLoading(true)
        try {
            const res = await revertReferralConfirmation(referral.leadId)
            if (res.success) {
                toast.success('Confirmation reverted successfully')
                window.location.reload()
            } else {
                toast.error(res.error || 'Failed to revert')
            }
        } catch (error) {
            toast.error('Revert failed')
        } finally {
            setLoading(false)
        }
    }

    const handleRevertRejection = async () => {
        if (!confirm('Are you sure you want to revert this rejection? The status will be reset to New.')) return

        setLoading(true)
        try {
            const res = await revertReferralRejection(referral.leadId)
            if (res.success) {
                toast.success('Rejection reverted successfully')
                window.location.reload()
            } else {
                toast.error(res.error || 'Failed to revert rejection')
            }
        } catch (error) {
            toast.error('Revert failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex justify-end" key="referral-modal">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Main Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner">
                                    <User size={32} className="text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tight">
                                        {referral.studentName || 'New Lead'}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${referral.leadStatus === 'Admitted' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                referral.leadStatus === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    referral.leadStatus === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                            }`} suppressHydrationWarning>
                                            {referral.leadStatus}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">•</span>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            {referral.campus || 'Global'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} aria-label="Close panel" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Status Stepper */}
                        {referral.leadStatus !== 'Rejected' && referral.leadStatus !== 'Confirmed' && referral.leadStatus !== 'Admitted' && (
                            <div className="flex items-center justify-between mb-6 px-2 relative">
                                {/* Connector Line */}
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-100 -z-10" />

                                {/* Steps */}
                                {['New', 'Contacted', 'Interested', 'Confirmed'].map((step, idx) => {
                                    const stepNum = idx + 1
                                    const isCompleted = stepNum <= currentStep
                                    const isActive = stepNum === currentStep

                                    return (
                                        <div key={step} className="flex flex-col items-center gap-2 bg-white px-2">
                                            <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCompleted ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-200'
                                                }`} />
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-gray-300'
                                                }`}>
                                                {step}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Referrer</p>
                                <p className="text-sm font-black mt-0.5 text-gray-900 truncate">
                                    {referral.user?.fullName}
                                </p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan</p>
                                <p className="text-sm font-black mt-0.5 text-red-600">
                                    {referral.selectedFeeType || 'Not Set'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar-panel p-8 space-y-10 min-h-0">
                        {/* Lead Breakdown */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Lead Breakdown</h3>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Pencil size={12} />
                                        Edit Details
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={loading}
                                            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            {loading ? <Clock size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                    <div className="space-y-2 col-span-2">
                                        <label htmlFor="edit-student-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</label>
                                        <input
                                            id="edit-student-name"
                                            type="text"
                                            value={editForm.studentName}
                                            onChange={e => setEditForm({ ...editForm, studentName: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="edit-parent-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent Name</label>
                                        <input
                                            id="edit-parent-name"
                                            type="text"
                                            value={editForm.parentName}
                                            onChange={e => setEditForm({ ...editForm, parentName: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="edit-parent-mobile" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</label>
                                        <input
                                            id="edit-parent-mobile"
                                            type="text"
                                            value={editForm.parentMobile}
                                            onChange={e => setEditForm({ ...editForm, parentMobile: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label htmlFor="edit-grade" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade Interested</label>
                                        <select
                                            id="edit-grade"
                                            value={editForm.gradeInterested}
                                            onChange={e => setEditForm({ ...editForm, gradeInterested: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        >
                                            <option value="">-- Select Grade --</option>
                                            {availableGrades.map(grade => (
                                                <option key={grade} value={grade}>{grade}</option>
                                            ))}
                                        </select>
                                        {fetchingGrades && <span className="text-[9px] text-indigo-500 animate-pulse">Updating grades...</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="edit-campus" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interested Campus</label>
                                        <select
                                            id="edit-campus"
                                            value={editForm.campus}
                                            onChange={e => setEditForm({ ...editForm, campus: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        >
                                            <option value="">-- Select Campus --</option>
                                            {campuses.map((c: any) => (
                                                <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="edit-academic-year" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic Year</label>
                                        <select
                                            id="edit-academic-year"
                                            value={editForm.admittedYear || '2026-2027'}
                                            onChange={e => setEditForm({ ...editForm, admittedYear: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        >
                                            <option value="2026-2027">2026-2027</option>
                                            <option value="2025-2026">2025-2026</option>
                                            <option value="2024-2025">2024-2025</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <User size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Parent Name</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 pl-6 uppercase tracking-tight">
                                            {referral.parentName}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Phone size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Mobile</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 pl-6">
                                            {referral.parentMobile}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <MapPin size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Grade</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 pl-6">
                                            {referral.gradeInterested || 'Not Specified'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Calendar size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Created</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 pl-6" suppressHydrationWarning>
                                            {format(new Date(referral.createdAt), 'dd MMM yyyy')}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Calendar size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Academic Year</span>
                                        </div>
                                        <p className="text-sm font-bold text-indigo-600 pl-6">
                                            {referral.admittedYear || 'Not Set'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Referrer Context */}
                        <section>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Referrer Context</h3>
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                                        <Shield size={20} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {referral.user?.role}
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">{referral.user?.fullName}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono font-black text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200">
                                    #{referral.user?.referralCode}
                                </span>
                            </div>
                        </section>

                        {/* Confirmation Form (Conditional) */}
                        {referral.leadStatus !== 'Confirmed' && referral.leadStatus !== 'Admitted' && referral.leadStatus !== 'Rejected' && (
                            <section className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Confirm Admission</h3>
                                    <button
                                        onClick={() => setIsConfirming(!isConfirming)}
                                        className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
                                    >
                                        {isConfirming ? 'Close Form' : 'Open Form'}
                                    </button>
                                </div>

                                {isConfirming && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label htmlFor="confirm-erp" className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">ERP / Admission Number *</label>
                                                <input
                                                    id="confirm-erp"
                                                    type="text"
                                                    value={confirmForm.erp}
                                                    onChange={e => setConfirmForm({ ...confirmForm, erp: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                    placeholder="Enter ERP Number"
                                                />
                                            </div>
                                            {!isSpecialCampus && (
                                                <>
                                                    <div>
                                                        <label htmlFor="confirm-fee-plan" className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Fee Plan *</label>
                                                        <select
                                                            id="confirm-fee-plan"
                                                            value={confirmForm.feeType}
                                                            onChange={e => {
                                                                const newType = e.target.value as 'OTP' | 'WOTP'
                                                                let newAnnualFee = confirmForm.annualFee
                                                                // Only auto-update if standard fees are available
                                                                if (standardFees.otp || standardFees.wotp) {
                                                                    newAnnualFee = newType === 'OTP' ? (standardFees.otp || 0) : (standardFees.wotp || 0)
                                                                }
                                                                setConfirmForm({ ...confirmForm, feeType: newType, annualFee: newAnnualFee })
                                                            }}
                                                            className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                        >
                                                            <option value="OTP">OTP Plan</option>
                                                            <option value="WOTP">WOTP Plan</option>
                                                        </select>
                                                    </div>

                                                    {/* [NEW] Editable Annual Fee Override */}
                                                    <div>
                                                        <label htmlFor="confirm-annual-fee" className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Annual Fee (Override) *</label>
                                                        <div className="relative">
                                                            <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                id="confirm-annual-fee"
                                                                type="number"
                                                                value={confirmForm.annualFee}
                                                                onChange={e => setConfirmForm({ ...confirmForm, annualFee: parseInt(e.target.value) || 0 })}
                                                                className="w-full pl-8 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                                placeholder="Enter Final Annual Fee"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="confirm-adm-fee" className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Admission Fee *</label>
                                                        <div className="relative">
                                                            <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                id="confirm-adm-fee"
                                                                type="number"
                                                                value={confirmForm.admFee}
                                                                onChange={e => setConfirmForm({ ...confirmForm, admFee: parseInt(e.target.value) || 0 })}
                                                                className="w-full pl-8 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="confirm-don-fee" className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Donation Fee *</label>
                                                        <div className="relative">
                                                            <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                id="confirm-don-fee"
                                                                type="number"
                                                                value={confirmForm.donFee}
                                                                onChange={e => setConfirmForm({ ...confirmForm, donFee: parseInt(e.target.value) || 0 })}
                                                                className="w-full pl-8 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={loading}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Processing...' : 'Complete Confirmation'}
                                        </button>
                                    </div>
                                )}
                            </section>

                        )}

                        {/* Confirmation Details (If Confirmed/Admitted) */}
                        {(referral.leadStatus === 'Confirmed' || referral.leadStatus === 'Admitted') && (
                            <section className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Admission Details</h3>
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <Pencil size={12} />
                                            Edit
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setLoading(true)
                                                    try {
                                                        const res = await onUpdate(referral.leadId, {
                                                            admissionNumber: confirmForm.erp,
                                                            selectedFeeType: confirmForm.feeType,
                                                            admissionFeeCollected: confirmForm.admFee,
                                                            donationFeeCollected: confirmForm.donFee,
                                                            annualFee: confirmForm.annualFee
                                                        })
                                                        if (res?.success) {
                                                            toast.success('Admission details updated')
                                                            setIsEditing(false)
                                                        } else {
                                                            toast.error(res?.error || 'Update failed')
                                                        }
                                                    } catch (error) {
                                                        toast.error('Update failed')
                                                    } finally {
                                                        setLoading(false)
                                                    }
                                                }}
                                                disabled={loading}
                                                className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                {loading ? <Clock size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                Save
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Edit Mode */}
                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">ERP Number *</label>
                                            <input
                                                type="text"
                                                value={confirmForm.erp}
                                                onChange={e => setConfirmForm({ ...confirmForm, erp: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                placeholder="Enter ERP Number"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="edit-confirm-fee-plan" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">Fee Plan *</label>
                                            <select
                                                id="edit-confirm-fee-plan"
                                                value={confirmForm.feeType}
                                                onChange={e => {
                                                    const newType = e.target.value as 'OTP' | 'WOTP'
                                                    // Auto-update annual fee based on standard fees if available
                                                    let newAnnualFee = confirmForm.annualFee
                                                    if (standardFees.otp || standardFees.wotp) {
                                                        newAnnualFee = newType === 'OTP' ? (standardFees.otp || 0) : (standardFees.wotp || 0)
                                                    }
                                                    setConfirmForm({ ...confirmForm, feeType: newType, annualFee: newAnnualFee })
                                                }}
                                                className="w-full px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                            >
                                                <option value="OTP">OTP Plan</option>
                                                <option value="WOTP">WOTP Plan</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="edit-confirm-annual-fee" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">Annual Fee</label>
                                            <div className="relative">
                                                <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    id="edit-confirm-annual-fee"
                                                    type="number"
                                                    value={confirmForm.annualFee}
                                                    onChange={e => setConfirmForm({ ...confirmForm, annualFee: parseInt(e.target.value) || 0 })}
                                                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="edit-confirm-adm-fee" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">Admission Fee</label>
                                            <div className="relative">
                                                <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    id="edit-confirm-adm-fee"
                                                    type="number"
                                                    value={confirmForm.admFee}
                                                    onChange={e => setConfirmForm({ ...confirmForm, admFee: parseInt(e.target.value) || 0 })}
                                                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="edit-confirm-don-fee" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">Donation Fee</label>
                                            <div className="relative">
                                                <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    id="edit-confirm-don-fee"
                                                    type="number"
                                                    value={confirmForm.donFee}
                                                    onChange={e => setConfirmForm({ ...confirmForm, donFee: parseInt(e.target.value) || 0 })}
                                                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Read Only View */}
                                        <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase">ERP Number</p>
                                            <p className="text-sm font-black text-emerald-900 font-mono mt-0.5">{referral.admissionNumber}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase">Plan Type</p>
                                            <p className="text-sm font-black text-emerald-900 mt-0.5">{referral.selectedFeeType}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase">Annual Fee</p>
                                            <p className="text-sm font-black text-emerald-900 mt-0.5">₹{(referral.annualFee || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase">Fees Collected</p>
                                            <p className="text-sm font-black text-emerald-900 mt-0.5">₹{((referral.admissionFeeCollected || 0) + (referral.donationFeeCollected || 0)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Tracking Timeline */}
                        <section className="pb-8">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Tracking Timeline</h3>
                            <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                                <div className="relative">
                                    <div className="absolute -left-8 top-1.5 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                                        <Clock size={12} className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900 uppercase">Lead Created</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5" suppressHydrationWarning>
                                            {format(new Date(referral.createdAt), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                {['Contacted', 'Interested', 'Confirmed'].map((step, idx) => {
                                    const stepNum = idx + 2 // 1 is Created
                                    if (currentStep >= stepNum) {
                                        return (
                                            <div key={step} className="relative">
                                                <div className={`absolute -left-8 top-1.5 w-6 h-6 bg-white border-2 rounded-full flex items-center justify-center shadow-sm z-10 ${step === 'Confirmed' ? 'border-emerald-500' : 'border-indigo-500'}`}>
                                                    <CheckCircle size={12} className={step === 'Confirmed' ? 'text-emerald-500' : 'text-indigo-500'} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase">{step}</p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                })}
                                {referral.leadStatus === 'Rejected' && (
                                    <div className="relative">
                                        <div className="absolute -left-8 top-1.5 w-6 h-6 bg-white border-2 border-red-500 rounded-full flex items-center justify-center shadow-sm z-10">
                                            <AlertCircle size={12} className="text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 uppercase">Lead Rejected</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                Reason: {referral.rejectionReason || 'Manually rejected by admin'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-3">
                        {isRejecting ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Reason for Rejection *</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    placeholder="e.g. Invalid mobile number, Not interested etc."
                                    className="w-full px-4 py-3 bg-white border border-red-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500/20 outline-none min-h-[100px]"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setIsRejecting(false)}
                                        className="py-3.5 px-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={loading}
                                        className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Rejecting...' : 'Confirm Rejection'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Confirmed Lead Actions */}
                                    {referral.leadStatus === 'Confirmed' && (
                                        <div className="col-span-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                                    <CheckCircle size={16} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-emerald-900 uppercase">Admission Confirmed</p>
                                                    <p className="text-[10px] font-bold text-emerald-600">
                                                        {referral.confirmedDate ? format(new Date(referral.confirmedDate), 'MMM dd, yyyy') : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {isSuperAdmin && (
                                                <button
                                                    onClick={handleRevert}
                                                    disabled={loading}
                                                    className="py-2 px-3 bg-white border border-red-200 text-red-500 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {loading ? <Clock size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                                                    Revert
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {referral.leadStatus === 'Rejected' && isSuperAdmin && (
                                        <div className="col-span-2 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                                    <AlertCircle size={16} className="text-red-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-red-900 uppercase">Rejected Lead</p>
                                                    <p className="text-[10px] font-bold text-red-600 truncate max-w-[200px]">
                                                        {referral.rejectionReason || 'No reason specified'}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleRevertRejection}
                                                disabled={loading}
                                                className="py-2 px-3 bg-white border border-red-200 text-red-500 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Clock size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                                                Revert Rejection
                                            </button>
                                        </div>
                                    )}

                                    {/* Dynamic Primary Action */}
                                    {referral.leadStatus === 'New' && (
                                        <button
                                            onClick={() => handleStatusUpdate('Contacted')}
                                            className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            Contacted
                                        </button>
                                    )}

                                    {referral.leadStatus === 'Contacted' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate('Interested')}
                                                className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                Interested
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate('Follow-up')}
                                                className="py-3 px-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                Follow Up
                                            </button>
                                        </>
                                    )}

                                    {referral.leadStatus === 'Interested' && (
                                        <>
                                            <button
                                                onClick={() => setIsConfirming(true)}
                                                className="py-3 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                Confirm Admission
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate('Follow-up')}
                                                className="py-3 px-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                Follow Up
                                            </button>
                                        </>
                                    )}

                                    {referral.leadStatus === 'Follow-up' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate('Interested')}
                                                className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                Interested
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate('Contacted')}
                                                className="py-3 px-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                Contacted
                                            </button>
                                        </>
                                    )}

                                    {/* Reject / Close Lead */}
                                    {referral.leadStatus !== 'Rejected' && referral.leadStatus !== 'Confirmed' && (
                                        <button
                                            onClick={() => setIsRejecting(true)}
                                            className="col-span-1 py-3 px-3 bg-white border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                                {isSuperAdmin && (
                                    <div className="pt-2 flex justify-center">
                                        <button
                                            onClick={handleDelete}
                                            className="text-gray-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors py-1"
                                        >
                                            <Trash2 size={12} /> Permanent Delete
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Lead?"
                description="Are you sure you want to permanently delete this lead? This action cannot be undone."
                confirmText="Yes, Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </AnimatePresence>
    )
}
