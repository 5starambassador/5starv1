'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Upload, Filter, Edit, Trash, FileText, Download, RefreshCw } from 'lucide-react'
import { getFeeStructure, syncStudentFees, deleteFeeStructure, bulkDeleteFeeStructures } from '@/app/fee-actions'
import { getCampuses } from '@/app/campus-actions'
import { getAcademicYears } from '@/app/settings-actions'
import CSVUploader from '@/components/CSVUploader'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { exportToCSV } from '@/lib/export-utils'

interface FeeManagementTableProps {
    academicYears?: any[]
}

export function FeeManagementTable({ academicYears: initialAcademicYears = [] }: FeeManagementTableProps) {
    const [fees, setFees] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [showUploader, setShowUploader] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isExporting, setIsExporting] = useState(false)

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        data?: any
        type?: 'sync' | 'delete' | 'bulk-delete'
    }>({
        isOpen: false,
        type: 'sync',
        data: undefined
    })

    // Filters
    const [campuses, setCampuses] = useState<any[]>([])
    const [academicYears, setAcademicYears] = useState<any[]>(initialAcademicYears)
    const [selectedAY, setSelectedAY] = useState('')
    const [selectedCampus, setSelectedCampus] = useState('')
    const [selectedGrade, setSelectedGrade] = useState('')

    const GRADES = ['Pre-Mont', 'Mont-1', 'Mont-2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

    const fetchIdRef = useRef(0)

    useEffect(() => {
        loadMetadata()
        // Removed loadFees() from here to avoid double-fetch on mount 
        // since setting selectedAY in loadMetadata will trigger the second useEffect
    }, [])

    useEffect(() => {
        loadFees()
    }, [selectedAY, selectedCampus, selectedGrade])

    const loadMetadata = async () => {
        const [cRes, ayRes] = await Promise.all([getCampuses(), getAcademicYears()])
        if (cRes.success && cRes.campuses) setCampuses(cRes.campuses)
        if (ayRes.success && ayRes.data) {
            setAcademicYears(ayRes.data)
            // Default to current year if available AND no year is currently selected
            const current = ayRes.data.find((y: any) => y.isCurrent)
            if (current && !selectedAY) setSelectedAY(current.year)
        }
    }

    const loadFees = async () => {
        const currentId = ++fetchIdRef.current
        setLoading(true)
        try {
            const filter: any = {}
            if (selectedAY) filter.academicYear = selectedAY
            if (selectedCampus) filter.campusId = parseInt(selectedCampus)
            if (selectedGrade) filter.grade = selectedGrade

            const res = await getFeeStructure(filter)

            // Only update if this is still the latest request
            if (currentId === fetchIdRef.current) {
                if (res.success && res.data) {
                    setFees(res.data)
                } else {
                    setFees([]) // Clear fees if failed or empty
                }
            }
        } catch (error) {
            console.error(error)
            // Only update if this is still the latest request
            if (currentId === fetchIdRef.current) {
                setFees([])
            }
        } finally {
            if (currentId === fetchIdRef.current) {
                setLoading(false)
            }
        }
    }

    const handleSyncFees = () => {
        setConfirmState({ isOpen: true, type: 'sync', data: undefined })
    }

    const handleBulkDelete = () => {
        setConfirmState({ isOpen: true, type: 'bulk-delete', data: undefined })
    }

    const handleDeleteFee = (id: number) => {
        setConfirmState({ isOpen: true, type: 'delete', data: id })
    }

    const handleConfirmAction = async () => {
        if (confirmState.type === 'sync') {
            await executeSyncFees()
        } else if (confirmState.type === 'delete' && confirmState.data) {
            await executeDeleteFee(confirmState.data)
        } else if (confirmState.type === 'bulk-delete') {
            await executeBulkDelete()
        }
    }

    const executeBulkDelete = async () => {
        setConfirmState({ ...confirmState, isOpen: false })
        setLoading(true)
        try {
            const res = await bulkDeleteFeeStructures(selectedIds)
            if (res.success) {
                toast.success(`${selectedIds.length} records deleted successfully`)
                setSelectedIds([])
                loadFees()
            } else {
                toast.error(res.error || 'Failed to delete selected')
            }
        } catch (error) {
            toast.error('Error deleting fees')
        } finally {
            setLoading(false)
        }
    }

    const executeDeleteFee = async (id: number) => {
        setConfirmState({ ...confirmState, isOpen: false })
        setLoading(true)
        try {
            const res = await deleteFeeStructure(id)
            if (res.success) {
                toast.success('Fee record deleted successfully')
                loadFees()
            } else {
                toast.error(res.error || 'Failed to delete')
            }
        } catch (error) {
            toast.error('Error deleting fee')
        } finally {
            setLoading(false)
        }
    }

    const executeSyncFees = async () => {
        setConfirmState({ ...confirmState, isOpen: false })
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

    // Column Definitions for DataTable
    const columns = [
        {
            header: 'Campus',
            accessorKey: (row: any) => row.campus.campusName,
            sortable: true,
            filterable: true
        },
        {
            header: 'Grade',
            accessorKey: 'grade',
            sortable: true,
            filterable: true
        },
        {
            header: 'Academic Year',
            accessorKey: 'academicYear',
            sortable: true,
            filterable: true,
            cell: (row: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.academicYear === selectedAY ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {row.academicYear || 'N/A'}
                </span>
            )
        },
        {
            header: 'OTP Fee',
            accessorKey: 'annualFee_otp',
            sortable: true,
            cell: (row: any) => (
                <div className="font-mono font-bold text-gray-900 bg-gray-50/50 px-2 py-1 rounded">
                    {(row.annualFee_otp || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
            )
        },
        {
            header: 'WOTP Fee',
            accessorKey: 'annualFee_wotp',
            sortable: true,
            cell: (row: any) => (
                <div className="font-mono font-bold text-red-600 bg-red-50/20 px-2 py-1 rounded">
                    {(row.annualFee_wotp || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
            )
        },
        {
            header: 'Actions',
            accessorKey: 'id',
            cell: (row: any) => (
                <button
                    onClick={() => handleDeleteFee(row.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Fee Structure"
                    aria-label={`Delete record for ${row.grade} at ${row.campus?.campusName || 'campus'}`}
                >
                    <Trash size={16} />
                </button>
            )
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="filter-ay" className="sr-only">Academic Year</label>
                        <select
                            id="filter-ay"
                            value={selectedAY}
                            onChange={e => setSelectedAY(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm bg-white"
                        >
                            <option value="">All Years</option>
                            {academicYears.map(ay => <option key={ay.id} value={ay.year}>{ay.year}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={handleSyncFees}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-medium transition-colors"
                        title="Sync Student Fees with Fee Structure"
                        aria-label="Sync student fees with fee structure"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Sync Fees
                    </button>
                    <button
                        onClick={async () => {
                            setIsExporting(true)
                            setTimeout(() => {
                                try {
                                    exportToCSV(fees, 'Fee_Structures', [
                                        { header: 'Campus', accessor: (f) => f.campus?.campusName },
                                        { header: 'Grade', accessor: (f) => f.grade },
                                        { header: 'Academic Year', accessor: (f) => f.academicYear },
                                        { header: 'OTP Fee', accessor: (f) => f.annualFee_otp },
                                        { header: 'WOTP Fee', accessor: (f) => f.annualFee_wotp }
                                    ])
                                    toast.success('Export completed')
                                } finally {
                                    setIsExporting(false)
                                }
                            }, 100)
                        }}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isExporting ? 'bg-gray-50 text-gray-400' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                        aria-label="Export fee structures to CSV"
                    >
                        {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                    <button
                        onClick={() => window.open('/fee_structure_template.csv')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        aria-label="Download CSV template"
                    >
                        <Download size={16} /> Template
                    </button>
                    <button
                        onClick={() => setShowUploader(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                        aria-label="Bulk upload fee structures"
                    >
                        <Upload size={16} /> Bulk Upload
                    </button>
                </div>

                {selectedIds.length > 0 && (
                    <button
                        onClick={handleBulkDelete}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors animate-in fade-in"
                        aria-label={`Delete ${selectedIds.length} selected structures`}
                    >
                        <Trash size={16} /> Delete Selected ({selectedIds.length})
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden p-1">
                <DataTable
                    data={fees}
                    columns={columns}
                    searchKey={["grade", "campus.campusName"]}
                    searchPlaceholder="Search fees..."
                    enableMultiSelection={true}
                    onSelectionChange={(selected: any[]) => setSelectedIds(selected.map(s => s.id))}
                    uniqueKey="id"
                />
            </div>

            {showUploader && (
                <CSVUploader
                    type="fees"
                    onUpload={async () => ({ success: true, added: 0, failed: 0, errors: [] })}
                    userRole={undefined}
                    onClose={() => {
                        setShowUploader(false)
                        loadFees()
                    }}
                />
            )}

            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={
                    confirmState.type === 'sync' ? "Sync Student Fees?" :
                        confirmState.type === 'bulk-delete' ? `Delete ${selectedIds.length} Fees?` :
                            "Delete Fee Structure?"
                }
                description={
                    confirmState.type === 'sync' ? (
                        <div className="text-sm">
                            Are you sure you want to sync fees for:
                            <ul className="list-disc pl-4 mt-2 mb-2 font-medium">
                                <li>{selectedCampus ? 'Selected Campus' : 'All Campuses (Selected via Filter)'}</li>
                                <li>The process compares updated Fee Rules against Student records.</li>
                            </ul>
                        </div>
                    ) : confirmState.type === 'bulk-delete' ? (
                        <p className="text-sm text-gray-600">
                            Are you sure you want to delete <b>{selectedIds.length}</b> fee structures? This action cannot be undone.
                        </p>
                    ) : (
                        <p className="text-sm text-gray-600">
                            Are you sure you want to delete this fee structure? This action cannot be undone.
                        </p>
                    )}
                confirmText={confirmState.type === 'sync' ? "Start Sync" : "Delete"}
                variant={confirmState.type === 'sync' ? "warning" : "danger"}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
            />
        </div>
    )
}
