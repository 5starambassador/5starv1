'use client'

import { FileDown } from 'lucide-react'
import { exportReferralsToPDF, exportUsersToPDF, generatePDFReport } from '@/lib/pdf-export'

interface ExportButtonProps {
    type: 'referrals' | 'users' | 'custom'
    data: any[]
    label?: string
    fileName?: string
    ambassadorName?: string
    title?: string
}

export function ExportButton({
    type,
    data,
    label = 'Export PDF',
    fileName,
    ambassadorName = 'Ambassador',
    title = 'Report'
}: ExportButtonProps) {

    const handleExport = () => {
        if (data.length === 0) {
            alert('No data to export')
            return
        }

        switch (type) {
            case 'referrals':
                exportReferralsToPDF(data, ambassadorName)
                break
            case 'users':
                exportUsersToPDF(data, title)
                break
            case 'custom':
                generatePDFReport({
                    title,
                    fileName: fileName || 'report',
                    columns: Object.keys(data[0]).map(key => ({
                        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                        dataKey: key
                    })),
                    data
                })
                break
        }
    }

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
        >
            <FileDown size={16} />
            {label}
        </button>
    )
}
