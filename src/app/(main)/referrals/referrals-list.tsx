'use client'

import { useState } from 'react'
import { PageAnimate } from '@/components/PageAnimate'
import { CheckCircle2, Clock, MapPin, GraduationCap, User, Filter, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ReferralsListProps {
    referrals: any[]
}

const ACADEMIC_YEARS = ['2025-2026', '2024-2025', 'All Time']

export function ReferralsList({ referrals }: ReferralsListProps) {
    const [selectedYear, setSelectedYear] = useState('2025-2026')
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Helper to determine academic year of a referral
    const getReferralYear = (r: any) => {
        // 1. Explicit Admitted Year
        if (r.admittedYear) return r.admittedYear

        // 2. Student Data
        if (r.student?.academicYear) return r.student.academicYear

        // 3. Fallback based on Creation Date
        const date = new Date(r.createdAt)
        if (date >= new Date('2025-01-01')) return '2025-2026'
        if (date >= new Date('2024-01-01')) return '2024-2025' // Rough fallback
        return 'Previous'
    }

    const filteredReferrals = selectedYear === 'All Time'
        ? referrals
        : referrals.filter(r => getReferralYear(r) === selectedYear)

    const preAsset = filteredReferrals.filter((r: any) => r.leadStatus === 'New' || r.leadStatus === 'Follow_up')
    const asset = filteredReferrals.filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Rejected')

    return (
        <div className="relative">
            {/* Filter Dropdown */}
            <div className="flex justify-end mb-6 relative z-50">
                <div className="relative">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-all backdrop-blur-md"
                    >
                        <Filter size={14} className="text-amber-400" />
                        <span>Year: {selectedYear}</span>
                        <ChevronDown size={14} className={`text-white/40 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
                            >
                                {ACADEMIC_YEARS.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => {
                                            setSelectedYear(year)
                                            setIsFilterOpen(false)
                                        }}
                                        className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors ${selectedYear === year ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'}`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* SECTION 1: PRE-ASSET */}
            <PageAnimate className="mb-8 delay-100">
                <div className="flex items-center justify-between mb-4 pl-4 border-l-4 border-amber-400">
                    <h2 className="text-xl font-bold text-white tracking-tight">Pre-Asset</h2>
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        {preAsset.length} Lead{preAsset.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {preAsset.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/5 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center text-center">
                        <p className="text-white/40 font-medium text-sm">No active leads for {selectedYear}.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {preAsset.map((referral: any) => (
                            <ReferralCard key={referral.leadId} referral={referral} type="pre-asset" />
                        ))}
                    </div>
                )}
            </PageAnimate>

            {/* SECTION 2: ASSET */}
            <PageAnimate className="delay-200">
                <div className="flex items-center justify-between mb-4 pl-4 border-l-4 border-emerald-500">
                    <h2 className="text-xl font-bold text-white tracking-tight">Asset</h2>
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        {asset.length} Asset{asset.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {asset.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/5 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={32} className="text-white/20" />
                        </div>
                        <p className="text-white/40 font-medium text-lg">No asset referrals {selectedYear === 'All Time' ? 'yet' : `in ${selectedYear}`}.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {asset.map((referral: any) => (
                            <ReferralCard key={referral.leadId} referral={referral} type="asset" />
                        ))}
                    </div>
                )}
            </PageAnimate>
        </div>
    )
}

function ReferralCard({ referral, type }: { referral: any, type: 'pre-asset' | 'asset' }) {
    const isAsset = type === 'asset'
    const statusColor = referral.leadStatus === 'Confirmed' ? 'text-emerald-300' :
        referral.leadStatus === 'Rejected' ? 'text-red-300' : 'text-amber-300'

    const statusBg = referral.leadStatus === 'Confirmed' ? 'bg-emerald-500/10 border-emerald-500/20' :
        referral.leadStatus === 'Rejected' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'

    return (
        <div className={`group relative bg-gradient-to-br ${isAsset ? 'from-emerald-900/40 to-slate-900/40 border-emerald-500/30' : 'from-white/10 to-white/5 border-white/20'} backdrop-blur-md rounded-[24px] p-6 overflow-hidden transition-all hover:shadow-xl shadow-lg backdrop-brightness-125`}>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className={`font-bold text-lg text-white transition-colors uppercase ${isAsset ? 'group-hover:text-emerald-200' : 'group-hover:text-amber-200'}`}>{referral.studentName}</h3>
                        <div className="flex items-center gap-2 text-white/50 text-[11px] font-medium uppercase tracking-wider mt-0.5">
                            <span className="flex items-center gap-1"><User size={10} /> {referral.parentName}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {(referral.annualFee || referral.student?.baseFee) && (
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Fee</p>
                                <p className="text-sm font-bold text-white">₹{(referral.annualFee || referral.student?.baseFee).toLocaleString('en-IN')}</p>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${statusBg} ${statusColor}`}>
                            {isAsset ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span className="text-xs font-bold">{referral.leadStatus}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 text-white/60 text-xs">
                    <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                        <MapPin size={10} className="text-white/40" /> {referral.campus || 'No Campus'}
                    </span>
                    <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                        <GraduationCap size={10} className="text-white/40" /> {referral.gradeInterested || 'No Grade'}
                    </span>
                    {/* Show Year Tag */}
                    <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5 ml-auto">
                        <Clock size={10} className="text-white/40" /> {referral.admittedYear || referral.student?.academicYear || new Date(referral.createdAt).getFullYear()}
                    </span>
                </div>
            </div>
        </div>
    )
}
