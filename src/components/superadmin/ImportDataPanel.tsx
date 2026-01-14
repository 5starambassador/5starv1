'use client'

import { useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { importAmbassadors, importFees, importStudents, importCampuses, importReferrals } from '@/app/import-actions'

interface ImportDataPanelProps {
    type: 'fees' | 'ambassadors' | 'students' | 'campuses' | 'referrals'
    onSuccess?: () => void
    userRole?: string
}

export function ImportDataPanel({ type, onSuccess }: ImportDataPanelProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [report, setReport] = useState<{ processed: number, errors: string[], results?: any[] } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setReport(null)
        }
    }

    const handleImport = async () => {
        if (!file) return

        setIsUploading(true)
        try {
            const text = await file.text()
            let result;

            if (type === 'fees') result = await importFees(text)
            else if (type === 'ambassadors') result = await importAmbassadors(text)
            else if (type === 'students') result = await importStudents(text)
            else if (type === 'campuses') result = await importCampuses(text)
            else if (type === 'referrals') result = await importReferrals(text)

            if (result?.success) {
                toast.success(`Processed ${result?.processed || 0} records`)
                setReport({
                    processed: result.processed || 0,
                    errors: result.errors || [],
                    results: result.results || []
                })
                if (onSuccess) onSuccess()
            } else {
                toast.error(result?.error || 'Import failed')
            }
        } catch (error) {
            toast.error('Failed to read file')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDownloadTemplate = (e: React.MouseEvent) => {
        e.preventDefault()

        let headers = ''
        let filename = ''

        switch (type) {
            case 'fees':
                headers = 'Campus Name,Grade,Annual Fee (OTP),Annual Fee (WOTP),Academic Year\n' +
                    'ABSM - THENGAITHITTU,Grade-1,65000,72000,2025-2026'
                filename = 'fee_structure_template.csv'
                break
            case 'ambassadors':
                headers = 'Full Name,Mobile Number,Role,Email,Campus Name,Emp ID,Child ERP No,Child In Achariya (Yes/No),Benefit Status,Academic Year,Password,Referral Code\n' +
                    'John Doe,9876543210,Parent,john@example.com,ASM - KARAIKAL,,24ABS001,Yes,PendingVerification,,pass123,'

                filename = 'ambassador_import_template.csv'
                break
            case 'students':
                headers = 'Parent Mobile,Parent Name,Student Full Name,Grade,Campus Name,Section,Admission Number,Roll Number,Ambassador Mobile,Ambassador Name,Academic Year,Base Fee,Fee Type\n' +
                    '9876543210,Jane Parent,Baby Jane,Grade-1,ABSM - THENGAITHITTU,A,24ABS001,101,9998887776,Referrer Name,2025-2026,65000,OTP'
                filename = 'student_import_template.csv'
                break
            case 'campuses':
                headers = 'Campus Name,Campus Code,Location,Grades,Max Capacity\n' +
                    'Achariya School,ASM,Puducherry,"Mont-1, Grade-1",500'
                filename = 'campus_import_template.csv'
                break
            case 'referrals':
                headers = 'Parent Name,Parent Mobile,Grade,Section,Campus Name,Ambassador Mobile,Ambassador Name,Admission Number,Student Name,Academic Year,Status,Fee Type\n' +
                    'Jane Parent,9876543210,Grade-1,A,ABSM - THENGAITHITTU,9998887776,Referrer Name,24ABS001,Baby Jane,2025-2026,Confirmed,OTP'
                filename = 'referral_import_template.csv'
                break
        }

        if (!headers) return

        // Add BOM for Excel compatibility
        const BOM = '\uFEFF'
        const csvContent = BOM + headers

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.style.display = 'none'
        link.href = url
        link.download = filename // Direct property assignment

        document.body.appendChild(link)
        link.click()

        // standard cleanup
        setTimeout(() => {
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }, 100)
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-gray-500" />
                        Bulk Import {type === 'fees' ? 'Fees' : type === 'ambassadors' ? 'Ambassadors' : type === 'referrals' ? 'Referrals' : type === 'campuses' ? 'Campuses' : 'Students'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload CSV file to bulk import data</p>
                    <div className="mt-3 bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-800 leading-relaxed font-bold">
                            {type === 'fees' && "Ensure both 'annualFee_otp' and 'annualFee_wotp' columns are Present."}
                            {type === 'students' && "For Student imports, 'feeType' (OTP/WOTP) is mandatory for linked referrals."}
                            {type === 'referrals' && "For 'Confirmed' status referrals, 'admissionNumber' (ERP) and 'feeType' (OTP/WOTP) are mandatory."}
                            {!['fees', 'students', 'referrals'].includes(type) && "Verify all required columns match the template exactly."}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                        <a href="#" onClick={handleDownloadTemplate} className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                            <FileText className="w-4 h-4" /> Download Template
                        </a>
                    </div>

                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors bg-gray-50/50">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={!file || isUploading}
                            className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all shadow-lg shadow-gray-200"
                        >
                            {isUploading ? (
                                <>Processing...</>
                            ) : (
                                <><Upload size={18} /> Start Import</>
                            )}
                        </button>
                    </div>

                    {report && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-green-600 font-bold mb-2 text-sm uppercase tracking-wider">
                                <CheckCircle className="w-4 h-4" /> Success: {report.processed} records
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-2">
                                {report.errors.length > 0 && (
                                    <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider">
                                        <AlertTriangle className="w-4 h-4" /> Errors ({report.errors.length})
                                    </div>
                                )}
                                <div className="flex-1"></div>
                                <button
                                    onClick={async () => {
                                        if (!file || !report.results) return
                                        const text = await file.text()
                                        // Handle different line endings
                                        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
                                        const header = lines[0]
                                        const dataRows = lines.slice(1)

                                        // Create a map of row number to result
                                        const resultMap = new Map(report.results.map((r: any) => [r.row, r]))

                                        // Generate new CSV content
                                        const newRows = dataRows.map((line, index) => {
                                            // Row number in results is 1-based index including header (header is row 1, first data is row 2)
                                            // Our loop index is 0-based from dataRows.
                                            // So dataRows[0] -> Row 2.
                                            const rowNum = index + 2
                                            const res = resultMap.get(rowNum)

                                            if (res) {
                                                // Status and Reason
                                                const status = res.status || 'Unknown'
                                                const reason = (res.reason || '').replace(/"/g, '""') // Escape quotes
                                                return `${line},${status},"${reason}"`
                                            } else {
                                                return `${line},Skipped,"Row number mismatch or skipped"`
                                            }
                                        })

                                        const Bom = '\uFEFF'
                                        const csvContent = `${Bom}${header},Upload Status,Message\n${newRows.join('\n')}`

                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
                                        const url = URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.download = `import_status_report_${type}_${new Date().getTime()}.csv`
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        URL.revokeObjectURL(url)
                                    }}
                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-blue-200"
                                >
                                    <FileText size={14} /> Download Full Status Report
                                </button>
                            </div>

                            {report.errors.length > 0 && (
                                <div className="max-h-40 overflow-y-auto border border-red-100 rounded-lg p-3 bg-white text-red-500 font-mono text-xs mt-2">
                                    {report.errors.map((e, i) => <div key={i} className="border-b border-gray-50 last:border-0 py-1">{e}</div>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
