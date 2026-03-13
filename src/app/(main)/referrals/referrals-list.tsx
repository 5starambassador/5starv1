'use client'

import { useState, useRef } from 'react'
import { PageAnimate } from '@/components/PageAnimate'
import { CheckCircle2, Clock, MapPin, GraduationCap, User, Filter, ChevronDown, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClickOutside } from '@/hooks/use-click-outside'

import { calculateTotalBenefit, UserContext } from '@/lib/benefit-calculator'

interface ReferralsListProps {
    referrals: any[]
    user: any
    slabs: any[]
    activeYears: any[]
    settlements: any[]
    campusFeeMap?: Record<string, Record<number, { otp: number, wotp: number }>>
}

export function ReferralsList({ referrals, user, slabs, activeYears, settlements, campusFeeMap }: ReferralsListProps) {
    const sortedYears = [...activeYears].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    const currentYearRecord = activeYears.find(y => y.isCurrent) || sortedYears[0]
    const dropdownYears = [...sortedYears.map(y => y.year), 'All Time']

    const [selectedYear, setSelectedYear] = useState(currentYearRecord?.year || '2025-2026')
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)

    useClickOutside(filterRef, () => setIsFilterOpen(false))

    // Helper to determine academic year of a referral
    const getReferralYear = (r: any) => {
        if (r.admittedYear) return r.admittedYear
        if (r.student?.academicYear) return r.student.academicYear

        // Date-based fallback check
        const date = new Date(r.createdAt)
        const matchedYear = activeYears.find(y => {
            const start = new Date(y.startDate)
            const end = new Date(y.endDate)
            return date >= start && date <= end
        })

        return matchedYear?.year || currentYearRecord?.year || '2025-2026'
    }

    const filteredReferrals = selectedYear === 'All Time'
        ? referrals
        : referrals.filter(r => getReferralYear(r) === selectedYear)

    // Marginal Yield Logic (Type-Aware FIFO)
    const referralsWithYield = (() => {
        const sorted = [...filteredReferrals].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        const confirmed = sorted.filter(r => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')
        const pending = sorted.filter(r => !['Confirmed', 'Admitted', 'Rejected', 'Closed'].includes(r.leadStatus))
        const rejected = sorted.filter(r => ['Rejected', 'Closed'].includes(r.leadStatus))

        const context: UserContext = {
            role: user?.role as any || 'Parent',
            childInAchariya: user?.childInAchariya,
            studentFee: user?.studentFee || 60000,
            isFiveStarLastYear: user?.isFiveStarMember,
            previousYearReferrals: [] // Simplified for now
        }

        const format = (list: any[]) => list.map(r => {
            const rYear = getReferralYear(r)
            const g1Fee = campusFeeMap && campusFeeMap[rYear] && r.campusId ? campusFeeMap[rYear][r.campusId]?.wotp : 0

            return {
                id: r.leadId,
                campusId: r.campusId || 0,
                campusName: r.campus,
                grade: r.gradeInterested,
                actualFee: r.student?.annualFee || r.annualFee || 60000,
                campusGrade1Fee: g1Fee || 0,
                admissionFeeCollected: r.admissionFeeCollected || 0,
                donationFeeCollected: r.donationFeeCollected || 0
            }
        })

        // --- PREPARE SETTLEMENT POOLS ---
        const validSettlements = (settlements || []).filter((s: any) => s.status === 'Processed')
        let runningAdm = 0
        let runningDon = 0
        let runningSlab = 0
        let runningGreedy = 0

        const selectedYearRecord = activeYears.find(y => y.year === selectedYear)

        validSettlements.forEach((s: any) => {
            const pDate = s.payoutDate ? new Date(s.payoutDate) : new Date(s.createdAt)
            const type = s.benefitType
            
            // Heuristic for Jan-March 2026 Admission Shares
            const isFebMarchFuture = type === 'ADMISSION_SHARE' && 
                                    pDate.getFullYear() === 2026 && pDate.getMonth() <= 2

            let yearOfAttribution = ''
            if (s.referralLead) {
                yearOfAttribution = s.referralLead.academicYear || s.referralLead.admittedYear
            } else if (isFebMarchFuture) {
                yearOfAttribution = '2026-2027'
            } else {
                // Find matching year by date
                const matchedYear = activeYears.find(y => {
                    const sDate = new Date(y.startDate)
                    const eDate = new Date(y.endDate)
                    return pDate >= sDate && pDate <= eDate
                })
                yearOfAttribution = matchedYear?.year || '2025-2026'
            }

            if (selectedYear !== 'All Time' && selectedYearRecord && yearOfAttribution !== selectedYearRecord.year) {
                return
            }

            if (type === 'ADMISSION_SHARE') runningAdm += (s.amount || 0)
            else if (type === 'DONATION_SHARE') runningDon += (s.amount || 0)
            else if (type === 'SLAB_SHARE') runningSlab += (s.amount || 0)
            else runningGreedy += (s.amount || 0)
        })

        const results: any[] = []

        // 1. Calculate Secured Yields (Marginal) & Apply Granular FIFO
        let prevSecuredTotal = 0
        let prevMetrics = { admissionShare: 0, donationShare: 0, slabShare: 0, specialBonusShare: 0 }
        
        // Pools for matching
        let remAdm = runningAdm
        let remDon = runningDon
        let remSlab = runningSlab
        let remGreedy = runningGreedy

        confirmed.forEach((r, i) => {
            const currentTotalMetrics = calculateTotalBenefit(format(confirmed.slice(0, i + 1)), context, slabs)
            const currentTotal = currentTotalMetrics.totalAmount
            const yieldAmount = currentTotal - prevSecuredTotal
            
            // Calculate marginal components for this referral
            const mAdm = currentTotalMetrics.admissionShare - prevMetrics.admissionShare
            const mDon = currentTotalMetrics.donationShare - prevMetrics.donationShare
            const mSlab = currentTotalMetrics.slabShare - prevMetrics.slabShare
            const mSpec = currentTotalMetrics.specialBonusShare - prevMetrics.specialBonusShare
            
            // Match against pools
            let sAdm = Math.min(mAdm, remAdm); remAdm -= sAdm
            let sDon = Math.min(mDon, remDon); remDon -= sDon
            let sSlab = Math.min(mSlab, remSlab); remSlab -= sSlab
            
            // Greedy match for Specials or remaining gaps
            let leftover = (mAdm - sAdm) + (mDon - sDon) + (mSlab - sSlab) + mSpec
            let sGreedy = Math.min(leftover, remGreedy); remGreedy -= sGreedy
            
            const settledForReferral = sAdm + sDon + sSlab + sGreedy
            const isSettled = settledForReferral >= yieldAmount && yieldAmount > 0
            const isPartial = settledForReferral > 0 && settledForReferral < yieldAmount

            results.push({ 
                ...r, 
                calculatedYield: yieldAmount, 
                yieldType: 'secured', 
                isSettled,
                isPartial,
                settledAmount: settledForReferral
            })
            
            prevSecuredTotal = currentTotal
            prevMetrics = {
                admissionShare: currentTotalMetrics.admissionShare,
                donationShare: currentTotalMetrics.donationShare,
                slabShare: currentTotalMetrics.slabShare,
                specialBonusShare: currentTotalMetrics.specialBonusShare
            }
        })

        // 2. Calculate Potential Yields (Marginal)
        let prevPotentialTotal = prevSecuredTotal
        pending.forEach((r, i) => {
            const combined = [...confirmed, ...pending.slice(0, i + 1)]
            const currentTotal = calculateTotalBenefit(format(combined), context, slabs).totalAmount
            const yieldAmount = currentTotal - prevPotentialTotal
            results.push({ ...r, calculatedYield: yieldAmount, yieldType: 'potential' })
            prevPotentialTotal = currentTotal
        })

        // 3. Rejected
        rejected.forEach(r => results.push({ ...r, calculatedYield: 0, yieldType: 'none' }))

        return results
    })()

    const preAsset = referralsWithYield.filter((r: any) => r.yieldType === 'potential')
    const asset = referralsWithYield.filter((r: any) => r.yieldType === 'secured' || r.leadStatus === 'Rejected')

    return (
        <div className="w-full relative">
            {/* Dashboard-Style Atmospheric Radiance */}
            <div className="absolute top-[-10%] left-[-10%] w-full h-full bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col">
                <div className="flex justify-between items-center mb-10 relative z-50">
                    <div>
                        <h1 className="text-3xl font-black italic text-white tracking-tight uppercase leading-none mb-1">My Referrals</h1>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pipeline Management</p>
                    </div>
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-xl shadow-lg"
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
                                    {dropdownYears.map((year: string) => (
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
                <PageAnimate className="mb-16 delay-100">
                    <div className="flex items-center justify-between mb-8 pl-4 border-l-4 border-amber-400/60">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Pre-Asset</h2>
                            <p className="text-[10px] text-amber-200/40 font-bold uppercase tracking-[0.2em] mt-1">High-Potential Leads</p>
                        </div>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                            {preAsset.length} Lead{preAsset.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {preAsset.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/5 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center text-center">
                            <p className="text-white/40 font-medium text-sm">No active leads for {selectedYear}.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {preAsset.map((referral: any) => (
                                <ReferralCard key={referral.leadId} referral={referral} type="pre-asset" />
                            ))}
                        </div>
                    )}
                </PageAnimate>

                {/* SECTION 2: ASSET */}
                <PageAnimate className="delay-200 mb-16">
                    <div className="flex items-center justify-between mb-8 pl-4 border-l-4 border-emerald-500/60">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Asset</h2>
                            <p className="text-[10px] text-emerald-400/40 font-bold uppercase tracking-[0.2em] mt-1">Secured Accomplishments</p>
                        </div>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.1)]">
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
                        <div className="space-y-6">
                            {asset.map((referral: any) => (
                                <ReferralCard key={referral.leadId} referral={referral} type="asset" />
                            ))}
                        </div>
                    )}
                </PageAnimate>
            </div>
        </div>
    )
}

function ReferralCard({ referral, type }: { referral: any, type: 'pre-asset' | 'asset' }) {
    const isAsset = type === 'asset'
    const statusColor = referral.leadStatus === 'Confirmed' ? 'text-emerald-300' :
        referral.leadStatus === 'Rejected' ? 'text-red-300' : 'text-amber-300'

    const statusBg = referral.leadStatus === 'Confirmed' ? 'bg-emerald-500/10 border-emerald-500/20' :
        referral.leadStatus === 'Rejected' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'

    const yieldAmount = referral.calculatedYield || 0

    return (
        <div className={`group relative !bg-gradient-to-br !from-indigo-950 !via-indigo-900/90 !to-blue-900 border ${isAsset
            ? 'border-blue-400/40 shadow-blue-500/20 shadow-2xl'
            : 'border-white/10 hover:border-white/20 shadow-xl'
            } backdrop-blur-3xl rounded-[2.5rem] p-8 overflow-hidden transition-all duration-500 hover:-translate-y-1 active:scale-[0.98]`}>

            {/* Luminous Glow Behind Card */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none ${isAsset ? 'bg-blue-400/10' : 'bg-amber-400/5'}`} />

            {/* Yield Badge - THE DASHBOARD ENERGY HOOK */}
                <div className={`absolute top-0 right-10 px-6 py-2.5 rounded-b-3xl border-x border-b font-black text-[10px] uppercase tracking-[0.2em] z-20 shadow-2xl ${(referral.isSettled || referral.isPartial)
                    ? 'bg-gradient-to-br from-indigo-500/30 to-blue-600/30 border-blue-400/50 text-blue-200'
                    : referral.yieldType === 'secured'
                        ? 'bg-gradient-to-br from-emerald-500/20 to-blue-600/20 border-blue-400/30 text-emerald-400'
                        : 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-400/30 text-amber-400 animate-pulse'
                    }`}>
                    <span className="flex items-center gap-2 font-black">
                        <Star size={12} className={(referral.isSettled || referral.isPartial) ? 'fill-blue-400' : referral.yieldType === 'secured' ? 'fill-emerald-400' : 'fill-amber-400'} />
                        {referral.isSettled ? 'Settled' : referral.isPartial ? 'Settled' : referral.yieldType === 'secured' ? 'Secured' : 'Potential'}: 
                        ₹{(referral.isPartial ? referral.settledAmount : yieldAmount).toLocaleString('en-IN')}
                    </span>
                </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className={`font-bold text-xl text-white tracking-tight transition-colors uppercase ${isAsset ? 'group-hover:text-blue-100' : 'group-hover:text-amber-200'}`}>{referral.studentName}</h3>
                        <div className="flex items-center gap-2 text-blue-200/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5">
                            <span className="flex items-center gap-1.5"><User size={12} className="text-blue-400/60" /> {referral.parentName}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            {referral.annualFee && (
                                <>
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Fee</p>
                                    <p className="text-sm font-bold text-white">₹{referral.annualFee.toLocaleString('en-IN')}</p>
                                </>
                            )}
                            {(referral.admissionFeeCollected > 0 || referral.donationFeeCollected > 0) && (
                                <div className="mt-1 flex flex-col items-end gap-0.5">
                                    {referral.admissionFeeCollected > 0 && (
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                            <span>ADM: ₹{referral.admissionFeeCollected.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {referral.donationFeeCollected > 0 && (
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                            <span>DON: ₹{referral.donationFeeCollected.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border shadow-lg ${statusBg} ${statusColor}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${referral.leadStatus === 'Confirmed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'} animate-pulse`} />
                            <span className="text-[10px] font-black uppercase tracking-wider">{referral.leadStatus}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 text-blue-100/60 text-[10px] font-bold uppercase tracking-widest mt-6">
                    <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 group-hover:bg-white/10 transition-colors">
                        <MapPin size={12} className="text-blue-400/40" /> {referral.campus || 'Corporate'}
                    </span>
                    <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 group-hover:bg-white/10 transition-colors">
                        <GraduationCap size={12} className="text-blue-400/40" /> {referral.gradeInterested || 'All Grades'}
                    </span>
                    <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 group-hover:bg-white/10 transition-colors">
                        <Clock size={12} className="text-blue-400/40" /> {referral.admittedYear || referral.student?.academicYear || '2025-2026'}
                    </span>
                </div>

                {/* Rejection Reason Section */}
                {referral.leadStatus === 'Rejected' && referral.rejectionReason && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                    >
                        <div className="flex items-start gap-2">
                            <div className="mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Reason for Rejection</p>
                                <p className="text-[11px] text-red-200/80 leading-relaxed font-medium capitalize">
                                    {referral.rejectionReason}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
