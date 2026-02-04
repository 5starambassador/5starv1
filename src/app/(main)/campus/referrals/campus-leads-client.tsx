'use client'

import { ReferralManagementTable } from '@/app/(main)/admin/referral-table-advanced'
import { confirmReferral, rejectReferral } from '@/app/admin-actions'

interface CampusLeadsClientProps {
    referrals: any[]
    meta: any
    isReadOnly?: boolean
    campuses?: any[]
}

export function CampusLeadsClient({ referrals, meta, isReadOnly = false, campuses = [] }: CampusLeadsClientProps) {
    return (
        <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100/50 overflow-hidden">
            <ReferralManagementTable
                referrals={referrals}
                meta={meta}
                isReadOnly={isReadOnly}
                isSuperAdmin={false} // Campus Heads are not Super Admins
                campuses={campuses}
                confirmReferral={confirmReferral}
                rejectReferral={rejectReferral}
                showCampusFilter={false} // Hide redundant campus filter for Campus Head
            />
        </div>
    )
}
