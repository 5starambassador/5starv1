import { useState } from 'react'
import { MapPin, Edit, Trash, Plus, School, Upload } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { PremiumHeader } from '@/components/premium/PremiumHeader'
import CSVUploader from '@/components/CSVUploader'

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
}

interface CampusManagementTableProps {
    campuses: Campus[]
    onEdit: (campus: Campus) => void
    onDelete: (id: number, name: string) => void
    onAdd: () => void
    onBulkDelete?: (ids: number[]) => void
    mode?: 'management' | 'performance'
}

export function CampusManagementTable({ campuses, onEdit, onDelete, onAdd, onBulkDelete, mode = 'management' }: CampusManagementTableProps) {
    const [selectedCampuses, setSelectedCampuses] = useState<Campus[]>([])
    const [showUpload, setShowUpload] = useState(false)

    const columns = [
        {
            header: 'Campus Name',
            accessorKey: 'campusName',
            sortable: true,
            cell: (campus: Campus) => (
                <span className="font-bold text-gray-900">{campus.campusName}</span>
            )
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
            )
        },
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
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <PremiumHeader
                title={mode === 'management' ? "Campus Locations" : "Campus Management"}
                subtitle={mode === 'management' ? "Manage physical school locations and their capacities" : "Track leads, admissions, and conversion metrics per campus"}
                icon={School}
            >
                {mode === 'management' && (
                    <div className="flex items-center gap-3">
                        {selectedCampuses.length > 0 && onBulkDelete && (
                            <button
                                onClick={() => onBulkDelete(selectedCampuses.map(c => c.id))}
                                className="px-5 py-2.5 bg-red-100/50 text-red-600 border border-red-200 rounded-xl font-bold text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
                            >
                                <Trash size={16} strokeWidth={2.5} />
                                Delete ({selectedCampuses.length})
                            </button>
                        )}
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
            </PremiumHeader>

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
