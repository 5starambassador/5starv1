'use client'

import { useState } from 'react'
import { Clock, CheckCircle, UserCheck, ChevronDown, ChevronUp, MapPin, GraduationCap, Phone } from 'lucide-react'

interface ReferralCardClientProps {
    referral: any
}

export function ReferralCardClient({ referral }: ReferralCardClientProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const colors: Record<string, string> = {
        'Confirmed': 'var(--success)',
        'Follow-up': 'var(--primary-red)',
        'New': 'var(--text-secondary)'
    }
    const color = colors[referral.leadStatus] || 'gray'

    const StatusBadge = ({ status }: { status: string }) => {
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

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-gray-200">
            <div
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900">{referral.parentName}</h3>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {(referral.leadStatus === 'Confirmed' && referral.student?.campus?.campusName)
                            ? <span className="font-semibold text-emerald-600">Joined: {referral.student.campus.campusName}</span>
                            : referral.campus}
                        {' • '}{referral.gradeInterested} • {referral.admittedYear || '2025-2026'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <StatusBadge status={referral.leadStatus} />
                    {referral.leadStatus === 'Confirmed' && referral.confirmedDate && (
                        <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-lg">
                            {new Date(referral.confirmedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-6 pt-2 border-t border-gray-50 bg-gray-50/30 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Student Details</h4>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <GraduationCap size={14} className="text-red-500" />
                                    {referral.studentName || 'Not specified'}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grade Interested</h4>
                                <p className="text-sm font-bold text-gray-700">{referral.gradeInterested}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Preferred Campus</h4>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <MapPin size={14} className="text-blue-500" />
                                    {referral.campus}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Status</h4>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Phone size={14} className="text-emerald-500" />
                                    {referral.parentMobile.replace(/.(?=.{4})/g, '•')}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Referral Date</h4>
                                <p className="text-sm font-bold text-gray-700">
                                    {new Date(referral.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Update</h4>
                                <p className="text-sm font-bold text-gray-500 italic">
                                    {referral.leadStatus === 'Confirmed' ? 'Successfully converted' : 'Awaiting campus follow-up'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
