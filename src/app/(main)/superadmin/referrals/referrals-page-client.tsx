'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ReferralManagementTable } from '@/app/(main)/admin/referral-table-advanced'
import { AcademicYearFilter } from '@/components/AcademicYearFilter'
import CSVUploader from '@/components/CSVUploader'
import { confirmReferral, convertLeadToStudent, rejectReferral } from '@/app/admin-actions'
import { Campus } from '@/types'

interface ReferralsPageClientProps {
    referrals: any[]
    meta: any
    campuses: Campus[]
    userRole?: string
}

export default function ReferralsPageClient({ referrals, meta, campuses, userRole }: ReferralsPageClientProps) {
    const router = useRouter()
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [uploadType, setUploadType] = useState<'referrals' | 'crm-leads'>('referrals')

    const isSuperAdmin = userRole === 'Super Admin'

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Referral Management</h1>
                <AcademicYearFilter />
            </div>

            <ReferralManagementTable
                referrals={referrals}
                meta={meta}
                onBulkAdd={() => { setUploadType('referrals'); setShowBulkUpload(true); }}
                onImportCrm={() => { setUploadType('crm-leads'); setShowBulkUpload(true); }}
                confirmReferral={confirmReferral}
                convertLeadToStudent={convertLeadToStudent}
                rejectReferral={rejectReferral}
                campuses={campuses}
                isSuperAdmin={isSuperAdmin}
            />

            {showBulkUpload && (
                <CSVUploader
                    type={uploadType}
                    onClose={() => setShowBulkUpload(false)}
                    onUpload={async () => {
                        router.refresh()
                        return { success: true, added: 0, failed: 0, errors: [] }
                    }}
                />
            )}
        </div>
    )
}
