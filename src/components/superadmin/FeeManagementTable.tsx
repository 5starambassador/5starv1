'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Upload, Filter, Edit, Trash, FileText, Download, RefreshCw } from 'lucide-react'
import { getFeeStructure, syncStudentFees } from '@/app/fee-actions'
import { getCampuses } from '@/app/campus-actions'
import { getAcademicYears } from '@/app/settings-actions'
import CSVUploader from '@/components/CSVUploader'
import { toast } from 'sonner'

export function FeeManagementTable() {
    const [fees, setFees] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [showUploader, setShowUploader] = useState(false)

    // Filters
    const [campuses, setCampuses] = useState<any[]>([])
    const [academicYears, setAcademicYears] = useState<any[]>([])
    const [selectedAY, setSelectedAY] = useState('')
    const [selectedCampus, setSelectedCampus] = useState('')
    const [selectedGrade, setSelectedGrade] = useState('')

    const GRADES = ['Pre-KG', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

    useEffect(() => {
        loadMetadata()
        loadFees()
    }, [])

    useEffect(() => {
        loadFees()
    }, [selectedAY, selectedCampus, selectedGrade])

    const loadMetadata = async () => {
        const [cRes, ayRes] = await Promise.all([getCampuses(), getAcademicYears()])
        if (cRes.success && cRes.campuses) setCampuses(cRes.campuses)
        if (ayRes.success && ayRes.data) {
            setAcademicYears(ayRes.data)
            // Default to current year if available
            const current = ayRes.data.find((y: any) => y.isCurrent)
            if (current) setSelectedAY(current.year)
        }
    }

    const loadFees = async () => {
        setLoading(true)
        try {
            const filter: any = {}
            if (selectedAY) filter.academicYear = selectedAY
            if (selectedCampus) filter.campusId = parseInt(selectedCampus)
            if (selectedGrade) filter.grade = selectedGrade

            const res = await getFeeStructure(filter)
            if (res.success && res.data) {
                setFees(res.data)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSyncFees = async () => {
        const confirmMsg = `Are you sure you want to sync fees for:\n${selectedCampus ? 'Selected Campus' : 'All Campuses'}\n${selectedGrade ? 'Selected Grade' : 'All Grades'}\n${selectedAY ? selectedAY : 'All Years'}?\n\nThis will update student fees to match the fee structure.`

        if (!confirm(confirmMsg)) return

        setLoading(true)
        try {
            const res = await syncStudentFees(
                selectedCampus ? parseInt(selectedCampus) : undefined,
                selectedAY || undefined,
                selectedGrade || undefined
            )

            if (res.success) {
                toast.success(`Synced successfully! Updated ${res.updated} students.`)
                loadFees()
            } else {
                toast.error(res.error || 'Sync failed')
            }
        } catch (error) {
            toast.error('An error occurred during sync')
        } finally {
            setLoading(false)
        }
    }

    const filteredFees = fees.filter(f =>
        f.campus.campusName.toLowerCase().includes(search.toLowerCase()) ||
        f.grade.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={selectedAY}
                        onChange={e => setSelectedAY(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All Years</option>
                        {academicYears.map(ay => <option key={ay.id} value={ay.year}>{ay.year}</option>)}
                    </select>

                    <select
                        value={selectedCampus}
                        onChange={e => setSelectedCampus(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All Campuses</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>

                    <select
                        value={selectedGrade}
                        onChange={e => setSelectedGrade(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All Grades</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSyncFees}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-medium transition-colors"
                        title="Sync Student Fees with Fee Structure"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Sync Fees
                    </button>
                    <button
                        onClick={() => window.open('/fee_structure_template.csv')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        <Download size={16} /> Template
                    </button>
                    <button
                        onClick={() => setShowUploader(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                    >
                        <Upload size={16} /> Bulk Upload
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Campus</th>
                            <th className="px-6 py-4">Grade</th>
                            <th className="px-6 py-4">Academic Year</th>
                            <th className="px-6 py-4 text-right">Annual Fee (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading...</td></tr>
                        ) : filteredFees.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">No fee structures found.</td></tr>
                        ) : (
                            filteredFees.map((fee) => (
                                <tr key={fee.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{fee.campus.campusName}</td>
                                    <td className="px-6 py-4">{fee.grade}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${fee.academicYear === selectedAY ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {fee.academicYear || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold">
                                        {fee.annualFee.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showUploader && (
                <CSVUploader
                    type="fees"
                    onUpload={async () => ({ success: true, added: 0, failed: 0, errors: [] })} // Handled internally by CSVUploader for fees type
                    onClose={() => {
                        setShowUploader(false)
                        loadFees()
                    }}
                />
            )}
        </div>
    )
}
