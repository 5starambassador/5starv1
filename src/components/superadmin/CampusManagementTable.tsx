import { useState } from 'react'
import { MapPin, Edit, Trash, Plus, School, Upload, Download } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'

import CSVUploader from '@/components/CSVUploader'
import { exportToCSV } from '@/lib/export-utils'

interface Campus {
    id: number
    campusName: string
    campusCode: string
    location: string
    grades: string
    maxCapacity: number
    totalLeads?: number
    confirmed?: number
    conversionRate?: number
    isActive?: boolean
}

interface CampusManagementTableProps {
    campuses: Campus[]
    onEdit: (campus: Campus) => void
    onDelete: (id: number, name: string) => void
    onAdd: () => void
    onBulkDelete?: (ids: number[]) => void
    onToggleStatus?: (id: number, currentStatus: boolean) => void
    mode?: 'management' | 'performance'
}

export function CampusManagementTable({ campuses, onEdit, onDelete, onAdd, onBulkDelete, onToggleStatus, mode = 'management' }: CampusManagementTableProps) {
    const [selectedCampuses, setSelectedCampuses] = useState<Campus[]>([])
    const [showUpload, setShowUpload] = useState(false)

    const columns = [
        {
            header: 'Campus Name',
            accessorKey: 'campusName',
            sortable: true,
            cell: (campus: Campus) => (
                <span className="font-bold text-gray-900">{campus.campusName}</span>
            ),
            filterable: true
        },
        {
            header: 'Code',
            accessorKey: 'campusCode',
            sortable: true,
            cell: (campus: Campus) => (
                <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                    {campus.campusCode}
                </code>
            )
        },
        {
            header: 'Location',
            accessorKey: 'location',
            sortable: true,
            cell: (campus: Campus) => (
                <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{campus.location}</span>
                </div>
            ),
            filterable: true
        },
        ...(mode === 'management' ? [{
            header: 'Status',
            accessorKey: 'isActive',
            sortable: true,
            cell: (campus: Campus) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onToggleStatus && onToggleStatus(campus.id, campus.isActive ?? true)}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${campus.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
                            }`}
                        title={campus.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                    >
                        {campus.isActive ? 'Active' : 'Inactive'}
                    </button>
                </div>
            ),
            filterable: true
        }] : []),
        ...(mode === 'management' ? [
            {
                header: 'Grades',
                accessorKey: 'grades',
                sortable: true,
                cell: (campus: Campus) => (
                    <Badge variant="outline">{campus.grades}</Badge>
                )
            },
            {
                header: 'Capacity',
                accessorKey: 'maxCapacity',
                cell: (campus: Campus) => (
                    <span className="font-medium text-gray-700">{campus.maxCapacity}</span>
                )
            }
        ] : []),
        ...(mode === 'performance' ? [
            {
                header: 'Leads',
                accessorKey: 'totalLeads',
                sortable: true,
                cell: (campus: Campus) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{campus.totalLeads || 0}</span>
                    </div>
                )
            },
            {
                header: 'Admissions',
                accessorKey: 'confirmed',
                sortable: true,
                cell: (campus: Campus) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-emerald-600">{campus.confirmed || 0}</span>
                    </div>
                )
            },
            {
                header: 'Conv. %',
                accessorKey: 'conversionRate',
                sortable: true,
                cell: (campus: Campus) => (
                    <span className={`font-bold ${campus.conversionRate && campus.conversionRate > 20 ? 'text-emerald-600' : 'text-gray-600'}`}>
                        {campus.conversionRate || 0}%
                    </span>
                )
            }
        ] : []),
        ...(mode === 'management' ? [{
            header: 'Actions',
            accessorKey: (campus: Campus) => campus.id,
            cell: (campus: Campus) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onEdit(campus)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(campus.id, campus.campusName)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <Trash size={16} />
                    </button>
                </div>
            )
        }] : [])
    ]

    return (
        <div className="space-y-6 animate-fade-in" suppressHydrationWarning>
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <School className="text-gray-900" size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {mode === 'management' ? "Campus Locations" : "Campus Management"}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            {mode === 'management' ? "Manage physical school locations and their capacities" : "Track leads, admissions, and conversion metrics per campus"}
                        </p>
                    </div>
                </div>

                {mode === 'management' && (
                    <div className="flex flex-wrap items-center gap-3">
                        {selectedCampuses.length > 0 && onBulkDelete && (
                            <button
                                onClick={() => onBulkDelete(selectedCampuses.map(c => c.id))}
                                className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-xs hover:bg-red-100 transition-all flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
                            >
                                <Trash size={16} strokeWidth={2.5} />
                                Delete ({selectedCampuses.length})
                            </button>
                        )}
                        <button
                            onClick={() => exportToCSV(campuses, 'Campus_List', [
                                { header: 'Name', accessor: (c) => c.campusName },
                                { header: 'Code', accessor: (c) => c.campusCode },
                                { header: 'Location', accessor: (c) => c.location },
                                { header: 'Capacity', accessor: (c) => c.maxCapacity },
                                { header: 'Grades', accessor: (c) => c.grades },
                                { header: 'Active', accessor: (c) => c.isActive ? 'Yes' : 'No' }
                            ])}
                            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                            <Download size={16} strokeWidth={2.5} />
                            Export
                        </button>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                            <Upload size={16} strokeWidth={2.5} />
                            Bulk Upload
                        </button>
                        <button
                            onClick={onAdd}
                            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} strokeWidth={2.5} />
                            Add Campus
                        </button>
                    </div>
                )}
            </div>

            <div className="w-full xl:max-w-[calc(100vw-340px)] mx-auto overflow-hidden">
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                    <DataTable
                        data={campuses}
                        columns={columns as any}
                        searchKey="campusName"
                        searchPlaceholder="Search campuses..."
                        pageSize={10}
                        enableMultiSelection={true}
                        onSelectionChange={(selected) => setSelectedCampuses(selected)}
                        uniqueKey="id"
                    />
                </div>
            </div>

            {showUpload && (
                <CSVUploader
                    type="campuses"
                    onClose={() => setShowUpload(false)}
                />
            )}
        </div>
    )
}
