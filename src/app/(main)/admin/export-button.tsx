import { useState } from 'react'
import { Loader2, Download } from 'lucide-react'

export function ExportButton({ data }: { data: any[] }) {
    const [isExporting, setIsExporting] = useState(false)

    const downloadCsv = async () => {
        if (isExporting || data.length === 0) return
        setIsExporting(true)

        // Using setTimeout to allow the UI to update with loading state before heavy processing
        setTimeout(() => {
            try {
                const headers = ['LeadID', 'Referrer', 'Role', 'ReferralCode', 'ParentName', 'ParentMobile', 'Campus', 'Grade', 'Status', 'Date']
                const csvRows = [headers.join(',')]

                data.forEach((r: any) => {
                    const row = [
                        r.leadId,
                        `"${(r.user?.fullName || '').replace(/"/g, '""')}"`,
                        r.user?.role || '',
                        r.user?.referralCode || '',
                        `"${(r.parentName || '').replace(/"/g, '""')}"`,
                        r.parentMobile || '',
                        r.campus || '',
                        r.gradeInterested || '',
                        r.leadStatus || '',
                        r.createdAt || ''
                    ]
                    csvRows.push(row.join(','))
                })

                const csvContent = csvRows.join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `referrals_export_${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            } finally {
                setIsExporting(false)
            }
        }, 100)
    }

    return (
        <button
            onClick={downloadCsv}
            disabled={isExporting || data.length === 0}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-transform active:scale-95 shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
    )
}
