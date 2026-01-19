import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getMyReferrals, getMyComparisonStats, getDynamicFeeForUser } from '@/app/referral-actions'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { encryptReferralCode } from '@/lib/crypto'
import { calculateTotalBenefit } from '@/lib/benefit-calculator'
import { getStaffBaseFee } from '@/app/fee-actions'
import { getBenefitSlabs } from '@/app/benefit-actions'
import prisma from '@/lib/prisma'

export default async function DashboardPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Admin redirects
    if (user.role === 'Super Admin') redirect('/superadmin')
    if (user.role === 'Finance Admin') redirect('/finance')
    if (user.role.includes('Campus')) redirect('/campus')
    if (user.role.includes('Admin') && user.role !== 'Admission Admin') redirect('/admin')

    const userData = user as any
    const [referrals, dynamicStudentFee, slabsResult, activeYears] = await Promise.all([
        getMyReferrals(),
        getDynamicFeeForUser(),
        getBenefitSlabs(),
        prisma.academicYear.findMany({ where: { isActive: true } })
    ])

    const currentYearRecord = activeYears.find(y => y.isCurrent) || activeYears[0]
    const previousYearRecord = activeYears
        .filter(y => y.endDate < currentYearRecord.startDate)
        .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]

    const activeYearStrings = activeYears.map(y => y.year)
    const CURRENT_ACADEMIC_YEAR = currentYearRecord?.year || '2025-2026'
    const PREVIOUS_ACADEMIC_YEAR = previousYearRecord?.year || '2024-2025'

    // Fetch Grade-1 Fees for Cash Benefit Calculations (Dashboard needs this too)
    const campusIds = Array.from(new Set(referrals.map((r: any) => r.campusId).filter(Boolean))) as number[]
    // We need Grade-1 Fees for these campuses to be accurate
    const grade1Fees = await prisma.gradeFee.findMany({
        where: {
            campusId: { in: campusIds },
            grade: { in: ['Grade 1', 'Grade - 1', '1', 'I'] },
            academicYear: '2025-2026'
        }
    })
    const campusFeeMap = new Map<number, { otp: number, wotp: number }>()
    grade1Fees.forEach(gf => {
        campusFeeMap.set(gf.campusId, {
            otp: gf.annualFee_otp || 60000,
            wotp: gf.annualFee_wotp || 60000
        })
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'

    // Encrypt referral code for security
    const encryptedCode = encryptReferralCode(userData.referralCode)

    // Short URL format - cleaner and more secure
    const referralLink = `${baseUrl}/r/${encryptedCode}`
    const shareText = `Hi! I'm part of the Achariya Partnership Program.\nAdmissions link: ${referralLink}`

    // Build WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`


    // Get month stats for trends
    const monthStats = await getMyComparisonStats()


    // Serialize Campus Fee Map (Map is not serializable)
    const campusFeeMapObj: Record<number, { otp: number, wotp: number }> = {}
    campusFeeMap.forEach((v, k) => {
        campusFeeMapObj[k] = v
    })

    // Prepare User Object for Client
    const userForClient = {
        fullName: userData.fullName,
        role: userData.role,
        referralCode: userData.referralCode,
        encryptedCode: encryptedCode,
        childInAchariya: userData.childInAchariya,
        studentFee: userData.studentFee,
        isFiveStarMember: userData.isFiveStarMember,
        benefitStatus: userData.benefitStatus,
        empId: userData.empId,
        assignedCampus: userData.assignedCampus
    }

    // Sanitize Referrals (Date -> String) to avoid serialization issues
    const serializedReferrals = referrals.map((r: any) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        confirmedDate: r.confirmedDate ? new Date(r.confirmedDate).toISOString() : null,
        student: r.student ? {
            ...r.student,
            createdAt: r.student.createdAt ? new Date(r.student.createdAt).toISOString() : null
        } : null
    }))

    // Sanitize Active Years (Date -> String)
    const serializedActiveYears = activeYears.map((y: any) => ({
        ...y,
        startDate: y.startDate ? new Date(y.startDate).toISOString() : null,
        endDate: y.endDate ? new Date(y.endDate).toISOString() : null,
        createdAt: y.createdAt ? new Date(y.createdAt).toISOString() : null,
        updatedAt: y.updatedAt ? new Date(y.updatedAt).toISOString() : null
    }))

    return (
        <DashboardClient
            user={userForClient}
            referrals={serializedReferrals}
            activeYears={serializedActiveYears}
            campusFeeMap={campusFeeMapObj as any} // Cast to any to bypass Map typing mismatch if needed
            dynamicStudentFee={dynamicStudentFee || 60000}
            monthStats={monthStats}
        />
    )
}
