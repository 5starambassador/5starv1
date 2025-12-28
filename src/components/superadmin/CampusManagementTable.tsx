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
        <Card
            title="Campus Locations"
            subtitle="Manage physical school locations and their capacities"
            headerAction={
                <button
                    onClick={onAdd}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:bg-red-700 transition-all flex items-center gap-2"
                >
                    <Plus size={18} /> Add Campus
                </button>
            }
            noPadding
        >
            <div className="p-0">
                <DataTable
                    data={campuses}
                    columns={columns as any}
                    searchKey="campusName"
                    searchPlaceholder="Search campuses..."
                    pageSize={5}
                />
            </div>
        </Card>
    )
}
