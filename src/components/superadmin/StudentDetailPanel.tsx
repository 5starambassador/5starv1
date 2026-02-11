import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Edit, Hash, School, GraduationCap, Percent, Wallet, Phone, Shield, ExternalLink, Calendar, MapPin, BadgeCheck, UserCheck, Edit2, Save, XCircle, AlertCircle, BookOpen, Clock, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { getGradesForCampus } from '@/lib/grade-utils'
import { getGradeFee } from '@/app/student-actions'
import { Student, User as UserType, Campus } from '@/types'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'

interface StudentDetailPanelProps {
    student: Student | null
    users: UserType[]
    campuses: Campus[]
    onClose: () => void
    onEdit: (student: Student) => void
    onUpdate?: (id: number, data: any) => Promise<{ success: boolean; error?: string }>
    onViewParent: (parentId: number) => void
}

export function StudentDetailPanel({ student, users, campuses, onClose, onEdit, onUpdate, onViewParent }: StudentDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'guardians' | 'timeline'>('overview')
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})

    // Reset edit state when student changes
    useEffect(() => {
        setIsEditing(false)
        if (student) {
            setEditForm({
                fullName: student.fullName,
                grade: student.grade,
                section: student.section,
                campusId: student.campusId.toString(),
                status: student.status,
                baseFee: student.baseFee,
                selectedFeeType: (student as any).selectedFeeType || 'WOTP',
                rollNumber: student.rollNumber,
                admissionNumber: student.admissionNumber
            })
        }
    }, [student])

    const handleSave = async () => {
        if (!onUpdate || !student) return
        toast.promise(
            async () => {
                const res = await onUpdate(student.studentId, {
                    ...editForm,
                    campusId: parseInt(editForm.campusId),
                    baseFee: parseInt(editForm.baseFee)
                })
                if (!res.success) throw new Error(res.error)
                setIsEditing(false)
            },
            {
                loading: 'Updating student...',
                success: 'Student updated successfully',
                error: (err) => err instanceof Error ? err.message : 'Failed to update'
            }
        )
    }

    const availableGrades = editForm.campusId ? getGradesForCampus(editForm.campusId, campuses) : []

    if (!student) return null

    const parent = users.find(u => u.userId === student.parentId)
    const campus = campuses.find(c => c.id === student.campusId)
    const ambassador = student.ambassador

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] transition-all duration-300"
            />

            {/* Panel */}
            <motion.div
                key="panel"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl border-l border-gray-100 z-[70] flex flex-col h-screen overflow-hidden"
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white flex justify-between items-start relative overflow-hidden">
                    <div className="flex gap-4 relative z-10 w-full overflow-hidden">
                        <div className="flex-none w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <GraduationCap size={32} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            {isEditing ? (
                                <input
                                    className="text-2xl font-black text-gray-900 border-b-2 border-indigo-100 focus:border-indigo-500 outline-none bg-transparent w-full"
                                    value={editForm.fullName}
                                    onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                />
                            ) : (
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase truncate leading-none">
                                    {student.fullName}
                                </h2>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${student.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    student.status === 'Graduated' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                        'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                    {student.status}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    • {campus?.campusName || 'Unknown Campus'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 bg-white">

                    {/* Student Profile Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <School size={14} /> Student Profile
                            </h3>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <Edit2 size={12} />
                                    Edit Details
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false)
                                            // Reset logic handled in useEffect
                                            if (student) setEditForm({
                                                fullName: student.fullName,
                                                grade: student.grade,
                                                section: student.section,
                                                campusId: student.campusId.toString(),
                                                status: student.status,
                                                baseFee: student.baseFee,
                                                selectedFeeType: (student as any).selectedFeeType || 'WOTP',
                                                rollNumber: student.rollNumber,
                                                admissionNumber: student.admissionNumber,
                                                academicYear: student.academicYear || '2025-2026',
                                                discountPercent: student.discountPercent
                                            })
                                        }}
                                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Save size={12} />
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`grid grid-cols-2 gap-4 ${isEditing ? 'bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50' : ''}`}>
                            {/* Academic Year */}
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Academic Year</label>
                                {isEditing ? (
                                    <select
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.academicYear}
                                        onChange={e => setEditForm({ ...editForm, academicYear: e.target.value })}
                                    >
                                        <option value="2024-2025">2024-2025</option>
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2026-2027">2026-2027</option>
                                    </select>
                                ) : (
                                    <p className="text-sm font-bold text-gray-900">{student.academicYear || '2025-2026'}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                                {isEditing ? (
                                    <select
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Graduated">Graduated</option>
                                    </select>
                                ) : (
                                    <p className="text-sm font-bold text-gray-900">{student.status}</p>
                                )}
                            </div>

                            {/* Campus */}
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Campus</label>
                                {isEditing ? (
                                    <select
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.campusId}
                                        onChange={e => setEditForm({ ...editForm, campusId: e.target.value, grade: '' })}
                                    >
                                        {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <School size={14} className="text-gray-400" />
                                        {campus?.campusName}
                                    </p>
                                )}
                            </div>

                            {/* Grade & Section */}
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Grade</label>
                                {isEditing ? (
                                    <select
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.grade}
                                        onChange={async (e) => {
                                            const newGrade = e.target.value
                                            const newForm = { ...editForm, grade: newGrade }
                                            setEditForm(newForm)
                                            // Auto-fetch fee
                                            if (newForm.campusId && newGrade) {
                                                const fee = await getGradeFee(parseInt(newForm.campusId), newGrade, newForm.academicYear, newForm.selectedFeeType)
                                                if (fee !== null) {
                                                    setEditForm((prev: any) => ({ ...prev, baseFee: fee }))
                                                    toast.success(`Fee updated to ${fee}`)
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">Select</option>
                                        {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-sm font-bold text-gray-900">{student.grade}</p>
                                )}
                            </div>

                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Section</label>
                                {isEditing ? (
                                    <input
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.section || ''}
                                        onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                                        placeholder="Sec"
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-gray-900">{student.section || '-'}</p>
                                )}
                            </div>

                            {/* Identifiers */}
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Roll Number</label>
                                {isEditing ? (
                                    <input
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.rollNumber || ''}
                                        onChange={e => setEditForm({ ...editForm, rollNumber: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-gray-900 font-mono">{student.rollNumber || '-'}</p>
                                )}
                            </div>

                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Admission No</label>
                                {isEditing ? (
                                    <input
                                        className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={editForm.admissionNumber || ''}
                                        onChange={e => setEditForm({ ...editForm, admissionNumber: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-gray-900 font-mono">{student.admissionNumber || '-'}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Financial Context */}
                    <section>
                        <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Wallet size={14} /> Financial Context
                        </h3>

                        <div className={`space-y-4 ${isEditing ? 'bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50' : ''}`}>
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee Plan</p>
                                    {isEditing ? (
                                        <select
                                            className="mt-1 text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            value={editForm.selectedFeeType}
                                            onChange={async (e) => {
                                                const newType = e.target.value
                                                const newForm = { ...editForm, selectedFeeType: newType }
                                                setEditForm(newForm)
                                                // Auto-fetch
                                                if (newForm.campusId && newForm.grade) {
                                                    const fee = await getGradeFee(parseInt(newForm.campusId), newForm.grade, newForm.academicYear, newType as any)
                                                    if (fee !== null) setEditForm((prev: any) => ({ ...prev, baseFee: fee }))
                                                }
                                            }}
                                        >
                                            <option value="WOTP">Installment (WOTP)</option>
                                            <option value="OTP">One Time (OTP)</option>
                                        </select>
                                    ) : (
                                        <div className="mt-1">
                                            <Badge
                                                variant={(student as any).selectedFeeType === 'OTP' ? 'purple' : 'warning'}
                                                className={`font-black text-[9px] tracking-wider uppercase ${(student as any).selectedFeeType === 'OTP'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}
                                            >
                                                {(student as any).selectedFeeType || 'WOTP'}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount</p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <input
                                                type="number"
                                                className="w-16 text-right text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                                                value={editForm.discountPercent}
                                                onChange={e => setEditForm({ ...editForm, discountPercent: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="text-sm font-bold">%</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-black text-emerald-600 mt-1">{student.discountPercent}% OFF</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Fee</p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-gray-400 font-bold">₹</span>
                                            <input
                                                type="number"
                                                className="w-full text-lg font-black text-gray-900 bg-transparent border-b border-gray-200 outline-none"
                                                value={editForm.baseFee}
                                                onChange={e => setEditForm({ ...editForm, baseFee: e.target.value })}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-lg font-black text-gray-900 mt-1">
                                            {((student as any).annualFee || student.baseFee)
                                                ? `₹${((student as any).annualFee || student.baseFee).toLocaleString()}`
                                                : 'N/A'}
                                        </p>
                                    )}
                                </div>
                                <div className="p-4 rounded-xl bg-gray-900 text-white shadow-lg">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Payable</p>
                                    <p className="text-lg font-black text-white mt-1">
                                        ₹{((parseInt(isEditing ? editForm.baseFee : ((student as any).annualFee ?? student.baseFee)) || 0) * (1 - ((isEditing ? editForm.discountPercent : student.discountPercent) || 0) / 100)).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Guardian & Ambassador Grid */}
                    <div className="grid grid-cols-1 gap-8">
                        {/* Guardian */}
                        <section>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Shield size={14} className="text-blue-400" /> Guardian Details
                            </h3>
                            {parent ? (
                                <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
                                        <div className="flex-none w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <User size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-black text-gray-900 uppercase tracking-tight truncate">{parent.fullName}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{parent.mobileNumber}</span>
                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{parent.isFiveStarMember ? '5-Star' : 'Standard'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2 relative z-10">
                                        <button
                                            onClick={() => parent && onViewParent(parent.userId)}
                                            className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <UserCheck size={12} /> View Profile
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Guardian Linked</p>
                                </div>
                            )}
                        </section>

                        {/* Ambassador */}
                        <section>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <BadgeCheck size={14} className="text-red-400" /> Ambassador
                            </h3>
                            {ambassador ? (
                                <div className="p-5 rounded-2xl bg-red-50/20 border border-red-50 relative overflow-hidden group">
                                    <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
                                        <div className="flex-none w-12 h-12 rounded-xl bg-white border border-red-100 flex items-center justify-center text-red-600">
                                            <UserCheck size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Referred By</p>
                                            <h4 className="text-base font-black text-gray-900 uppercase tracking-tight truncate">{ambassador.fullName}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black text-gray-500 bg-white/50 px-1.5 py-0.5 rounded border border-gray-200 uppercase">{ambassador.referralCode}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{ambassador.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2 relative z-10">
                                        <button
                                            onClick={() => ambassador.referralCode && (window.location.href = `/superadmin?view=users&search=${ambassador.referralCode}`)}
                                            className="flex-1 py-2 bg-white text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={12} /> View Profile
                                        </button>
                                        <a
                                            href={`tel:${ambassador.mobileNumber}`}
                                            className="px-3 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-all flex items-center justify-center"
                                        >
                                            <Phone size={14} />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Ambassador/Referral</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Timeline */}
                    <section>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Clock size={14} className="text-purple-400" /> Activity History
                        </h3>
                        <div className="relative border-l-2 border-dashed border-gray-100 ml-3 space-y-8 py-2">
                            <div className="relative pl-6">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Just Now</p>
                                <p className="text-sm font-bold text-gray-900">Student Profile Viewed</p>
                            </div>
                            {student.createdAt && (
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 shadow-sm" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        {new Date(student.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900">Student Admitted</p>
                                    <p className="text-xs text-gray-500 mt-1">Initial record creation</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="flex-none p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.03)] space-y-3 z-20">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:scale-[0.98]"
                        >
                            <Edit2 size={16} strokeWidth={2.5} />
                            Quick Edit Details
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:scale-[0.98]"
                        >
                            <Save size={16} strokeWidth={2.5} />
                            Save Changes
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onEdit(student)}
                            className="py-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-gray-200"
                        >
                            <Edit size={14} /> Advanced Edit
                        </button>

                        {parent && (
                            <button
                                onClick={() => onViewParent(parent.userId)}
                                className="py-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-gray-200"
                            >
                                <UserCheck size={14} /> Parent Profile
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
