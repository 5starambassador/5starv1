'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Download,
    ChevronRight,
    Search,
    Filter,
    ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import {
    importFees,
    importAmbassadors,
    importStudents,
    importCampuses,
    importReferrals,
    importCrmLeads
} from '@/app/import-actions'

interface ImportDataPanelProps {
    type: 'students' | 'ambassadors' | 'fees' | 'campuses' | 'referrals' | 'crm-leads'
    userRole?: string
    onSuccess?: () => void
}

export function ImportDataPanel({ type, userRole, onSuccess }: ImportDataPanelProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [results, setResults] = useState<{
        success: boolean
        processed: number
        errors: string[]
        results?: any[]
    } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile)
            setResults(null)
        } else {
            toast.error('Please select a valid CSV file')
        }
    }

    const downloadResultsCSV = (results: any[]) => {
        if (!results || results.length === 0) return

        // Extract all unique data keys from the 'data' field to build headers
        const dataKeys = new Set<string>()
        results.forEach(r => {
            if (r.data) {
                Object.keys(r.data).forEach(k => dataKeys.add(k))
            }
        })

        const headers = ["Row", "Status", "Message", ...Array.from(dataKeys)]
        const csvRows = results.map(r => {
            const rowData = Array.from(dataKeys).map(k => {
                const val = r.data?.[k]
                return `"${(val === null || val === undefined ? '' : val).toString().replace(/"/g, '""')}"`
            })
            return [
                r.row,
                r.status,
                `"${(r.reason || '').replace(/"/g, '""')}"`,
                ...rowData
            ].join(",")
        })

        const csvContent = [headers.join(","), ...csvRows].join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `import_status_${type}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleUpload = async () => {
        if (!file) return

        setIsUploading(true)
        try {
            const reader = new FileReader()
            reader.onload = async (e) => {
                const csvData = e.target?.result as string
                let res: any

                switch (type) {
                    case 'fees':
                        res = await importFees(csvData)
                        break
                    case 'ambassadors':
                        res = await importAmbassadors(csvData)
                        break
                    case 'students':
                        res = await importStudents(csvData)
                        break
                    case 'campuses':
                        res = await importCampuses(csvData)
                        break
                    case 'referrals':
                        res = await importReferrals(csvData)
                        break
                    case 'crm-leads':
                        res = await importCrmLeads(csvData)
                        break
                }

                if (res.success) {
                    toast.success(`Successfully processed ${res.processed} records`)
                    setResults(res)
                    if (res.results && res.results.length > 0) {
                        downloadResultsCSV(res.results)
                    }
                    if (onSuccess) onSuccess()
                } else {
                    toast.error(res.error || 'Import failed')
                }
                setIsUploading(false)
            }
            reader.readAsText(file)
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('An unexpected error occurred during upload')
            setIsUploading(false)
        }
    }

    const handleDownloadTemplate = () => {
        const templates = {
            students: 'admissionNumber,studentName,parentName,parentMobile,campusName,grade,section,status,academicYear',
            ambassadors: 'Full Name,Mobile Number,Role,Email,Assigned Campus,Emp ID,Child ERP No,Academic Year,Password,Referral Code,Child In Achariya,Benefit Status,Aadhar No,Address,Bank Name,Account Number,IFSC Code',
            fees: 'Campus Name,Grade,Academic Year,OTP Fee,WOTP Fee',
            campuses: 'Campus Name,Campus Code,Location,Grades,Max Capacity',
            referrals: 'Parent Name,Parent Mobile,Student Name,Grade,Section,Campus Name,Ambassador Name,Ambassador Mobile,ERP No,Academic Year,Status,Fee Type',
            'crm-leads': 'Mobile Number,Parent Name,Student Name,Grade,Campus,Visit Date,Source'
        }

        const headers = templates[type]
        if (!headers) return

        const blob = new Blob([headers], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `template_${type}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Template for ${type} downloaded`)
    }

    const typeLabels = {
        students: 'Student Records',
        ambassadors: 'Ambassador Database',
        fees: 'Fee Structure',
        campuses: 'Campus Profiles',
        referrals: 'Legacy Referrals',
        'crm-leads': 'CRM Pipeline'
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black italic text-gray-900 tracking-tight uppercase">Bulk Import: {typeLabels[type]}</h2>
                    <p className="text-gray-500 font-medium text-sm mt-1">Ingest high-volume data directly into the system</p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                    <FileText className="text-blue-600" size={18} />
                    <span className="text-blue-700 font-black text-[10px] uppercase tracking-wider">CSV Format Required</span>
                </div>
            </div>

            {!results ? (
                <div className="space-y-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`group relative border-2 border-dashed rounded-[32px] p-16 flex flex-col items-center justify-center transition-all cursor-pointer ${file
                            ? 'border-blue-200 bg-blue-50/30'
                            : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-100'
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            className="hidden"
                        />

                        <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 transition-all ${file ? 'bg-blue-600 text-white animate-bounce-subtle' : 'bg-white text-gray-400 group-hover:scale-110 shadow-sm'
                            }`}>
                            <Upload size={32} />
                        </div>

                        <div className="text-center">
                            {file ? (
                                <>
                                    <p className="text-lg font-black text-gray-900 italic">{file.name}</p>
                                    <p className="text-sm text-blue-600 font-bold mt-1">{(file.size / 1024).toFixed(2)} KB • Ready for processing</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Drop your CSV here</p>
                                    <p className="text-sm text-gray-500 font-medium mt-1">or click to browse local storage</p>
                                </>
                            )}
                        </div>

                        {file && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute top-4 right-4"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="p-2 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm border border-gray-100 transition-colors"
                                >
                                    <AlertCircle size={20} />
                                </button>
                            </motion.div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">Data Validation</p>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">Ensure headers match the required template exactly. Inconsistent data will be skipped to maintain integrity.</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <Download size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">Template Available</p>
                                <p
                                    onClick={handleDownloadTemplate}
                                    className="text-xs text-blue-600 font-bold underline cursor-pointer hover:text-blue-800 transition-colors"
                                >
                                    Download sample structure
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className={`w-full py-6 rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${!file || isUploading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-900 text-white shadow-xl shadow-gray-200 hover:scale-[1.01] active:scale-[0.99]'
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Processing Neural Pipeline...
                            </>
                        ) : (
                            <>
                                <ArrowRight size={20} />
                                Initiate System Injection
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                        <div className="bg-gray-900 p-8 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tight">Injection Complete</h3>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{results.processed} records successfully processed</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setResults(null); setFile(null); }}
                                className="px-6 py-2 border border-white/20 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                New Injection
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="space-y-6">
                                {results.errors && results.errors.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-red-500">
                                            <AlertCircle size={18} />
                                            <span className="text-xs font-black uppercase tracking-tight">Anomalies Detected ({results.errors.length})</span>
                                        </div>
                                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 max-h-48 overflow-y-auto">
                                            {results.errors.map((err, i) => (
                                                <p key={i} className="text-[11px] text-red-700 font-bold mb-2 last:mb-0 border-l-2 border-red-200 pl-3 py-1">
                                                    {err}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results.results && results.results.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Filter size={18} />
                                            <span className="text-xs font-black uppercase tracking-tight">Processing Matrix</span>
                                        </div>
                                        <div className="overflow-x-auto rounded-2xl border border-gray-50">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Row</th>
                                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {results.results.slice(0, 50).map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                                            <td className="px-4 py-3 text-xs font-bold text-gray-900">{row.row}</td>
                                                            <td className="px-4 py-3 text-xs">
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${row.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs font-medium text-gray-600 truncate max-w-xs">{row.reason}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {results.results.length > 50 && (
                                                <div className="p-4 text-center bg-gray-50/30 border-t border-gray-50">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Viewing first 50 results of {results.results.length}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
