import { getMyReferrals } from '@/app/referral-actions'
import { getCurrentUser } from '@/lib/auth-service'
import { ReferralsExport } from '@/components/ReferralsExport'
import { ReferralCardClient } from '@/components/ReferralCardClient'

export default async function ReferralsPage() {
    const referrals = await getMyReferrals()
    const user = await getCurrentUser()
    const userName = user?.fullName || 'Ambassador'

    const preAsset = referrals.filter(r => r.leadStatus === 'New' || r.leadStatus === 'Follow-up')
    const asset = referrals.filter(r => r.leadStatus === 'Confirmed')

    // Prepare data for PDF export
    const exportData = referrals.map(r => ({
        studentName: r.studentName || r.parentName,
        parentName: r.parentName,
        parentMobile: r.parentMobile,
        preferredCampus: r.campus,
        status: r.leadStatus,
        createdAt: r.createdAt
    }))

    return (
        <div className="animate-fade-in space-y-8 page-container">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Referrals</h1>
                {referrals.length > 0 && (
                    <ReferralsExport referrals={exportData} ambassadorName={userName} />
                )}
            </div>

            {/* Pre-Asset Section (New & Follow-up) */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <div className="w-1 h-5 bg-amber-400 rounded-full"></div>
                    <h2 className="text-lg font-bold text-gray-800">Pre-Asset</h2>
                    <span className="ml-auto bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wider">
                        {preAsset.length} {preAsset.length === 1 ? 'Lead' : 'Leads'}
                    </span>
                </div>
                {preAsset.length === 0 ? (
                    <div className="bg-gray-50/50 rounded-2xl p-12 text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold text-sm">No pre-asset inquiries at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {preAsset.map(referral => (
                            <ReferralCardClient key={referral.leadId} referral={referral} />
                        ))}
                    </div>
                )}
            </div>

            {/* Asset Section (Confirmed) */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                    <h2 className="text-lg font-bold text-gray-800">Asset</h2>
                    <span className="ml-auto bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                        {asset.length} {asset.length === 1 ? 'Asset' : 'Assets'}
                    </span>
                </div>
                {asset.length === 0 ? (
                    <div className="bg-gray-50/50 rounded-2xl p-12 text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold text-sm">No asset referrals yet. Keep going!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {asset.map(referral => (
                            <ReferralCardClient key={referral.leadId} referral={referral} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
