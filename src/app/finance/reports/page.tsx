'use client'

import { useState } from 'react'
import { getFinanceReportData, ReportType } from '@/app/actions/finance-report-actions'
import { Download, Printer, FileText, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function FinanceReportsPage() {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [reportType, setReportType] = useState<ReportType>('daily-collection')
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<any>(null)

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const result = await getFinanceReportData(reportType, startDate, endDate)
            if (result.error) {
                toast.error(result.error)
            } else {
                setReportData(result)
                toast.success('Report generated successfully')
            }
        } catch (e) {
            toast.error('Failed to generate report')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        if (!reportData?.data) return

        const headers = reportData.columns.join(',')
        const rows = reportData.data.map((row: any) =>
            reportData.columns.map((col: string) => `"${row[col] || ''}"`).join(',')
        )
        const csvContent = [headers, ...rows].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}_report_${startDate}_${endDate}.csv`
        a.click()
    }

    const downloadPDF = () => {
        if (!reportData?.data) return
        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text('Achariya 5-Star - Finance Report', 14, 22)

        doc.setFontSize(11)
        doc.text(`Type: ${reportType.replace('-', ' ').toUpperCase()}`, 14, 30)
        doc.text(`Range: ${startDate} to ${endDate}`, 14, 36)

        const tableColumn = reportData.columns
        const tableRows = reportData.data.map((row: any) => reportData.columns.map((col: string) => row[col]))

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [204, 0, 0] } // Primary Red
        })

        // Summary
        let finalY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.text('Summary:', 14, finalY)
        Object.entries(reportData.summary).forEach(([key, val]: any, index) => {
            doc.text(`${key}: ${val}`, 14, finalY + 6 + (index * 6))
        })

        doc.save(`${reportType}_report.pdf`)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">
                Finance Reports
            </h1>

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-gold/50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-gold/50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-gold/50 bg-white"
                    >
                        <option value="daily-collection">Daily Collection</option>
                        <option value="pending-fees">Pending Fees</option>
                        <option value="payouts">Payout History</option>
                    </select>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="btn btn-primary h-[42px] flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    Generate Report
                </button>
            </div>

            {/* Preview Area */}
            {reportData && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex gap-4">
                            {Object.entries(reportData.summary).map(([key, val]: any) => (
                                <div key={key} className="bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm text-sm">
                                    <span className="text-gray-500 mr-2">{key}:</span>
                                    <span className="font-bold text-gray-900">{val}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={downloadCSV} className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 px-3 py-1.5 text-sm h-auto">
                                <FileText size={16} /> CSV
                            </button>
                            <button onClick={downloadPDF} className="btn bg-primary-maroon text-white hover:bg-red-800 flex items-center gap-2 px-3 py-1.5 text-sm h-auto">
                                <Download size={16} /> PDF
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {reportData.columns.map((col: string) => (
                                        <th key={col} className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportData.data.length > 0 ? (
                                    reportData.data.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            {reportData.columns.map((col: string) => (
                                                <td key={col} className="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">
                                                    {row[col]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={reportData.columns.length} className="py-8 text-center text-gray-500">
                                            No data found for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
