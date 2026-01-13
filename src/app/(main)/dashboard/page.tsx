import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getMyReferrals, getMyComparisonStats, getDynamicFeeForUser } from '@/app/referral-actions'
import { ActionHomeBlueUnified } from '@/components/themes/ActionHomeBlueUnified'
import { encryptReferralCode } from '@/lib/crypto'


export default async function DashboardPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Admin redirects
    if (user.role === 'Super Admin') redirect('/superadmin')
    if (user.role === 'Finance Admin') redirect('/finance')
    if (user.role.includes('Campus')) redirect('/campus')
    if (user.role.includes('Admin') && user.role !== 'Admission Admin') redirect('/admin')

    const userData = user as any
    const [referrals, dynamicStudentFee] = await Promise.all([
        getMyReferrals(),
        getDynamicFeeForUser()
    ])

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
    const getBenefitPercent = (count: number) => {
        if (count >= 5) return 50
        if (count === 4) return 30
        if (count === 3) return 25
        if (count === 2) return 10
        if (count === 1) return 5
        return 0
    }
    const realBenefitPercent = getBenefitPercent(realConfirmedCount)
    // Calculate Potential/Estimated Percent based on Total Pipeline (Pending + Confirmed)
    const potentialBenefitPercent = getBenefitPercent(totalLeadsCount)

    // Calculate Volumes for Lead-Based Benefit
    const confirmedVolume = referrals
        .filter((r: any) => r.leadStatus === 'Confirmed' && r.leadStatus !== 'Rejected')
        .reduce((sum: number, r: any) => {
            const fee = r.annualFee || (r.student?.baseFee) || 60000
            return sum + fee
        }, 0)

    const totalVolume = referrals
        .filter((r: any) => r.leadStatus !== 'Rejected')
        .reduce((sum: number, r: any) => {
            const fee = r.annualFee || (r.student?.baseFee) || 60000
            return sum + fee
        }, 0)

    const earnedAmount = (confirmedVolume * realBenefitPercent) / 100
    const estimatedAmount = (totalVolume * potentialBenefitPercent) / 100

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
