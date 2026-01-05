'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Upload, X, Check, AlertCircle, RefreshCw, Filter, Download, FileText } from 'lucide-react'

import { toast } from 'sonner' // Added import

interface CSVUploaderProps {
    type: 'students' | 'users' | 'fees'
    onUpload: (data: any[]) => Promise<{ success: boolean; added: number; failed: number; errors: string[] }>
    onClose: () => void
}

// ... (existing code)

export default function CSVUploader({ type, onUpload, onClose }: CSVUploaderProps) {
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [parsedData, setParsedData] = useState<any[]>([])
    const [previewData, setPreviewData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle')
    const [validationError, setValidationError] = useState<string | null>(null)
    const [result, setResult] = useState<{ added: number; errors: string[] } | null>(null)
    const [mounted, setMounted] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Configuration
    const requiredHeaders = type === 'students'
        ? ['fullName', 'parentMobile', 'campusName', 'grade']
        : ['fullName', 'mobileNumber', 'role', 'email', 'assignedCampus'] // Users

    const TEMPLATES = {
        students: {
            headers: ['Parent Name', 'Parent Mobile', 'Student Name', 'Campus Code', 'Grade', 'Section', 'Roll No', 'Student ERP No', 'Academic Year', 'Fee', 'Ambassador Code'],
            filename: 'student_template.csv'
        },
        users: {
            headers: ['Full Name', 'Mobile Number', 'Role', 'Email', 'Assigned Campus', 'Emp ID', 'Child EPR No'],
            filename: 'user_template.csv'
        },
        fees: {
            headers: ['Campus Name', 'Grade', 'Academic Year', 'Annual Fee'],
            filename: 'fee_structure_template.csv'
        }
    }
    // Helper: Normalize keys
    const getNormalizedKey = (header: string, type: 'students' | 'users' | 'fees') => {
        const normHeader = header.toLowerCase().replace(/\s/g, '')

        // Extras (Check these first to avoid collisions with "Parent" if header is "Parent Ambassador")
        if (normHeader.includes('ambassadormobile')) return 'ambassadorMobile'
        if (normHeader.includes('ambassadorname')) return 'ambassadorName'
        if (normHeader.includes('parent') && normHeader.includes('mobile')) return 'parentMobile'
        if (normHeader.includes('parent') && normHeader.includes('name')) return 'parentName'

        if (normHeader.includes('campus')) {
            if (type === 'fees') return 'campusName'
            return type === 'users' ? 'assignedCampus' : 'campusName'
        }
        if (normHeader === 'email' || normHeader === 'mail') return 'email'
        if (normHeader === 'role') return 'role'

        // Identity & Relation
        if (normHeader.includes('empid') || normHeader.includes('employeeid')) return 'empId'

        // Handle ERP Number based on type
        if (normHeader.includes('erp') || normHeader.includes('childerp')) {
            return type === 'users' ? 'childEprNo' : 'admissionNumber'
        }

        // Academic
        if (normHeader === 'grade') return 'grade'
        if (normHeader === 'section') return 'section'
        if (normHeader === 'rollnumber') return 'rollNumber'
        if (normHeader === 'ay' || normHeader === 'academicyear') return 'academicYear'

        return header // Default fallback
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
        }
    }

    const handleFile = (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setValidationError('Please upload a valid CSV file.')
            return
        }
        setFile(file)
        parseCSV(file)
    }

    const parseCSV = (file: File) => {
        setStatus('parsing')
        setValidationError(null)
        const reader = new FileReader()

        reader.onload = (e) => {
            const text = e.target?.result as string
            const lines = text.split('\n').map(line => line.trim()).filter(line => line)

            if (lines.length < 2) {
                setValidationError('File is empty or missing headers')
                setStatus('idle')
                return
            }

            // Parse Headers
            const fileHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
            setHeaders(fileHeaders)

            // Validate Headers
            // Validate Headers
            const missing = requiredHeaders.filter(req => !fileHeaders.some(h => {
                const mappedKey = getNormalizedKey(h, type)
                return mappedKey === req
            }))

            if (missing.length > 0) {
                setValidationError(`Missing required columns: ${missing.join(', ')}`)
                setStatus('idle')
                return
            }

            // Parse Rows
            const data = []
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
                if (values.length !== fileHeaders.length) continue // Skip malformed rows

                const row: any = {}
                fileHeaders.forEach((header, index) => {
                    const key = getNormalizedKey(header, type)
                    row[key] = values[index]
                })
                data.push(row)
            }


            setParsedData(data)
            setPreviewData(data.slice(0, 5))
            setStatus('idle')
        }
        reader.readAsText(file)
    }

    const handleUpload = async () => {
        if (!parsedData.length) return
        setStatus('uploading')

        try {
            if (type === 'fees') {
                const fees = parsedData.map(row => ({
                    campusName: row[getNormalizedKey('Campus Name', type)] || row['campusname'] || '',
                    grade: row[getNormalizedKey('Grade', type)] || '',
                    academicYear: row[getNormalizedKey('Academic Year', type)] || '2025-2026',
                    annualFee: parseFloat(row[getNormalizedKey('Annual Fee', type)]?.toString() || '0')
                })).filter(f => f.campusName && f.grade && f.annualFee > 0)

                const { uploadFeeStructure } = await import('@/app/fee-actions')
                const res = await uploadFeeStructure(fees)

                if (res.success) {
                    toast.success(`Processed ${res.processed} fee entries`)
                    if (res.errors && res.errors.length > 0) {
                        toast.warning(`Some errors: ${res.errors.slice(0, 3).join(', ')}`)
                    }
                    onClose()
                } else {
                    toast.error(res.error || 'Failed to upload fees')
                    setStatus('error')
                }
            } else {
                // Existing student/user upload logic
                const res = await onUpload(parsedData)
                if (res.success) {
                    setStatus('success')
                    setResult({ added: res.added, errors: res.errors || [] })
                } else {
                    setValidationError('Upload failed on server.')
                    setStatus('error')
                }
            }
        } catch (err) {
            console.error(err)
            setValidationError('Network error occurred.')
            setStatus('error')
        }
    }

    const reset = () => {
        setFile(null)
        setParsedData([])
        setPreviewData([])
        setStatus('idle')
        setValidationError(null)
        setResult(null)
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[5000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Bulk Import {type === 'students' ? 'Students' : 'Users'}</h2>
                        <p className="text-sm text-gray-500 mt-1">Upload a CSV file to add multiple records</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {status === 'success' ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>
                            <p className="text-gray-600 mb-6">Successfully added <span className="font-bold text-green-600">{result?.added}</span> records.</p>

                            {result?.errors && result.errors.length > 0 && (
                                <div className="bg-red-50 text-left p-4 rounded-xl border border-red-100 max-h-48 overflow-y-auto mb-6">
                                    <p className="font-bold text-red-800 text-sm mb-2">Failed Records ({result.errors.length}):</p>
                                    <ul className="text-xs text-red-700 space-y-1">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>• {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-center gap-3">
                                <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Close</button>
                                <button onClick={reset} className="px-6 py-2 bg-primary-gold text-white rounded-lg hover:bg-yellow-500 font-medium">Upload Another</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Upload Area */}
                            {!file && (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragActive ? 'border-primary-gold bg-yellow-50' : 'border-gray-300 hover:border-primary-gold hover:bg-gray-50'
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Upload size={28} />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-700 mb-2">Drag & Drop CSV file here</p>
                                    <p className="text-sm text-gray-400 mb-6">or click to browse from your computer</p>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
                                    >
                                        Browse Files
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".csv"
                                        onChange={handleChange}
                                    />

                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left text-xs text-gray-500">
                                        <p className="font-semibold mb-1">Required Columns:</p>
                                        <code className="bg-gray-200 px-2 py-0.5 rounded text-gray-700">{requiredHeaders.join(', ')}</code>
                                    </div>
                                </div>
                            )}

                            {/* Preview Area */}
                            {file && (
                                <div className="animate-fade-in">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{file.name}</p>
                                                <p className="text-xs text-gray-500">{parsedData.length} records found</p>
                                            </div>
                                        </div>
                                        <button onClick={reset} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                            Replace
                                        </button>
                                    </div>

                                    {validationError && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                                            <AlertCircle size={16} />
                                            {validationError}
                                        </div>
                                    )}

                                    <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                                <tr>
                                                    {headers.map((h, i) => (
                                                        <th key={i} className="px-4 py-2">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        {headers.map((h, j) => {
                                                            const key = getNormalizedKey(h, type)
                                                            return <td key={j} className="px-4 py-2 text-gray-700">{row[key]}</td>
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {parsedData.length > 5 && (
                                            <div className="bg-gray-50 px-4 py-2 text-center text-xs text-gray-500 border-t border-gray-200">
                                                + {parsedData.length - 5} more records
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button onClick={onClose} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={!!validationError || status === 'uploading'}
                                            className={`px-8 py-2 rounded-lg font-bold text-white flex items-center gap-2 ${validationError || status === 'uploading'
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-amber-400 to-amber-600 hover:shadow-amber-500/20 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all'
                                                }`}
                                        >
                                            {status === 'uploading' && <RefreshCw className="animate-spin" size={16} />}
                                            {status === 'uploading' ? 'Importing...' : 'Import Data'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,

        document.body
    )
}
