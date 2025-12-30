import { MapPin, Edit, Trash, Plus, School } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { PremiumHeader } from '@/components/premium/PremiumHeader'

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
            <PremiumHeader
                title="Campus Locations"
                subtitle="Manage physical school locations and their capacities"
                icon={School}
            >
                <button
                    onClick={onAdd}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    Add Campus
                </button>
            </PremiumHeader>

            {/* Table */}
            <PremiumCard noPadding>
                <div className="overflow-x-auto max-w-full">
                    <DataTable
                        data={campuses}
                        columns={columns as any}
                        searchKey="campusName"
                        searchPlaceholder="Search campuses..."
                        pageSize={10}
                    />
                </div>
            </PremiumCard>
        </div>
    )
}
