import { UserPlus, Download, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import { User } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'

interface UserTableProps {
    users: User[]
    searchTerm: string // Keeping for external search if needed, but DataTable has its own
    onSearchChange: (value: string) => void
    onAddUser: () => void
    onBulkAdd: () => void
    onDelete: (userId: number, name: string) => void
    onToggleStatus: (userId: number, currentStatus: string) => void
}

export function UserTable({
    users,
    onAddUser,
    onBulkAdd,
    onDelete,
    onToggleStatus
}: UserTableProps) {
    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'fullName',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div>
                    <p className="font-bold text-gray-900">{user.fullName ?? 'N/A'}</p>
                    <p className="text-xs text-gray-500">{user.mobileNumber ?? 'No Mobile'}</p>
                </div>
            )
        },
        {
            header: 'Code',
            accessorKey: 'referralCode',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <span className="font-mono text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">
                    {user.referralCode || 'N/A'}
                </span>
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <Badge variant={user.role === 'Staff' ? 'info' : 'outline'}>
                    {user.role}
                </Badge>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'assignedCampus',
            sortable: true,
            filterable: true,
            cell: (user: User) => user.assignedCampus || 'Global'
        },
        {
            header: 'Referrals',
            accessorKey: 'confirmedReferralCount',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <span className="font-bold text-gray-900">{user.confirmedReferralCount}</span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <Badge variant={user.status === 'Active' ? 'success' : 'error'}>
                    {user.status}
                </Badge>
            )
        },
        {
            header: 'Actions',
            accessorKey: (user: User) => user.userId,
            cell: (user: User) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onToggleStatus(user.userId, user.status)}
                        className={`p-1.5 rounded-lg transition-colors ${user.status === 'Active' ? 'text-gray-400 hover:text-gray-600' : 'text-green-500 hover:text-green-600'}`}
                    >
                        {user.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button
                        onClick={() => onDelete(user.userId, user.fullName)}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-600 transition-colors"
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
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Ambassador Directory</h3>
                    <p className="text-sm font-medium text-gray-400 mt-1">Manage all registered staff and parent ambassadors system-wide.</p>
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
                    >
                        <Download size={18} /> Bulk Upload
                    </button>
                    <button
                        onClick={onAddUser}
                        style={{
                            background: 'linear-gradient(to right, #CC0000, #EF4444)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        className="px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-xl shadow-red-600/20 hover:shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                        <UserPlus size={20} /> Add Ambassador
                    </button>
                </div>
            </div>

            <DataTable
                data={users}
                columns={columns as any}
                searchKey="fullName"
                searchPlaceholder="Search ambassadors by name..."
                pageSize={10}
            />
        </div>
    )
}
