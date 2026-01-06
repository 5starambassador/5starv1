
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Share2, CheckCircle, AlertCircle, TrendingUp, Wallet, ArrowLeft, Star } from 'lucide-react'
import { YearDropdown } from '../dashboard/year-dropdown'
import { getSystemSettings } from '@/app/settings-actions'
import { getMyPermissions } from '@/lib/permission-service'
import { StatCard } from '@/components/ui/StatCard'
import { BenefitGrid } from '@/components/ui/BenefitGrid'

export default async function AnalyticsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Check admin roles in specific order (Super Admin contains "Admin" so check it first)
    if (user.role === 'Super Admin') {
        redirect('/superadmin')
    }
    if (user.role.includes('Campus')) {
        redirect('/campus')
    }
    if (user.role.includes('Admin')) {
        redirect('/admin')
    }

    // Use DB fields as primary source of truth.

    // Fallback cast to any because we handled Admin redirect above
    const userData = user as any;

    const isBenefitActive = userData.benefitStatus === 'Active'

    // Build WhatsApp share URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://achariya-5star.vercel.app'

    // Check if we are in development to help the user test locally
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_APP_URL) {
        baseUrl = 'http://localhost:3000'
    }

    const referralLink = `${baseUrl}/refer?ref=${userData.referralCode}`

    const systemSettings = await getSystemSettings() as any

    const welcomeMessage = userData.role === 'Staff'
        ? (systemSettings?.staffWelcomeMessage || 'Staff Ambassador Dashboard')
        : userData.role === 'Alumni'
            ? (systemSettings?.alumniWelcomeMessage || 'Alumni Ambassador Dashboard')
            : (systemSettings?.parentWelcomeMessage || 'Parent Ambassador Dashboard')

    let rawShareText = ''
    if (userData.role === 'Staff') {
        rawShareText = systemSettings?.staffReferralText || `Hello 👋 I'm part of Achariya's 5-Star Ambassador Program. I recommend you to explore admission for your child. Click here: {referralLink}`
    } else if (userData.role === 'Alumni') {
        rawShareText = systemSettings?.alumniReferralText || `Hello 👋 I'm a proud Alumni of Achariya. I recommend you to explore admission for your child and experience the 5-Star Education. Click here: {referralLink}`
    } else {
        // Parent and others
        rawShareText = systemSettings?.parentReferralText || `Hello 👋 I'm part of Achariya's 5-Star Ambassador Program. I recommend you to explore admission for your child. Click here: {referralLink}`
    }

    const shareText = rawShareText.replace(/\{referralLink\}|\$\{referralLink\}/g, referralLink)
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

    const permissions = await getMyPermissions()
    if (!permissions) redirect('/')


    return (
        <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto pb-10 font-[family-name:var(--font-outfit)]">
            {/* Import Premium Font Locally - Standard HTML for Server Components */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <style dangerouslySetInnerHTML={{
                __html: `
                :root { --font-outfit: 'Outfit', sans-serif; }
            `}} />

            {/* Back to Home Link */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold no-underline transition-colors px-2">
                <ArrowLeft size={16} strokeWidth={2.5} /> Back to Home
            </Link>

            {/* Dynamic Header - Mobile Optimized */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                <div className="flex items-center gap-5 relative z-10">
                    <div className="relative flex items-center justify-center w-6 h-6">
                        <div className={`w-3 h-3 rounded-full z-10 ${isBenefitActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${isBenefitActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                            {welcomeMessage}
                        </h1>
                        <p className="text-sm md:text-base font-medium text-gray-500 mt-1 flex items-center gap-2">
                            <span className={isBenefitActive ? 'text-emerald-600' : 'text-red-600'}>{isBenefitActive ? 'Benefits Active' : 'Benefits Inactive'}</span>
                            <span className="text-gray-300">•</span>
                            <span>{userData.academicYear || '2025-2026'}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Year Selector - Floating Card - High Z-Index */}
            <div className="-mt-6 md:-mt-8 mx-4 relative z-50 bg-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-100 p-2 md:p-3 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-75 fill-mode-both">
                <div className="bg-gray-50 rounded-xl px-4 py-1 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Academic Year</span>
                    <YearDropdown currentYear={userData.academicYear || '2025-2026'} />
                </div>
            </div>

            {/* Status Banner - Compact & Clean */}
            <div className={`
                flex items-center gap-4 p-5 md:p-6 rounded-[24px] border border-l-4 shadow-sm
                ${isBenefitActive ? 'bg-white border-l-emerald-500 border-gray-100' : 'bg-white border-l-red-500 border-gray-100'}
            `}>
                <div className={`p-2 rounded-xl flex-shrink-0 ${isBenefitActive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {isBenefitActive ? <CheckCircle size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-0.5">
                        {isBenefitActive ? 'Benefits Active' : 'Benefits Inactive'}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed">
                        {isBenefitActive
                            ? 'Make at least 1 confirmed referral every year to keep benefits active.'
                            : 'Benefits inactive. Make at least 1 confirmed referral this year to reactivate.'}
                    </p>
                </div>
            </div>

            {/* Earnings Card - Premium Gradient */}
            {permissions.savingsCalculator.access && (
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[28px] p-6 md:p-8 relative overflow-hidden shadow-[0_20px_40px_-12px_rgba(16,185,129,0.3)] text-white">
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />

                    <div className="relative z-10 flex justify-between items-start gap-4">
                        <div>
                            <p className="text-xs md:text-sm font-semibold text-emerald-100 mb-2 uppercase tracking-wider">
                                Estimated {userData.role === 'Alumni' ? 'Benefit Value' : 'Savings'} ({userData.academicYear || '2025-2026'})
                            </p>
                            <div className="flex flex-wrap items-baseline gap-3 mb-4">
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
                                    ₹{((userData.studentFee || 60000) * (userData.yearFeeBenefitPercent || 0) / 100).toLocaleString('en-IN')}
                                </h2>
                                <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                                    {userData.yearFeeBenefitPercent}% Off
                                </span>
                            </div>
                            <p className="text-[10px] md:text-xs text-emerald-100/70 font-medium max-w-sm">
                                * Based on incentive structure for the current academic year.
                            </p>
                        </div>
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
                            <Wallet size={24} className="text-white" />
                        </div>
                    </div>
                </div>
            )}





            {/* Stats Grid - Mobile Stacked */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
                {/* Confirmed Referrals - Red */}
                <StatCard
                    title="Total Referrals"
                    value={userData.confirmedReferralCount}
                    icon={TrendingUp}
                    theme="red"
                />

                {/* This Year Fee Benefit - Amber/Gold */}
                <StatCard
                    title={userData.role === 'Alumni' ? 'Year Benefit' : 'Fee Benefit'}
                    value={`${userData.yearFeeBenefitPercent}%`}
                    icon={Wallet}
                    theme="amber"
                />

                {/* Long-Term Benefit - Dynamic State */}
                <div className="md:col-span-2 lg:col-span-1">
                    {userData.confirmedReferralCount >= 5 ? (
                        <StatCard
                            title="Long-Term"
                            value={`${userData.longTermBenefitPercent}%`}
                            icon={Star}
                            theme="orange"
                        />
                    ) : (
                        <StatCard
                            title="Next Milestone"
                            value="5-Star"
                            icon={Star}
                            theme="gray"
                            subValue={`${5 - userData.confirmedReferralCount} Referrals to Unlock`}
                        />
                    )}
                </div>
            </div>

            {/* Benefit Structure Card */}
            <div className="bg-white rounded-[28px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 fill-mode-both">
                <div>
                    <h3 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                        Benefit Structure
                    </h3>

                    {/* Short Term Benefits */}
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            Short Term (This Year)
                        </h4>
                        <BenefitGrid currentCount={userData.currentYearCount !== undefined ? userData.currentYearCount : userData.confirmedReferralCount} />
                    </div>

                    {/* Long Term Benefits - Premium Dark Card */}
                    <div className="bg-gradient-to-br from-[#420a15] via-[#700f1c] to-[#8a1c2a] p-6 md:p-8 rounded-[24px] relative overflow-hidden border border-red-900/50 shadow-2xl">
                        {/* Details */}
                        <div className="relative z-10 text-center space-y-6">
                            <div>
                                <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-[0.2em] mb-2">Exclusive Rewards</p>
                                <h4 className="text-2xl md:text-3xl font-black text-white tracking-tight">Long Term Benefits</h4>
                                <p className="text-xs text-white/50 font-medium mt-1">From 2nd Year Onwards</p>
                            </div>

                            {/* Stars */}
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isAchieved = userData.confirmedReferralCount >= star;
                                    return (
                                        <div key={star} className={`transition-all duration-500 ${isAchieved ? 'scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'opacity-20 grayscale'}`}>
                                            <span className="text-2xl md:text-3xl">⭐</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Unlock Status */}
                            <div className={`
                                        inline-block px-6 py-3 rounded-xl border backdrop-blur-md
                                        ${userData.confirmedReferralCount >= 5
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-white/5 border-white/10 text-white/70'}
                                    `}>
                                {userData.confirmedReferralCount >= 5 ? (
                                    <span className="font-bold text-sm">✨ You're a 5-Star Ambassador! ✨</span>
                                ) : (
                                    <span className="text-sm font-medium">
                                        <span className="text-white font-bold">{5 - userData.confirmedReferralCount}</span> more to unlock <span className="text-amber-400 font-bold">5-Star Status</span>
                                    </span>
                                )}
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Base Benefit</p>
                                    <p className="text-3xl font-black text-amber-400">15%</p>
                                    <p className="text-[10px] text-white/30 font-medium mt-1">3% × 5 referrals</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Per Referral</p>
                                    <p className="text-3xl font-black text-emerald-400">+5%</p>
                                    <p className="text-[10px] text-white/30 font-medium mt-1">Short term extra</p>
                                </div>
                            </div>
                            <p className="text-[10px] md:text-xs text-white/30 italic mt-6">* Requires minimum 1 referral in the new year to unlock</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Referral Code Share - Premium Card */}
            {
                permissions.referralSubmission.access && (
                    <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 text-center tracking-tight mb-6">Your Referral Code</h3>

                        <div className="bg-gray-50 rounded-2xl p-5 border-2 border-dashed border-gray-200 text-center mb-6 relative group hover:bg-gray-100 transition-colors">
                            <code className="text-3xl font-black text-red-600 tracking-wider font-mono select-all">
                                {userData.referralCode}
                            </code>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                Tap to Copy
                            </div>
                        </div>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-[16px] font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <Share2 size={20} className="fill-white/20" />
                            Share on WhatsApp
                        </a>
                    </div>
                )
            }

            {
                !permissions.referralSubmission.access && (
                    <div className="bg-white rounded-[24px] p-10 border-2 border-dashed border-gray-200 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                            <Share2 size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">Referral Program Paused</h3>
                        <p className="text-sm text-gray-500">The referral program is currently disabled for your account.</p>
                    </div>
                )
            }
        </div >
    )

}

function StarIcon({ size, className, style }: { size: number, className?: string, style?: React.CSSProperties }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ stroke: 'none', color: 'rgba(255,255,255,0.9)', ...style }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    )
}

