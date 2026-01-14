import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getMyReferrals, getMyComparisonStats, getDynamicFeeForUser } from '@/app/referral-actions'
import { ActionHomeBlueUnified } from '@/components/themes/ActionHomeBlueUnified'
import { encryptReferralCode } from '@/lib/crypto'
import { calculateBenefitPercent, calculateBenefitAmount } from '@/lib/benefit-calculator'
import { getStaffBaseFee } from '@/app/fee-actions'
import { getBenefitSlabs } from '@/app/benefit-actions'


export default async function DashboardPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Admin redirects
    if (user.role === 'Super Admin') redirect('/superadmin')
    if (user.role === 'Finance Admin') redirect('/finance')
    if (user.role.includes('Campus')) redirect('/campus')
    if (user.role.includes('Admin') && user.role !== 'Admission Admin') redirect('/admin')

    const userData = user as any
    const [referrals, dynamicStudentFee, slabsResult] = await Promise.all([
        getMyReferrals(),
        getDynamicFeeForUser(),
        getBenefitSlabs()
    ])

    // Map Slabs to Calculator Format
    const benefitTiers = slabsResult.success && slabsResult.data
        ? slabsResult.data.map(s => ({ count: s.referralCount, percent: s.yearFeeBenefitPercent }))
        : undefined // Will fallback to defaults

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


    // Prepare recent referrals for ActionHome
    const recentReferrals = referrals.slice(0, 5).map((r: any) => ({
        id: r.leadId,
        parentName: r.parentName,
        studentName: r.studentName,
        status: r.leadStatus,
        createdAt: r.createdAt.toISOString()
    }))

    // FORCE REVALIDATION: Debug Logging
    console.log('[Dashboard] Referrals Fetched:', referrals.length)

    // Calculate Real-Time Counts (Fixes Database Double-Count Issue)
    const realConfirmedCount = referrals.filter((r: any) => r.leadStatus === 'Confirmed').length
    const totalLeadsCount = referrals.length
    // "Pending" bucket: Not Confirmed AND Not Rejected (if rejected exists)
    // This creates the "Move" effect: Pending -> Confirmed
    const pendingCount = referrals.filter((r: any) => r.leadStatus !== 'Confirmed' && r.leadStatus !== 'Rejected').length

    // Calculate Real-Time Benefit Percent (Ensure Calculation is strictly based on Confirmed)
    const realBenefitPercent = calculateBenefitPercent(realConfirmedCount, benefitTiers)
    // Calculate Potential/Estimated Percent based on Total Pipeline (Pending + Confirmed)
    const potentialBenefitPercent = calculateBenefitPercent(totalLeadsCount, benefitTiers)

    // Benefit Calculation Base Variable
    let benefitBaseVolume = userData.studentFee || 60000 // Default to Student Fee (for Parents)

    // Override for Staff:
    // 1. If Child in Achariya -> Use Child's Fee (studentFee)
    // 2. Else -> Use Grade-1 Fee of assigned Branch
    if (userData.role === 'Staff') {
        if (userData.childInAchariya && userData.studentFee > 0) {
            benefitBaseVolume = userData.studentFee
        } else if (userData.assignedCampus) {
            benefitBaseVolume = await getStaffBaseFee(userData.assignedCampus)
        }
    }

    // Calculate Volumes for Lead-Based Benefit
    const confirmedVolume = referrals
        .filter((r: any) => r.leadStatus === 'Confirmed' && r.leadStatus !== 'Rejected')
        .reduce((sum: number, r: any) => {
            // For Staff, use the Grade-1 Fee (benefitBaseVolume) for every confirmed referral
            // For Parents, it's usually "My Child's Fee" (benefitBaseVolume) as well (fee waiver)
            return sum + benefitBaseVolume
        }, 0)

    const totalVolume = referrals
        .filter((r: any) => r.leadStatus !== 'Rejected')
        .reduce((sum: number, r: any) => {
            return sum + benefitBaseVolume
        }, 0)

    const earnedAmount = calculateBenefitAmount(confirmedVolume, realBenefitPercent)
    const estimatedAmount = calculateBenefitAmount(totalVolume, potentialBenefitPercent)

    return (
        <div className="-mx-2 xl:mx-0 relative">
            {/* Royal Glass Background Layer */}
            <div className="fixed inset-0 bg-[#0f172a] -z-50">
                {/* Brightness Booster Layer - Global Fix */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/60 to-slate-900 z-0 opacity-100" />
            </div>
            <div className="fixed inset-0 bg-[url('/bg-pattern.png')] bg-cover opacity-10 -z-40 pointer-events-none" />
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 -z-40 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 -z-40 pointer-events-none" />

            <ActionHomeBlueUnified
                user={{
                    fullName: userData.fullName,
                    role: userData.role,
                    referralCode: userData.referralCode,
                    confirmedReferralCount: realConfirmedCount, // Real-Time Count
                    yearFeeBenefitPercent: realBenefitPercent, // Real-Time Earned Percent
                    potentialFeeBenefitPercent: potentialBenefitPercent, // Real-Time Estimated Percent
                    benefitStatus: userData.benefitStatus || 'Active',
                    empId: userData.empId,
                    assignedCampus: userData.assignedCampus,
                    studentFee: dynamicStudentFee || 60000
                }}
                recentReferrals={recentReferrals}
                whatsappUrl={whatsappUrl}
                referralLink={referralLink}
                monthStats={monthStats}
                totalLeadsCount={pendingCount} // Passing "Pending" count to this prop for separate buckets
                overrideEarnedAmount={earnedAmount}
                overrideEstimatedAmount={estimatedAmount}
            />
        </div>
    )
}
