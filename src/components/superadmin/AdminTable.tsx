import { ShieldCheck, Download, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'

interface Admin {
    adminId: number
    adminName: string
    adminMobile: string
    role: string
    assignedCampus: string | null
    status: string
}

interface AdminTableProps {
    admins: Admin[]
    searchTerm: string // Keeping for interface compatibility but DataTable has internal search
    onSearchChange: (value: string) => void
    onAddAdmin: () => void
    onBulkAdd: () => void
    onDelete: (adminId: number, name: string) => void
    onToggleStatus: (adminId: number, currentStatus: string) => void
}

export function AdminTable({
    admins,
    onAddAdmin,
    onBulkAdd,
    onDelete,
    onToggleStatus
}: AdminTableProps) {
    const columns = [
        {
            header: 'Administrator',
            accessorKey: 'adminName',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <div>
                    <p className="font-bold text-gray-900">{admin.adminName ?? 'N/A'}</p>
                    <p className="text-xs text-gray-500">{admin.adminMobile ?? 'No Mobile'}</p>
                </div>
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <Badge variant="outline">
                    {admin.role}
                </Badge>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'assignedCampus',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => admin.assignedCampus || 'Global'
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <Badge variant={admin.status === 'Active' ? 'success' : 'error'}>
                    {admin.status}
                </Badge>
            )
        },
        {
            header: 'Actions',
            accessorKey: (admin: Admin) => admin.adminId,
            cell: (admin: Admin) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onToggleStatus(admin.adminId, admin.status)}
                        className={`p-1.5 rounded-lg transition-colors ${admin.status === 'Active' ? 'text-gray-400 hover:text-gray-600' : 'text-green-500 hover:text-green-600'}`}
                    >
                        {admin.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button
                        onClick={() => onDelete(admin.adminId, admin.adminName)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between flex-wrap gap-6 premium-border">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Administrator Directory</h3>
                    <p className="text-sm font-medium text-gray-400 mt-1">Manage system-wide and campus-specific administrators.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={onBulkAdd}
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            color: '#374151',
                            cursor: 'pointer'
                        }}
                        className="px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 hover:shadow-lg transition-all flex items-center gap-2"
                        suppressHydrationWarning
                    >
                        <Download size={18} /> Bulk Upload
                    </button>
                    <button
                        onClick={onAddAdmin}
                        style={{
                            background: 'linear-gradient(to right, #111827, #374151)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        className="px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                        suppressHydrationWarning
                    >
                        <ShieldCheck size={20} /> Add Administrator
                    </button>
                </div>
            </div>

            <DataTable
                data={admins}
                columns={columns as any}
                searchKey="adminName"
                searchPlaceholder="Search administrators by name..."
                pageSize={10}
            />
        </div>
    )
}
