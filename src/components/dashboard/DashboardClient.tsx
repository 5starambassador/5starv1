'use client'

import { useState, useMemo } from 'react'
import { ActionHomeBlueUnified } from '@/components/themes/ActionHomeBlueUnified'
import { calculateTotalBenefit, UserContext } from '@/lib/benefit-calculator'
import { ChevronDown, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'

// Shared Logic for Filtering (Mirrors server logic but runs on client)
const filterReferralsByYear = (referrals: any[], yearRecord: any) => {
    if (!yearRecord) return referrals // "All Time" case

    const PREVIOUS_ACADEMIC_YEAR = '2024-2025'
    const CURRENT_ACADEMIC_YEAR = '2025-2026'

    // Exact logic from dashboard/page.tsx
    // 1. Current Year Logic
    if (yearRecord.isCurrent) {
        return referrals.filter((r: any) => {
            // Priority 1: Check admittedYear first (most reliable indicator)
            if (r.admittedYear) {
                if (r.admittedYear === PREVIOUS_ACADEMIC_YEAR) return false
                if (r.admittedYear === CURRENT_ACADEMIC_YEAR || r.admittedYear === '2026-2027') return true
            }

            // Priority 2: Check student's academic year
            const s = r.student
            if (s?.academicYear) {
                if (s.academicYear === PREVIOUS_ACADEMIC_YEAR) return false
                if (s.academicYear === CURRENT_ACADEMIC_YEAR || s.academicYear === '2026-2027') return true
            }

            // Priority 3: Fallback to creation date
            const createdDate = new Date(r.createdAt)
            const currentYearStart = new Date(yearRecord.startDate)
            return createdDate >= currentYearStart
        })
    }

    // 2. Previous Year Logic
    else {
        return referrals.filter((r: any) => {
            // Priority 1: Check admittedYear
            if (r.admittedYear) return r.admittedYear === yearRecord.year

            // Priority 2: Check student's academic year
            const s = r.student
            if (s?.academicYear) return s.academicYear === yearRecord.year

            // Priority 3: Fallback to creation date
            const createdDate = new Date(r.createdAt)
            const yearStart = new Date(yearRecord.startDate)
            const yearEnd = new Date(yearRecord.endDate)
            return createdDate >= yearStart && createdDate < yearEnd
        })
    }
}

interface DashboardClientProps {
    user: any
    referrals: any[]
    activeYears: any[]
    campusFeeMap: Map<number, { otp: number, wotp: number }>
    // Pre-calculated context stuff
    dynamicStudentFee: number
    monthStats: any
}

export function DashboardClient({
    user,
    referrals,
    activeYears,
    campusFeeMap,
    dynamicStudentFee,
    monthStats
}: DashboardClientProps) {

    // Filter State
    // Default to Current Year (find isCurrent or first)
    const defaultYear = activeYears.find(y => y.isCurrent) || activeYears[0]
    const [selectedYearId, setSelectedYearId] = useState<string>(defaultYear?.id || 'all')
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Data Processing (Memoized)
    const { filteredReferrals, benefitStats } = useMemo(() => {
        let currentSet = referrals
        let selectedYearRecord = null

        if (selectedYearId !== 'all') {
            selectedYearRecord = activeYears.find(y => y.id === selectedYearId)
            if (selectedYearRecord) {
                currentSet = filterReferralsByYear(referrals, selectedYearRecord)
            }
        }

        // --- Calculate Benefits for this set ---

        // 1. Format for Calculator
        const formatForCalculator = (refs: any[]) => refs.map(r => {
            const feeType = r.selectedFeeType || 'OTP'
            // We need to reconstruct the map since it can't pass as generic Map easily over boundaries sometimes,
            // but here we are in Client Component receiving it. 
            // Note: Maps are not serializable if passed from Server Component.
            // We should expect an object or array. Let's assume it was passed as object or we fix it in page.tsx.
            // For now, let's assume it's passed as a plain object [campusId]: {otp, wotp}

            // Actually, let's just handle it.
            // If passed as Map, React warns. We will fix page.tsx to pass an Object or Array.
            // Let's assume `campusFeeMap` is an object: Record<number, {otp, wotp}>

            const fees = (campusFeeMap as any)[r.campusId]
            const g1Fee = (feeType === 'WOTP') ? (fees?.wotp || 60000) : (fees?.otp || 60000)

            return {
                id: r.leadId,
                campusId: r.campusId || 0,
                grade: r.gradeInterested || '',
                campusGrade1Fee: g1Fee,
                actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
            }
        })

        // 2. User Context
        // We need previous year referrals for LONG TERM BASE calculation.
        // Even if we filter to "Current Year", we definitely need previous year refs context.
        // If we filter to "Previous Year", we technically don't have "Previous Previous" context here easily without fetching more.
        // But the Long Term Base only applies to CURRENT year benefits based on PASt performance.
        // So:
        // - If viewing Current Year: Include Long Term Base (calculated from prev refs).
        // - If viewing Previous Year: Do NOT include Long Term Base (it didn't exist then, or we ignore it).
        // - If viewing All Time: Sum them? No, All Time is tricky.

        // Simpler approach:
        // Always pass the FULL list of previous year referrals (calculated once globally) to the context
        // so `calculateTotalBenefit` can decide if it applies.

        // We need "Previous Year Referrals" specifically defined relative to "2025-2026".
        // It's static context.
        const prevYearRecord = activeYears.find(y => y.year === '2024-2025')
        const previousYearReferrals = filterReferralsByYear(referrals, prevYearRecord).filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')

        const userContext: UserContext = {
            role: user.role,
            childInAchariya: user.childInAchariya,
            studentFee: user.studentFee || 60000,
            isFiveStarLastYear: user.isFiveStarMember,
            previousYearReferrals: previousYearReferrals.map((r: any) => ({
                id: r.leadId,
                campusId: r.campusId || 0,
                grade: r.gradeInterested || '',
                actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
            }))
        }

        // 3. Calculate Earnings
        const confirmedList = currentSet.filter((r: any) => r.leadStatus === 'Confirmed')
        const potentialList = currentSet.filter((r: any) => r.leadStatus !== 'Rejected')

        const earnedResult = calculateTotalBenefit(formatForCalculator(confirmedList), userContext)
        const potentialResult = calculateTotalBenefit(formatForCalculator(potentialList), userContext)

        // 4. Calculate Display Percent
        let displayPercent = 0
        const count = confirmedList.length
        if (user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)) {
            // Fee Discount
            if (user.isFiveStarMember) {
                if (count >= 5) displayPercent = 25
                else if (count === 4) displayPercent = 20
                else if (count === 3) displayPercent = 15
                else if (count === 2) displayPercent = 10
                else if (count >= 1) displayPercent = 5
            } else {
                if (count >= 5) displayPercent = 50
                else if (count === 4) displayPercent = 30
                else if (count === 3) displayPercent = 20
                else if (count === 2) displayPercent = 10
                else if (count >= 1) displayPercent = 5
            }
        } else {
            // Cash
            if (count >= 5) displayPercent = 100
            else displayPercent = count * 20
        }

        return {
            filteredReferrals: currentSet,
            benefitStats: {
                earned: earnedResult.totalAmount, // This includes Base if applicable
                potential: potentialResult.totalAmount,
                displayPercent
            }
        }

    }, [selectedYearId, referrals, activeYears, campusFeeMap, user])


    // Prepare Recent Referrals for Display (Top 5 of filtered set)
    const recentReferralsDisplay = filteredReferrals
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((r: any) => ({
            id: r.leadId,
            parentName: r.parentName,
            studentName: r.studentName,
            status: r.leadStatus,
            createdAt: r.createdAt // Passed as string already or Date?
        }))

    // Calculate Counts
    const realConfirmedCount = filteredReferrals.filter((r: any) => r.leadStatus === 'Confirmed').length
    const pendingCount = filteredReferrals.filter((r: any) => r.leadStatus !== 'Confirmed' && r.leadStatus !== 'Rejected').length

    return (
        <div className="-mx-2 xl:mx-0 relative">
            {/* Royal Glass Background Layer */}
            <div className="fixed inset-0 bg-[#0f172a] -z-50">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/60 to-slate-900 z-0 opacity-100" />
            </div>
            <div className="fixed inset-0 bg-[url('/bg-pattern.png')] bg-cover opacity-10 -z-40 pointer-events-none" />
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 -z-40 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 -z-40 pointer-events-none" />

            {/* YEAR FILTER DROPDOWN - Floating Top Right */}
            <div className="absolute top-0 right-0 z-50 mb-6">
                <div className="relative">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all shadow-xl"
                    >
                        <Calendar size={14} className="text-amber-400" />
                        <span>
                            {selectedYearId === 'all' ? 'All Time' : activeYears.find(y => y.id === selectedYearId)?.year}
                        </span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="p-1">
                                    {activeYears.map((year) => (
                                        <button
                                            key={year.id}
                                            onClick={() => {
                                                setSelectedYearId(year.id)
                                                setIsFilterOpen(false)
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-between ${selectedYearId === year.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            {year.year}
                                            {year.isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                                        </button>
                                    ))}
                                    {/* Optional: All Time Option */}
                                    {/* 
                                    <button
                                        onClick={() => {
                                            setSelectedYearId('all')
                                            setIsFilterOpen(false)
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                                            selectedYearId === 'all' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        All Time
                                    </button>
                                    */}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <ActionHomeBlueUnified
                user={{
                    fullName: user.fullName,
                    role: user.role,
                    referralCode: user.referralCode,
                    confirmedReferralCount: realConfirmedCount,
                    yearFeeBenefitPercent: benefitStats.displayPercent,
                    potentialFeeBenefitPercent: 0,
                    benefitStatus: user.benefitStatus || 'Active',
                    empId: user.empId,
                    assignedCampus: user.assignedCampus,
                    studentFee: dynamicStudentFee || 60000
                }}
                recentReferrals={recentReferralsDisplay}
                whatsappUrl={`https://wa.me/?text=${encodeURIComponent(`Hi! I'm part of the Achariya Partnership Program.\nAdmissions link: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'}/r/${user.encryptedCode}`)}`}
                referralLink={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'}/r/${user.encryptedCode}`}
                monthStats={monthStats}
                totalLeadsCount={pendingCount}
                overrideEarnedAmount={benefitStats.earned}
                overrideEstimatedAmount={benefitStats.potential}
            />
        </div>
    )
}
