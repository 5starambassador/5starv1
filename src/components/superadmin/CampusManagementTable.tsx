import { MapPin, Edit, Trash, Plus } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface Campus {
    id: number
    campusName: string
    campusCode: string
    location: string
    grades: string
    maxCapacity: number
}

interface CampusManagementTableProps {
    campuses: Campus[]
    onEdit: (campus: Campus) => void
    onDelete: (id: number, name: string) => void
    onAdd: () => void
}

export function CampusManagementTable({ campuses, onEdit, onDelete, onAdd }: CampusManagementTableProps) {
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
            sortable: true,
            cell: (campus: Campus) => (
                <span className="font-medium text-gray-700">{campus.maxCapacity}</span>
            )
        },
        {
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
        }
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white to-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            Campus Locations
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                Active
                            </span>
                        </h3>
                        <p className="text-sm font-medium text-gray-400 mt-1">Manage physical school locations and their capacities</p>
                    </div>
                    <button
                        onClick={onAdd}
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Campus
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-w-full">
                    <DataTable
                        data={campuses}
                        columns={columns as any}
                        searchKey="campusName"
                        searchPlaceholder="Search campuses..."
                        pageSize={10}
                    />
                </div>
            </div>
        </div>
    )
}
