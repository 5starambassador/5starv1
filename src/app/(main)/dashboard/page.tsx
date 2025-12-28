import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getMyReferrals, getMyComparisonStats } from '@/app/referral-actions'
import { getSystemSettings } from '@/app/settings-actions'
import { ActionHome } from '@/components/ActionHome'

export default async function DashboardPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Admin redirects
    if (user.role === 'Super Admin') redirect('/superadmin')
    if (user.role.includes('Campus')) redirect('/campus')
    if (user.role.includes('Admin')) redirect('/admin')

    const userData = user as any
    const [referrals, systemSettings, monthStats] = await Promise.all([
        getMyReferrals(),
        getSystemSettings(),
        getMyComparisonStats()
    ])

    const settings = systemSettings as any

    // Build WhatsApp share URL
    const referralLink = `https://achariya.in/apply?ref=${userData.referralCode}`
    const rawShareText = userData.role === 'Staff'
        ? (settings?.staffReferralText || `Hello 👋 I'm part of Achariya's 5-Star Ambassador Program. I recommend you to explore admission for your child. Click here: {referralLink}`)
        : (settings?.parentReferralText || `Hello 👋 I'm part of Achariya's 5-Star Ambassador Program. I recommend you to explore admission for your child. Click here: {referralLink}`)
    const shareText = rawShareText.replace('{referralLink}', referralLink)
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

    // Prepare recent referrals for ActionHome
    const recentReferrals = referrals.slice(0, 5).map(r => ({
        id: r.leadId,
        parentName: r.parentName,
        status: r.leadStatus,
        createdAt: r.createdAt.toISOString()
    }))

    return (
        <div className="page-container">
            <ActionHome
                user={{
                    fullName: userData.fullName,
                    role: userData.role,
                    referralCode: userData.referralCode,
                    confirmedReferralCount: userData.confirmedReferralCount || 0,
                    yearFeeBenefitPercent: userData.yearFeeBenefitPercent || 0,
                    benefitStatus: userData.benefitStatus || 'Active'
                }}
                recentReferrals={recentReferrals}
                whatsappUrl={whatsappUrl}
                monthStats={monthStats}
            />
        </div>
    )
}
