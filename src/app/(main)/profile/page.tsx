import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'
import { decrypt } from '@/lib/encryption'

import prisma from '@/lib/prisma'
import { calculateTotalBenefit } from '@/lib/benefit-calculator'

export default async function ProfilePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Serialize user data for client component
    const isUser = 'userId' in user

    // Decrypt sensitive data if present
    const bankDetails = isUser && (user as any).bankAccountDetails ? decrypt((user as any).bankAccountDetails) : undefined
    const aadhar = isUser && (user as any).aadharNo ? decrypt((user as any).aadharNo) : undefined

    // Fetch Referrals for Benefit Calculation
    let projectedValue = 0
    let confirmedCount = 0

    if (isUser) {
        const userId = (user as any).userId

        // 0. Fetch Active Years
        const activeYears = await prisma.academicYear.findMany({ where: { isActive: true } })
        const currentYearRecord = activeYears.find(y => y.isCurrent) || activeYears[0]
        const previousYearRecord = activeYears
            .filter(y => y.endDate < currentYearRecord.startDate)
            .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]

        const activeYearStrings = activeYears.map(y => y.year)
        const CURRENT_ACADEMIC_YEAR = currentYearRecord?.year || '2025-2026'
        const PREVIOUS_ACADEMIC_YEAR = previousYearRecord?.year || '2024-2025'

        // 1. Fetch Referrals
        // We need to differentiate Current Year vs Previous Year for Long Term logic.
        // Assuming "Current Year" is '2025-2026' or '2025' admission.
        // Since we don't have a hard strict 'academicYear' on every Lead, we'll try to use 'admittedYear' or 'createdAt'.
        // Simplification: Fetch ALL referrals. Split by logic.
        const allReferrals = await prisma.referralLead.findMany({
            where: {
                userId: userId,
                // leadStatus: { not: 'Rejected' } - Removed to allow all for checking, but typically we only pay for Confirm/Admitted.
                // Current logic expects Confirmed for payout.
            },
            include: {
                student: {
                    select: {
                        annualFee: true, // Need this for Previous Year Base Calc
                        baseFee: true,
                        campusId: true,
                        academicYear: true,
                        selectedFeeType: true // Fetch Fee Type from Student
                    }
                }
            }
        })

        // Filter Current vs Previous
        const currentReferrals = allReferrals.filter(r => {
            // Priority 1: Check admittedYear first (most reliable indicator)
            if (r.admittedYear) {
                // If admitted for previous year, exclude from current
                if (r.admittedYear === PREVIOUS_ACADEMIC_YEAR) return false
                // If admitted for current or future year, include
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
            // Priority 1: Check admittedYear (includes late admissions for previous year)
            if (r.admittedYear) return r.admittedYear === PREVIOUS_ACADEMIC_YEAR

            // Priority 2: Check student's academic year
            const s = r.student
            if (s?.academicYear) return s.academicYear === PREVIOUS_ACADEMIC_YEAR

            // Priority 3: Fallback to creation date
            const createdDate = new Date(r.createdAt)
            const currentYearStart = new Date(currentYearRecord.startDate)
            return createdDate < currentYearStart
        }).filter(r => r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted')

        // Display Count comes from Current Referrals (Confirmed only)
        confirmedCount = currentReferrals.filter(r => r.leadStatus === 'Confirmed').length

        // 2. Fetch Grade-1 Fees
        const campusIds = Array.from(new Set(currentReferrals.map(r => r.campusId).filter(Boolean))) as number[]

        const grade1Fees = await prisma.gradeFee.findMany({
            where: {
                campusId: { in: campusIds },
                grade: { in: ['Grade 1', 'Grade - 1', '1', 'I'] },
                academicYear: CURRENT_ACADEMIC_YEAR // Ensure we get fees for Current Year
            }
        })

        // Map CampusID -> { otp: number, wotp: number }
        const campusFeeMap = new Map<number, { otp: number, wotp: number }>()
        grade1Fees.forEach(gf => {
            const otp = gf.annualFee_otp || 60000
            const wotp = gf.annualFee_wotp || 60000
            campusFeeMap.set(gf.campusId, { otp, wotp })
        })

        // 3. Prepare Data for Calculator
        const currentReferralsData = currentReferrals.map(r => {
            // Determine appropriate Grade-1 Fee based on confirmed Fee Type (OTP/WOTP)
            // If unknown, default to OTP? User said "after fee confirmation".
            // If not confirmed, maybe we shouldn't show exact value, but for "Projected" we assume standard (OTP).

            const feeType = r.selectedFeeType || r.student?.selectedFeeType || 'OTP' // Default to OTP for projection

            const campusFees = r.campusId ? campusFeeMap.get(r.campusId) : undefined
            const selectedGrade1Fee = (feeType === 'WOTP')
                ? (campusFees?.wotp || 60000)
                : (campusFees?.otp || 60000)

            return {
                id: r.leadId,
                campusId: r.campusId || 0,
                grade: r.gradeInterested || '',
                campusGrade1Fee: selectedGrade1Fee,
                actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
            }
        })

        // Prepare Previous Referrals Data
        // Use annualFee from Student (if admitted) OR fallback to baseFee OR referral's annualFee
        const previousReferralsData = previousReferrals.map(r => ({
            id: r.leadId,
            campusId: r.campusId || 0,
            grade: r.gradeInterested || '',
            // Use actual fee paid by student involved
            actualFee: r.student?.annualFee || r.student?.baseFee || r.annualFee || 60000
        }))

        // 4. User Context
        const userContext = {
            role: user.role,
            childInAchariya: (user as any).childInAchariya,
            studentFee: (user as any).studentFee || 60000,
            isFiveStarLastYear: (user as any).isFiveStarMember,
            previousYearReferrals: previousReferralsData
        }

        // 5. Calculate
        const { totalAmount } = calculateTotalBenefit(currentReferralsData, userContext as any)
        projectedValue = totalAmount
    }

    const userData = {
        userId: 'userId' in user ? user.userId : undefined,
        adminId: 'adminId' in user ? user.adminId : undefined,
        fullName: user.fullName,
        mobileNumber: 'mobileNumber' in user ? user.mobileNumber : undefined,
        adminMobile: 'adminMobile' in user ? (user as any).adminMobile : undefined,
        role: user.role,
        referralCode: 'referralCode' in user ? (user.referralCode ?? undefined) : undefined,
        assignedCampus: 'assignedCampus' in user ? (user.assignedCampus ?? undefined) : undefined,
        yearFeeBenefitPercent: 'yearFeeBenefitPercent' in user ? user.yearFeeBenefitPercent : undefined,
        longTermBenefitPercent: 'longTermBenefitPercent' in user ? user.longTermBenefitPercent : undefined,
        email: user.email ?? undefined,
        address: user.address ?? undefined,
        profileImage: user.profileImage ?? undefined,
        createdAt: user.createdAt.toISOString(),
        confirmedReferralCount: confirmedCount,
        studentFee: 'studentFee' in user ? (user as any).studentFee : undefined,
        projectedValue: projectedValue, // Passing calculated projected value
        // New Registration Fields
        bankAccountDetails: bankDetails, // Legacy
        bankName: isUser ? (user as any).bankName : undefined,
        accountNumber: isUser ? (user as any).accountNumber : undefined,
        ifscCode: isUser ? (user as any).ifscCode : undefined,

        childName: isUser ? (user as any).childName : undefined,
        grade: isUser ? (user as any).grade : undefined,
        childEprNo: isUser ? (user as any).childEprNo : undefined,
        childCampusId: isUser ? (user as any).childCampusId : undefined,
        empId: isUser ? (user as any).empId : undefined,
        aadharNo: aadhar,
        transactionId: isUser ? (user as any).transactionId : undefined,
        status: isUser ? (user as any).status : undefined,
        benefitStatus: isUser ? (user as any).benefitStatus : undefined
    }

    return <ProfileClient user={userData} />
}
