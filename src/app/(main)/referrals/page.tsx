import { getMyReferrals } from '@/app/referral-actions'
import { CheckCircle, Clock, UserCheck } from 'lucide-react'

export default async function ReferralsPage() {
    const referrals = await getMyReferrals()


    const preAsset = referrals.filter(r => r.leadStatus === 'New' || r.leadStatus === 'Follow-up')
    const asset = referrals.filter(r => r.leadStatus === 'Confirmed')

    return (
        <div className="animate-fade-in space-y-8">
            <h1 className="text-2xl font-bold">My Referrals</h1>

            {/* Pre-Asset Section (New & Follow-up) */}
            <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#D97706' }}>
                    <span className="w-2 h-8 bg-yellow-400 rounded-full"></span>
                    Pre-Asset
                </h2>
                {preAsset.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
                        <p className="text-text-secondary text-sm">No active inquiries at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {preAsset.map(referral => (
                            <ReferralCard key={referral.leadId} referral={referral} />
                        ))}
                    </div>
                )}
            </div>

            {/* Asset Section (Confirmed) */}
            <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#059669' }}>
                    <span className="w-2 h-8 bg-green-500 rounded-full"></span>
                    Asset
                </h2>
                {asset.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
                        <p className="text-text-secondary text-sm">No confirmed referrals yet. Keep going!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {asset.map(referral => (
                            <ReferralCard key={referral.leadId} referral={referral} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function ReferralCard({ referral }: { referral: any }) {
    return (
        <div className="card flex flex-col md-flex-row md-items-center justify-between gap-4">
            <div>
                <h3 className="font-bold text-lg">{referral.parentName}</h3>
                <p className="text-xs text-text-secondary mt-1">
                    {(referral.leadStatus === 'Confirmed' && referral.student?.campus?.campusName)
                        ? <span className="font-semibold text-green-700">Joined: {referral.student.campus.campusName}</span>
                        : referral.campus}
                    {' • '}{referral.gradeInterested} • {referral.admittedYear || '2025-2026'}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <StatusBadge status={referral.leadStatus} />
                {referral.leadStatus === 'Confirmed' && referral.confirmedDate && (
                    <p className="text-xs text-success ml-2">
                        {new Date(referral.confirmedDate).toLocaleDateString()}
                    </p>
                )}
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    let colorClass = 'text-text-secondary bg-text-secondary/10'
    let icon = <Clock size={14} />

    if (status === 'Confirmed') {
        colorClass = 'text-success bg-success/10'
        icon = <CheckCircle size={14} />
    } else if (status === 'Follow-up') {
        colorClass = 'text-primary-red bg-primary-red/10'
        icon = <UserCheck size={14} />
    }

    // Since we don't have bg-opacity classes in globals properly for all colors, use inline style or simpler classes
    // I used generic `bg-primary-gold/10` in previous components, but wait, I didn't verify if I added them.
    // I added `text-success` etc., but not bg-success/10. 
    // I will use inline styles for badges to be safe.

    const colors: Record<string, string> = {
        'Confirmed': 'var(--success)',
        'Follow-up': 'var(--primary-red)',
        'New': 'var(--text-secondary)'
    }
    const color = colors[status] || 'gray'

    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{ color: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}>
            {icon}
            {status}
        </span>
    )
}
