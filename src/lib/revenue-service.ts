import prisma from '@/lib/prisma'
import { calculateTotalBenefit, ReferralData, UserContext } from '@/lib/benefit-calculator'

export interface RevenueStats {
    projectedValue: number
    confirmedCount: number
    previousYearReferrals: ReferralData[]
    // We might need to return these for context if the UI needs them raw
    currentReferrals: any[]
}

export async function getUserRevenueStats(userId: number, userRole: string, userContext: {
    childInAchariya: boolean
    studentFee: number
    isFiveStarMember: boolean
}): Promise<RevenueStats> {

    // 0. Fetch Active Years
    const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } })
    const currentYearRecord = activeYears.find(y => y.isCurrent) || activeYears[0]
    const previousYearRecord = activeYears
        .filter(y => y.endDate < currentYearRecord.startDate)
        .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]

    const CURRENT_ACADEMIC_YEAR = currentYearRecord?.year || '2025-2026'
    const PREVIOUS_ACADEMIC_YEAR = previousYearRecord?.year || '2024-2025'

    // 1. Fetch ALL Referrals
    const allReferrals = await prisma.referralLead.findMany({
        where: {
            userId: userId,
        },
        include: {
            student: {
                select: {
                    annualFee: true,
                    baseFee: true,
                    campusId: true,
                    academicYear: true,
                    selectedFeeType: true
                }
            }
        }
    })

    // 2. Filter Current vs Previous
    const currentReferrals = allReferrals.filter(r => {
        // Priority 1: Check admittedYear first
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
        const currentYearStart = new Date(currentYearRecord.startDate)
        return createdDate >= currentYearStart
    })

    const previousReferrals = allReferrals.filter(r => {
        // Priority 1: Check admittedYear
        if (r.admittedYear) return r.admittedYear === PREVIOUS_ACADEMIC_YEAR

        // Priority 2: Check student's academic year
        const s = r.student
        if (s?.academicYear) return s.academicYear === PREVIOUS_ACADEMIC_YEAR

        // Priority 3: Fallback to creation date
        const createdDate = new Date(r.createdAt)
        const currentYearStart = new Date(currentYearRecord.startDate)
        return createdDate < currentYearStart
    }).filter(r => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')

    const confirmedCount = currentReferrals.filter(r => r.leadStatus === 'Confirmed').length

    // 3. Fetch Grade-1 Fees for Current Referrals
    const campusIds = Array.from(new Set(currentReferrals.map(r => r.campusId).filter(Boolean))) as number[]

    const grade1Fees = await prisma.gradeFee.findMany({
        where: {
            campusId: { in: campusIds },
            grade: { in: ['Grade 1', 'Grade - 1', '1', 'I'] },
            academicYear: CURRENT_ACADEMIC_YEAR
        }
    })

    const campusFeeMap = new Map<number, { otp: number, wotp: number }>()
    grade1Fees.forEach(gf => {
        const otp = gf.annualFee_otp || 60000
        const wotp = gf.annualFee_wotp || 60000
        campusFeeMap.set(gf.campusId, { otp, wotp })
    })

    // 4. Prepare Data for Calculator
    const currentReferralsData: ReferralData[] = currentReferrals.map(r => {
        const feeType = r.selectedFeeType || r.student?.selectedFeeType || 'OTP'
        const campusFees = r.campusId ? campusFeeMap.get(r.campusId) : undefined
        const selectedGrade1Fee = (feeType === 'WOTP')
            ? (campusFees?.wotp || 60000)
            : (campusFees?.otp || 60000)

        // Ensure we handle potential nulls for grade safely
        return {
            id: r.leadId,
            campusId: r.campusId || 0,
            grade: r.gradeInterested || '',
            campusGrade1Fee: selectedGrade1Fee,
            actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
        }
    })

    const previousReferralsData: ReferralData[] = previousReferrals.map(r => ({
        id: r.leadId,
        campusId: r.campusId || 0,
        grade: r.gradeInterested || '',
        actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
    }))

    // 5. Calculate
    const calcContext: UserContext = {
        role: userRole as any,
        childInAchariya: userContext.childInAchariya,
        studentFee: userContext.studentFee,
        isFiveStarLastYear: userContext.isFiveStarMember,
        previousYearReferrals: previousReferralsData
    }

    const { totalAmount } = calculateTotalBenefit(currentReferralsData, calcContext)

    return {
        projectedValue: totalAmount,
        confirmedCount,
        previousYearReferrals: previousReferralsData,
        currentReferrals: currentReferrals
    }
}
