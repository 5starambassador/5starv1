import { motion } from 'framer-motion'
import { X, User, Edit, Hash, School, GraduationCap, Percent, Wallet, Phone, Shield, ExternalLink, Calendar, MapPin, BadgeCheck, UserCheck } from 'lucide-react'
import { Student, User as UserType, Campus } from '@/types'
import { useState } from 'react'

interface StudentDetailPanelProps {
    student: Student | null
    users: UserType[]
    campuses: Campus[]
    onClose: () => void
    onEdit: (student: Student) => void
    onViewParent: (parentId: number) => void
}

export function StudentDetailPanel({ student, users, campuses, onClose, onEdit, onViewParent }: StudentDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'guardians'>('overview')

    if (!student) return null

    const parent = users.find(u => u.userId === student.parentId)
    const campus = campuses.find(c => c.id === student.campusId)
    const ambassador = student.ambassador

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-[2px] z-[60] transition-all duration-300"
            />

            {/* Panel */}
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l border-gray-100 z-[70] flex flex-col h-screen overflow-hidden"
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex gap-4 relative z-10 w-full overflow-hidden">
                        <div className="flex-none w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 ring-white">
                            <GraduationCap size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase truncate">{student.fullName}</h2>
                                {student.status === 'Active' && <BadgeCheck size={18} className="text-emerald-500 flex-none" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                    {student.grade} {student.section ? `- ${student.section}` : ''}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 truncate">
                                    <MapPin size={10} className="text-gray-300" />
                                    {campus?.campusName || 'Unknown Campus'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-none p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all group relative z-20"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex-none flex border-b border-gray-100 px-6 gap-6 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    {['overview', 'financials', 'guardians'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all relative ${activeTab === tab
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0 p-6 custom-scrollbar-dark bg-white">
                    <div className="space-y-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Academic Info */}
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 text-indigo-400 group-hover:text-indigo-600 transition-colors">
                                            <School size={12} />
                                            Student Profile
                                        </h3>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${student.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                            }`}>
                                            {student.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 group hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Roll & Grade</div>
                                            <div className="font-black text-gray-900 text-sm flex items-center gap-2">
                                                <Hash size={14} className="text-gray-300 group-hover:text-indigo-500" />
                                                #{student.rollNumber || 'N/A'} • {student.grade}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 group hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Academic Year</div>
                                            <div className="font-black text-gray-900 text-sm flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-300 group-hover:text-amber-500" />
                                                {student.academicYear || '2025-26'}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 col-span-2 group hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Admission Reference</div>
                                            <div className="font-black text-gray-900 text-sm flex items-center gap-2 break-all">
                                                <BadgeCheck size={14} className="text-indigo-400 flex-none" />
                                                {student.admissionNumber || 'ADM-PENDING'}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 col-span-2 group hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Campus</div>
                                            <div className="font-black text-gray-900 text-sm flex items-center gap-2">
                                                <School size={14} className="text-gray-300 group-hover:text-indigo-500" />
                                                {campus?.campusName || 'Not Assigned'}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Referral Source */}
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Shield size={12} className="text-red-400" />
                                        Referral Insight
                                    </h3>
                                    {ambassador ? (
                                        <div className="p-5 rounded-[24px] bg-gradient-to-br from-red-50/30 to-white border border-red-50 shadow-sm relative overflow-hidden group">
                                            <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
                                                <div className="flex-none w-12 h-12 rounded-xl bg-white border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
                                                    <UserCheck size={24} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Ambassador</p>
                                                    <h4 className="text-base font-black text-gray-900 uppercase tracking-tight truncate">{ambassador.fullName}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{ambassador.referralCode}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{ambassador.role}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex gap-2 relative z-10">
                                                <button
                                                    onClick={() => ambassador.referralCode && (window.location.href = `/superadmin?view=users&search=${ambassador.referralCode}`)}
                                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ExternalLink size={14} /> Profile
                                                </button>
                                                <a
                                                    href={`tel:${ambassador.mobileNumber}`}
                                                    className="px-3 py-2.5 bg-white border border-red-100 text-red-600 rounded-xl hover:bg-red-50 flex items-center justify-center"
                                                >
                                                    <Phone size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center bg-gray-50/50 rounded-[24px] border border-dashed border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Direct Admission</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Wallet size={12} className="text-emerald-400" />
                                        Fee Summary
                                    </h3>
                                    <div className="grid gap-3">
                                        <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Base Tuition</span>
                                                <BadgeCheck size={14} className="text-emerald-500" />
                                            </div>
                                            <div className="text-2xl font-black text-gray-900">
                                                ₹{(student.baseFee || 0).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Concession</span>
                                                <Percent size={14} className="text-amber-500" />
                                            </div>
                                            <div className="text-2xl font-black text-gray-900">
                                                {student.discountPercent}%
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-[32px] bg-gray-900 text-white shadow-xl relative overflow-hidden group mt-2">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Net Payable</span>
                                            <div className="text-3xl font-black text-white tracking-tighter mt-1">
                                                ₹{((student.baseFee || 0) * (1 - (student.discountPercent || 0) / 100)).toLocaleString()}
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                <Calendar size={10} /> {student.academicYear || '2025-26'} ACADEMIC CYCLE
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'guardians' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Shield size={12} className="text-blue-400" />
                                        Guardian Details
                                    </h3>
                                    {parent ? (
                                        <div className="p-6 rounded-[32px] bg-white border border-gray-100 shadow-lg shadow-gray-200/40 space-y-6">
                                            <div className="flex gap-4 w-full overflow-hidden">
                                                <div className="flex-none w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                                    <User size={24} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight truncate">{parent.fullName}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9px] font-black border border-blue-100 uppercase tracking-widest">
                                                            {parent.role}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">• VERIFIED</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile</p>
                                                    <p className="text-sm font-black text-gray-900 flex items-center gap-1 truncate">
                                                        <Phone size={12} className="text-blue-500 flex-none" />
                                                        {parent.mobileNumber}
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tier</p>
                                                    <p className="text-sm font-black text-gray-900 flex items-center gap-1 truncate">
                                                        <BadgeCheck size={12} className="text-emerald-500 flex-none" />
                                                        {parent.isFiveStarMember ? '5-Star' : 'Standard'}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onViewParent(parent.userId)}
                                                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-gray-200"
                                            >
                                                <ExternalLink size={14} /> Full Profile
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Link Found</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex-none p-8 border-t border-gray-100 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.02)] space-y-4">
                    <button
                        onClick={() => onEdit(student)}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <Edit size={20} strokeWidth={2.5} />
                        Update Registration
                    </button>
                    {parent && (
                        <button
                            onClick={() => onViewParent(parent.userId)}
                            className="w-full py-5 bg-white border-2 border-gray-100 text-gray-600 hover:border-indigo-100 hover:bg-indigo-50/30 hover:text-indigo-600 rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            <UserCheck size={20} strokeWidth={2.5} />
                            Secondary Actions
                        </button>
                    )}
                </div>
            </motion.div>
        </>
    )
}
