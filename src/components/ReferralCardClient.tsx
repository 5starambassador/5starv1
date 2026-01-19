'use client'

import { useState } from 'react'
import { Clock, CheckCircle, UserCheck, ChevronDown, ChevronUp, MapPin, GraduationCap, Phone, User } from 'lucide-react'

interface ReferralCardClientProps {
    referral: any
}

const COLORS: Record<string, string> = {
    'Confirmed': 'var(--success)',
    'Follow-up': 'var(--primary-red)',
    'New': 'var(--text-secondary)'
}

function StatusBadge({ status }: { status: string }) {
    const color = COLORS[status] || 'gray'
    let icon = <Clock size={14} />
    if (status === 'Confirmed') icon = <CheckCircle size={14} />
    else if (status === 'Follow-up') icon = <UserCheck size={14} />

    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{ color: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}>
            {icon}
            {status}
        </span>
    )
}

export function ReferralCardClient({ referral }: ReferralCardClientProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="glass-panel rounded-[24px] border border-white/20 shadow-xl overflow-hidden transition-all hover:scale-[1.01] hover:shadow-2xl group">
            <div
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-white/5 dark:border-white/5 group-hover:bg-ui-primary/10 transition-colors">
                        <UserCheck size={24} className="text-ui-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-lg text-gray-900 dark:text-white tracking-tight uppercase">{referral.studentName}</h3>
                                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <User size={10} className="text-ui-primary" /> {referral.parentName}
                            </p>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-white/40 mt-1 uppercase tracking-wider">
                            {(referral.leadStatus === 'Confirmed' && referral.student?.campus?.campusName)
                                ? <span className="text-emerald-500">Joined: {referral.student.campus.campusName}</span>
                                : referral.campus}
                            {' • '}{referral.gradeInterested} • {referral.admittedYear || '2025-2026'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <StatusBadge status={referral.leadStatus} />
                    {(referral.annualFee || referral.student?.baseFee) && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Fee</span>
                            <span className="text-sm font-black text-gray-900 dark:text-white">
                                ₹{(referral.annualFee || referral.student?.baseFee).toLocaleString('en-IN')}
                            </span>
                        </div>
                    )}
                    {referral.leadStatus === 'Confirmed' && referral.confirmedDate && (
                        <p className="text-[10px] text-emerald-500 font-black bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest hidden md:block">
                            {new Date(referral.confirmedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-black/5 bg-black/5 dark:bg-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[9px] font-black text-ui-primary uppercase tracking-[0.2em] mb-2 opacity-60">Student Details</h4>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                    <GraduationCap size={16} className="text-ui-primary" />
                                    {referral.studentName || 'Not specified'}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Grade Level</h4>
                                <p className="text-sm font-black text-gray-700 dark:text-white/80">{referral.gradeInterested}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[9px] font-black text-ui-primary uppercase tracking-[0.2em] mb-2 opacity-60">Preferred Hub</h4>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                    <MapPin size={16} className="text-ui-accent" />
                                    {referral.campus}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Contact Link</h4>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white/80">
                                    <Phone size={16} className="text-emerald-500" />
                                    {referral.parentMobile.replace(/.(?=.{4})/g, '•')}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 text-right md:text-left">
                            <div>
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Timestamp</h4>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {new Date(referral.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Status Log</h4>
                                <p className="text-[10px] font-black text-gray-400 italic uppercase tracking-wider">
                                    {referral.leadStatus === 'Confirmed' ? 'Verification Successful' : 'Processing in Queue'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
