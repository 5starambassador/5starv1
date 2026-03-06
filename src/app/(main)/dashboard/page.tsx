import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getMyReferrals, getMyComparisonStats, getDynamicFeeForUser } from '@/app/referral-actions'
import { getSystemSettings } from '@/app/settings-actions'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { encryptReferralCode } from '@/lib/crypto'
import { calculateTotalBenefit } from '@/lib/benefit-calculator'
import { getStaffBaseFee } from '@/app/fee-actions'
import { getBenefitSlabs } from '@/app/benefit-actions'
import prisma from '@/lib/prisma'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Achariya Partnership Program (APP) | 25th Year Celebration",
    description: "Join the Achariya Partnership Program (APP). Refer students, earn rewards, and be part of our 25th Year Celebration journey."
}

export default async function DashboardPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Admin redirects
    if (user.role === 'Super Admin') redirect('/superadmin')
    if (user.role === 'Finance Admin') redirect('/finance')
    if (user.role.includes('Campus')) redirect('/campus')
    if (user.role.includes('Admin') && user.role !== 'Admission Admin') redirect('/admin')

    const userData = user as any
    const [referrals, dynamicStudentFee, slabsResult, activeYears, settlements] = await Promise.all([
        getMyReferrals(),
        getDynamicFeeForUser(),
        getBenefitSlabs(),
        prisma.academicYear.findMany({ where: { isActive: true } }),
        prisma.settlement.findMany({
            where: { userId: userData.userId },
            include: { referralLead: true }
        })
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
    // We need Grade-1 Fees for these campuses to be accurate across both years
    const grade1Fees = await prisma.gradeFee.findMany({
        where: {
            campusId: { in: campusIds },
            grade: { in: ['Grade 1', 'Grade - 1', '1', 'I'] },
            academicYear: { in: activeYearStrings }
        }
    })
    const campusFeeMap: Record<string, Record<number, { otp: number, wotp: number }>> = {}

    // Initialize years in map
    activeYearStrings.forEach(y => { campusFeeMap[y] = {} })

    grade1Fees.forEach(gf => {
        if (!campusFeeMap[gf.academicYear]) campusFeeMap[gf.academicYear] = {}
        campusFeeMap[gf.academicYear][gf.campusId] = {
            otp: gf.annualFee_otp || 60000,
            wotp: gf.annualFee_wotp || 60000
        }
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://5starambassador.com'

    // Encrypt referral code for security
    const encryptedCode = encryptReferralCode(userData.referralCode)

    // Get System Settings for Referral Templates
    const systemSettings = await getSystemSettings()

    // Short URL format - cleaner and more secure
    const referralLink = `${baseUrl}/r/${encryptedCode}`

    // Use dynamic template from settings if available
    const rawTemplate = user.role === 'Staff' ? systemSettings.staffReferralText :
        user.role === 'Alumni' ? systemSettings.alumniReferralText :
            systemSettings.parentReferralText

    let shareText = ""
    if (rawTemplate) {
        shareText = rawTemplate
            .replace(/{referralLink}/g, referralLink)
            .replace(/{academicYear}/g, CURRENT_ACADEMIC_YEAR)
    } else {
        shareText = `Hi! I'm happy to share that I've joined the Achariya Partnership Program (APP). We're celebrating our 25th Year! 🎉\n\nIf you're looking for quality education and exclusive benefits, check out our admissions portal here:\n${referralLink}\n\nJoin our community today!`
    }

    // Build WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`


    // Get month stats for trends
    const monthStats = await getMyComparisonStats()


    // Serialize Campus Fee Map
    const campusFeeMapObj: Record<string, Record<number, { otp: number, wotp: number }>> = {}
    Object.keys(campusFeeMap).forEach(k => {
        campusFeeMapObj[k] = campusFeeMap[k]
    })

    // Prepare User Object for Client
    const currentAccountStatus = userData.status || 'Pending'

    console.log('DEBUG: Dashboard User Data:', {
        status: currentAccountStatus,
        benefitStatus: userData.benefitStatus,
        role: userData.role
    })

    const userForClient: any = {
        fullName: userData.fullName,
        role: userData.role,
        referralCode: userData.referralCode,
        encryptedCode: encryptedCode,
        childInAchariya: userData.childInAchariya,
        studentFee: userData.studentFee,
        isFiveStarMember: userData.isFiveStarMember,
        benefitStatus: userData.benefitStatus,
        status: currentAccountStatus,
        empId: userData.empId,
        assignedCampus: userData.assignedCampus,
        accountNumber: userData.accountNumber,
        ifscCode: userData.ifscCode,
        paymentAmount: userData.paymentAmount,
        confirmedReferralCount: userData.confirmedReferralCount
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

    // Sanitize Settlements (Date -> String)
    const serializedSettlements = settlements.map((s: any) => ({
        ...s,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
        payoutDate: s.payoutDate ? new Date(s.payoutDate).toISOString() : null,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
        referralLead: s.referralLead ? {
            ...s.referralLead,
            createdAt: s.referralLead.createdAt ? new Date(s.referralLead.createdAt).toISOString() : null,
            confirmedDate: s.referralLead.confirmedDate ? new Date(s.referralLead.confirmedDate).toISOString() : null
        } : null
    }))

    // Fetch Notifications
    const { notifications, unreadCount } = await import('@/app/notification-actions').then(m => m.getNotifications(1, 10))

    // Fetch Active External Programs
    const { getActivePrograms } = await import('@/app/program-actions')
    const { programs } = await getActivePrograms()

    return (
        <DashboardClient
            user={userForClient}
            referrals={serializedReferrals}
            activeYears={serializedActiveYears}
            settlements={serializedSettlements}
            campusFeeMap={campusFeeMap as any}
            slabs={slabsResult.data || []}
            dynamicStudentFee={dynamicStudentFee || 60000}
            monthStats={monthStats}
            whatsappUrl={whatsappUrl}
            notifications={notifications || []}
            unreadCount={unreadCount || 0}
            programs={programs || []}
            currentYear={CURRENT_ACADEMIC_YEAR}
            prevYear={PREVIOUS_ACADEMIC_YEAR}
        />
    )
}
