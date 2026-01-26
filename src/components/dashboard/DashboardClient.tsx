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
            // Priority 0: Recurring Student Check
            const s = r.student
            if (s?.academicYear) {
                if (s.academicYear === CURRENT_ACADEMIC_YEAR || s.academicYear === '2026-2027') return true
            }

            // Priority 1: Check admittedYear (Acquisition Date)
            if (r.admittedYear) {
                if (r.admittedYear === PREVIOUS_ACADEMIC_YEAR) return false
                if (r.admittedYear === CURRENT_ACADEMIC_YEAR || r.admittedYear === '2026-2027') return true
            }

            // Priority 2: Fallback to student year negative check
            if (s?.academicYear) {
                if (s.academicYear === PREVIOUS_ACADEMIC_YEAR) return false
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

import { ClientUser } from '@/types/client-types'

import { BenefitSlabData } from '@/app/benefit-actions'

interface DashboardClientProps {
    user: ClientUser
    referrals: any[]
    activeYears: any[]
    campusFeeMap: Map<number, { otp: number, wotp: number }>
    slabs: BenefitSlabData[]
    // Pre-calculated context stuff
    dynamicStudentFee: number
    monthStats: any
    notifications?: any[]
    unreadCount?: number
}

export function DashboardClient({
    user,
    referrals,
    activeYears,
    campusFeeMap,
    slabs,
    dynamicStudentFee,
    monthStats,
    notifications = [],
    unreadCount = 0
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
            role: user.role as 'Parent' | 'Staff' | 'Alumni' | 'Others',
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

        const rawBenefits = calculateTotalBenefit(formatForCalculator(currentSet), userContext, slabs)

        const benefitStats = {
            earned: rawBenefits.totalAmount,
            potential: 0,
            displayPercent: rawBenefits.tierPercent
        }

        return { filteredReferrals: currentSet, benefitStats }
    }, [referrals, selectedYearId, activeYears, campusFeeMap, user, slabs])

    // Derived Display Data
    const realConfirmedCount = filteredReferrals.filter((r: any) => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted').length
    const pendingCount = filteredReferrals.length - realConfirmedCount

    // Sort recent referrals (just for display)
    const recentReferralsDisplay = [...filteredReferrals]
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

    return (
        <div className="space-y-6">
            {/* Filter UI */}
            <div className="flex justify-end">
                <div className="relative">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>{activeYears.find(y => y.id === selectedYearId)?.year || 'All Time'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute right-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                            >
                                {activeYears.map((year) => (
                                    <button
                                        key={year.id}
                                        onClick={() => {
                                            setSelectedYearId(year.id)
                                            setIsFilterOpen(false)
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${selectedYearId === year.id ? 'text-blue-400 font-medium' : 'text-slate-400'}`}
                                    >
                                        {year.year}
                                        {year.isCurrent && <span className="ml-2 text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Current</span>}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setSelectedYearId('all')
                                        setIsFilterOpen(false)
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors border-t border-white/5 ${selectedYearId === 'all' ? 'text-blue-400 font-medium' : 'text-slate-400'}`}
                                >
                                    All Time
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <ActionHomeBlueUnified
                user={{
                    fullName: user.fullName,
                    role: user.role,
                    referralCode: user.referralCode || '',
                    confirmedReferralCount: realConfirmedCount,
                    lifetimeCount: user.confirmedReferralCount,
                    yearFeeBenefitPercent: benefitStats.displayPercent,
                    potentialFeeBenefitPercent: 0,
                    benefitStatus: user.benefitStatus || 'Active',
                    empId: user.empId,
                    assignedCampus: user.assignedCampus,
                    studentFee: dynamicStudentFee || 60000,
                    isFiveStarMember: user.isFiveStarMember
                }}
                recentReferrals={recentReferralsDisplay}
                whatsappUrl={`https://wa.me/?text=${encodeURIComponent(`Hi! I'm part of the Achariya Partnership Program.\nAdmissions link: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'}/r/${user.encryptedCode}`)}`}
                referralLink={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'}/r/${user.encryptedCode}`}
                monthStats={monthStats}
                totalLeadsCount={pendingCount}
                overrideEarnedAmount={benefitStats.earned}
                overrideEstimatedAmount={benefitStats.potential}
                notifications={notifications}
                unreadCount={unreadCount}
            />
        </div>
    )
}
