'use client'

import { useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { importAmbassadors, importFees, importStudents, importCampuses } from '@/app/import-actions'

interface ImportDataPanelProps {
    type: 'fees' | 'ambassadors' | 'students' | 'campuses'
    onSuccess?: () => void
    userRole?: string
}

export function ImportDataPanel({ type, onSuccess }: ImportDataPanelProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [report, setReport] = useState<{ processed: number, errors: string[] } | null>(null)

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

            if (result?.success) {
                toast.success(`Processed ${result.processed} records`)
                setReport({ processed: result.processed, errors: result.errors || [] })
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

    const getTemplateLink = () => {
        if (type === 'fees') return '/templates/fee_structure_template.csv'
        if (type === 'ambassadors') return '/templates/ambassador_import_template.csv'
        if (type === 'students') return '/templates/student_import_template.csv'
        if (type === 'campuses') return '/templates/campus_import_template.csv'
        return '#'
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-gray-500" />
                        Bulk Import {type === 'fees' ? 'Fees' : type === 'ambassadors' ? 'Ambassadors' : type === 'campuses' ? 'Campuses' : 'Students'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload CSV file to bulk import data</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                        <a href={getTemplateLink()} download className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
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
                            {report.errors.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider">
                                        <AlertTriangle className="w-4 h-4" /> Errors ({report.errors.length})
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border border-red-100 rounded-lg p-3 bg-white text-red-500 font-mono text-xs">
                                        {report.errors.map((e, i) => <div key={i} className="border-b border-gray-50 last:border-0 py-1">{e}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
