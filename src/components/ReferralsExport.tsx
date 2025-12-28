'use client'

import { ExportButton } from '@/components/ExportButton'

interface ReferralsExportProps {
    referrals: any[]
    ambassadorName: string
}

export function ReferralsExport({ referrals, ambassadorName }: ReferralsExportProps) {
    return (
        <ExportButton
            type="referrals"
            data={referrals}
            ambassadorName={ambassadorName}
            label="Download PDF"
        />
    )
}
