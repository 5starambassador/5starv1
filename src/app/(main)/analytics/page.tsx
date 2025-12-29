
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Share2, CheckCircle, AlertCircle, TrendingUp, Wallet, List, UserPlus, BookOpen, ArrowLeft } from 'lucide-react'
import { YearDropdown } from '../dashboard/year-dropdown'
import { getSystemSettings } from '@/app/settings-actions'
import { getMyPermissions } from '@/lib/permission-service'

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
    const referralLink = `https://achariya.in/apply?ref=${userData.referralCode}` // Mock URL

    const systemSettings = await getSystemSettings() as any

    const welcomeMessage = userData.role === 'Staff'
        ? (systemSettings?.staffWelcomeMessage || 'Staff Ambassador Dashboard')
        : userData.role === 'Alumni'
            ? 'Alumni Ambassador Dashboard'
            : (systemSettings?.parentWelcomeMessage || 'Parent Ambassador Dashboard')

    let rawShareText = ''
    if (userData.role === 'Staff') {
        rawShareText = systemSettings?.staffReferralText || `Hello 👋 I’m part of Achariya’s 5-Star Ambassador Program (25th Year Celebration). I recommend you to explore admission for your child. Click here: {referralLink} – Achariya Ambassador`
    } else if (userData.role === 'Alumni') {
        rawShareText = `Hello 👋 I'm a proud Alumni of Achariya. I recommend you to explore admission for your child and experience the 5-Star Education. Click here: {referralLink}`
    } else {
        rawShareText = systemSettings?.parentReferralText || `Hello 👋 I’m part of Achariya’s 5-Star Ambassador Program (25th Year Celebration). I recommend you to explore admission for your child. Click here: {referralLink} – Achariya Ambassador`
    }

    const shareText = rawShareText.replace('{referralLink}', referralLink)
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

    const permissions = await getMyPermissions()
    if (!permissions) redirect('/')

    return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Back to Home Link */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium no-underline">
                <ArrowLeft size={16} /> Back to Home
            </Link>

            {/* Dynamic Header - Mobile Optimized */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                        <div suppressHydrationWarning style={{ width: '12px', height: '12px', background: isBenefitActive ? '#10B981' : '#EF4444', borderRadius: '50%', zIndex: 2 }}></div>
                        <div suppressHydrationWarning style={{ position: 'absolute', width: '100%', height: '100%', background: isBenefitActive ? '#10B981' : '#EF4444', borderRadius: '50%', animation: 'ripple 2s infinite', opacity: 0.4 }}></div>
                    </div>
                    <div>
                        <h1 style={{ fontSize: 'clamp(20px, 6vw, 28px)', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            {welcomeMessage}
                        </h1>
                        <p suppressHydrationWarning style={{ fontSize: '16px', color: '#6B7280', marginTop: '6px', fontWeight: '500' }}>
                            {isBenefitActive ? 'Benefits Active' : 'Benefits Inactive'} • {userData.academicYear || '2025-2026'}
                        </p>
                    </div>
                </div>
                <style>{`
                    @keyframes ripple {
                        0% { transform: scale(0.8); opacity: 0.5; }
                        100% { transform: scale(2.5); opacity: 0; }
                    }
                `}</style>
                <YearDropdown currentYear={userData.academicYear || '2025-2026'} />
            </div>

            {/* Status Banner - Compact */}
            <div style={{
                background: 'white',
                padding: '20px 24px',
                borderRadius: '20px',
                borderLeft: `5px solid ${isBenefitActive ? '#10B981' : '#EF4444'}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                {isBenefitActive ? <CheckCircle size={24} style={{ color: '#10B981', flexShrink: 0 }} /> : <AlertCircle size={24} style={{ color: '#EF4444', flexShrink: 0 }} />}
                <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {isBenefitActive ? 'Benefits Active' : 'Benefits Inactive'}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                        {isBenefitActive
                            ? 'Make at least 1 confirmed referral every year to keep benefits active. / ஒவ்வொரு ஆண்டும் குறைந்தது ஒரு உறுதியான பரிந்துரை செய்யவும்.'
                            : 'Benefits inactive. Make at least 1 confirmed referral this year to reactivate.'}
                    </p>
                </div>
            </div>

            {/* Earnings Card - Premium Gradient */}
            {permissions.savingsCalculator.access && (
                <div style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)'
                }}>
                    <div style={{ position: 'absolute', right: '-30px', bottom: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                        <div>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px', fontWeight: '500' }}>
                                Estimated {userData.role === 'Alumni' ? 'Benefit Value' : 'Savings'} ({userData.academicYear || '2025-2026'})
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'white', margin: 0 }}>
                                    ₹{((userData.studentFee || 60000) * (userData.yearFeeBenefitPercent || 0) / 100).toLocaleString('en-IN')}
                                </h2>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '8px' }}>
                                    {userData.yearFeeBenefitPercent}% Off
                                </span>
                            </div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                            <Wallet size={24} color="white" />
                        </div>
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '12px', position: 'relative', zIndex: 1 }}>
                        * Based on incentive structure for the current academic year.
                    </p>
                </div>
            )}

            {/* Stats Grid - Mobile Stacked */}
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '8px' }}>
                {/* Confirmed Referrals - Red */}
                <div className="stat-card" style={{
                    background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.3)'
                }}>
                    <TrendingUp size={56} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', position: 'relative' }}>
                        <TrendingUp size={20} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '600', letterSpacing: '0.02em' }}>Total Confirmed Referrals</span>
                    </div>
                    <p className="stat-value" style={{ fontSize: '40px', fontWeight: '800', color: 'white', margin: 0, position: 'relative' }}>{userData.confirmedReferralCount}</p>
                </div>

                {/* This Year Fee Benefit - Amber/Gold */}
                <div className="stat-card" style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)'
                }}>
                    <Wallet size={56} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', position: 'relative' }}>
                        <Wallet size={20} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '600', letterSpacing: '0.02em' }}>
                            {userData.role === 'Alumni' ? 'This Year Referral Benefit' : 'This Year Fee Benefit'}
                        </span>
                    </div>
                    <p className="stat-value" style={{ fontSize: '40px', fontWeight: '800', color: 'white', margin: 0, position: 'relative' }}>{userData.yearFeeBenefitPercent}%</p>
                </div>

                {/* Long-Term Benefit - Orange */}
                <div className="stat-card" style={{
                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.3)'
                }}>
                    <StarIcon size={56} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', position: 'relative' }}>
                        <StarIcon size={20} />
                        <span className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '600', letterSpacing: '0.02em' }}>Long-Term Benefit</span>
                    </div>
                    <p className="stat-value" style={{ fontSize: '40px', fontWeight: '800', color: 'white', margin: 0, position: 'relative' }}>{userData.longTermBenefitPercent}%</p>
                </div>
            </div>

            {/* Benefit Structure Card */}
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '20px',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0, marginBottom: '20px', letterSpacing: '-0.02em' }}>
                    Benefit Structure
                </h3>

                {/* Short Term Benefits */}
                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#DC2626', borderRadius: '50%' }}></span>
                        This Year Benefits (Short Term)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                        {[
                            { count: 1, percent: 5 },
                            { count: 2, percent: 10 },
                            { count: 3, percent: 25 },
                            { count: 4, percent: 30 },
                            { count: 5, percent: 50 }
                        ].map((tier) => {
                            const isCurrentTier = userData.confirmedReferralCount === tier.count;
                            const isAchieved = userData.confirmedReferralCount >= tier.count;
                            return (
                                <div key={tier.count} style={{
                                    padding: '12px 8px',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    background: isCurrentTier ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : isAchieved ? '#FEF3C7' : '#F9FAFB',
                                    border: isCurrentTier ? 'none' : isAchieved ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                                    boxShadow: isCurrentTier ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none'
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: isCurrentTier ? 'rgba(255,255,255,0.8)' : '#6B7280', marginBottom: '4px' }}>
                                        {tier.count} Ref{tier.count > 1 ? 's' : ''}
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: isCurrentTier ? 'white' : isAchieved ? '#92400E' : '#111827' }}>
                                        {tier.percent}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Long Term Benefits */}
                <div style={{
                    background: 'linear-gradient(135deg, #420a15 0%, #700f1c 50%, #8a1c2a 100%)',
                    padding: '20px',
                    borderRadius: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), 0 20px 40px -10px rgba(60, 0, 0, 0.6)'
                }}>
                    {/* Ambient glow */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '200px',
                        height: '200px',
                        background: 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }}></div>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '24px', position: 'relative' }}>
                        <p style={{
                            fontSize: '11px',
                            letterSpacing: '0.2em',
                            color: '#DC2626',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                            fontWeight: '600'
                        }}>
                            Exclusive Rewards
                        </p>
                        <h4 style={{
                            fontSize: '22px',
                            fontWeight: '800',
                            color: 'white',
                            margin: 0,
                            letterSpacing: '-0.02em'
                        }}>
                            Long Term Benefits
                        </h4>
                        <p style={{
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '4px'
                        }}>
                            From 2nd Year Onwards
                        </p>
                    </div>

                    {/* 5 Star Progress - Glowing Gold Stars */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px', position: 'relative' }}>
                        {[1, 2, 3, 4, 5].map((star) => {
                            const isAchieved = userData.confirmedReferralCount >= star;
                            return (
                                <div key={star} style={{
                                    fontSize: '28px',
                                    filter: isAchieved
                                        ? 'drop-shadow(0 0 8px #F59E0B) drop-shadow(0 0 20px rgba(245, 158, 11, 0.5))'
                                        : 'grayscale(1) opacity(0.2)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    ⭐
                                </div>
                            );
                        })}
                    </div>

                    {/* Status */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '24px',
                        padding: '14px 20px',
                        background: userData.confirmedReferralCount >= 5
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))'
                            : 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: userData.confirmedReferralCount >= 5
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                    }}>
                        {userData.confirmedReferralCount >= 5 ? (
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#10B981' }}>
                                ✨ You're a 5-Star Ambassador! ✨
                            </span>
                        ) : (
                            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                                {5 - userData.confirmedReferralCount} more referral{5 - userData.confirmedReferralCount > 1 ? 's' : ''} to become a <span style={{ color: '#F59E0B', fontWeight: '700' }}>5-Star Ambassador</span>
                            </span>
                        )}
                    </div>

                    {/* Benefit Details - Glass Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        position: 'relative'
                    }}>
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Base Benefit</div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: '#F59E0B', textShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>15%</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>3% × 5 referrals</div>
                        </div>
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Per New Referral</div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: '#10B981', textShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>+5%</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>short term extra</div>
                        </div>
                    </div>

                    <p style={{
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.3)',
                        marginTop: '16px',
                        textAlign: 'center',
                        fontStyle: 'italic',
                        position: 'relative'
                    }}>
                        * Requires minimum 1 referral in the new year to unlock
                    </p>
                </div>
            </div>

            {/* Referral Code Share - Premium Card */}
            {permissions.referralSubmission.access && (
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '20px',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)',
                    marginTop: '8px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0, marginBottom: '16px', textAlign: 'center', letterSpacing: '-0.02em' }}>Your Referral Code</h3>
                    <div style={{
                        background: '#F9FAFB',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px dashed #E5E7EB',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        <code style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.1em', color: '#DC2626' }}>{userData.referralCode}</code>
                    </div>
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 24px',
                            background: 'linear-gradient(135deg, #25D366, #128C7E)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: '700',
                            textDecoration: 'none',
                            boxShadow: '0 10px 20px -5px rgba(37, 211, 102, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Share2 size={20} />
                        Share on WhatsApp
                    </a>
                </div>
            )}

            {!permissions.referralSubmission.access && (
                <div style={{
                    background: 'white',
                    padding: '40px 24px',
                    borderRadius: '20px',
                    textAlign: 'center',
                    border: '2px dashed #E5E7EB'
                }}>
                    <Share2 size={48} style={{ color: '#9CA3AF', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#6B7280', margin: 0, marginBottom: '8px' }}>Referral Program Paused</h3>
                    <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>The referral program is currently disabled for your account. Please contact support for more details.</p>
                </div>
            )}
        </div>
    )

}

function StarIcon({ size, className, style }: { size: number, className?: string, style?: React.CSSProperties }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ stroke: 'none', color: 'rgba(255,255,255,0.9)', ...style }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    )
}
