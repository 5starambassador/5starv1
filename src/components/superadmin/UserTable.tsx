import { UserPlus, Download, MoreHorizontal, CheckCircle, XCircle, Calendar, CreditCard, Smartphone, Hash, Building, Trash2, Key } from 'lucide-react'
import { PremiumHeader } from '@/components/premium/PremiumHeader'
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
    onViewReferrals?: (referralCode: string) => void
    onResetPassword?: (id: number, name: string, type: 'user' | 'admin') => void
}

export function UserTable({
    users,
    onAddUser,
    onBulkAdd,
    onDelete,
    onToggleStatus,
    searchTerm,
    onSearchChange,
    onViewReferrals,
    onResetPassword
}: UserTableProps) {
    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'fullName',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div className="flex flex-col">
                    <p className="font-bold text-gray-900 group-hover:text-red-700 transition-colors uppercase tracking-tight text-sm">
                        {user.fullName ?? 'N/A'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Smartphone size={10} className="text-gray-400" />
                        <p className="text-[11px] font-medium text-gray-500">{user.mobileNumber ?? 'No Mobile'}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Code',
            accessorKey: 'referralCode',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <span className="font-black text-[10px] bg-red-50 text-red-700 px-2.5 py-1 rounded-lg border border-red-100 uppercase tracking-widest shadow-sm">
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
                <Badge variant={user.role === 'Staff' ? 'info' : 'outline'} className="font-black text-[10px] tracking-wider uppercase">
                    {user.role}
                </Badge>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'assignedCampus',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div className="flex items-center gap-2">
                    <Building size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-600">{user.assignedCampus || 'Global'}</span>
                </div>
            )
        },
        {
            header: 'Referrals',
            accessorKey: 'confirmedReferralCount',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div className="flex flex-col items-center">
                    <span className="font-black text-gray-900 text-sm">{user.confirmedReferralCount}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Confirmed</span>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <Badge variant={user.status === 'Active' ? 'success' : 'error'} className="font-black text-[10px] tracking-wider uppercase">
                    {user.status}
                </Badge>
            )
        },
        {
            header: 'Actions',
            accessorKey: (user: User) => user.userId,
            cell: (user: User) => (
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onToggleStatus(user.userId, user.status)}
                        className={`p-2 rounded-xl transition-all shadow-sm bg-white border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 ${user.status === 'Active' ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    >
                        {user.status === 'Active' ? <XCircle size={16} strokeWidth={2.5} /> : <CheckCircle size={16} strokeWidth={2.5} />}
                    </button>
                    <button
                        onClick={() => onDelete(user.userId, user.fullName)}
                        className="p-2 rounded-xl text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-50 shadow-sm bg-white hover:scale-110 active:scale-95 group"
                    >
                        <Trash2 size={16} strokeWidth={2.5} className="group-hover:animate-pulse" />
                    </button>
                </div>
            )
        }
    ]

    const renderExpandedRow = (user: User) => (
        <div className="p-8 bg-gradient-to-br from-gray-50/50 to-white border-x border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} className="text-red-500" />
                        Joined Date
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={12} className="text-emerald-500" />
                        Current Benefit
                    </p>
                    <p className="text-sm font-black text-emerald-600">
                        {user.yearFeeBenefitPercent}% Discount
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Building size={12} className="text-blue-500" />
                        Loyalty Benefit
                    </p>
                    <p className="text-sm font-black text-blue-600">
                        {user.longTermBenefitPercent}% Extra
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Hash size={12} className="text-purple-500" />
                        Ambassador ID
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        #{user.userId.toString().padStart(6, '0')}
                    </p>
                </div>
            </div>
            {/* Quick Actions or more details could go here */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                <button
                    onClick={() => onViewReferrals?.(user.referralCode)}
                    className="text-[10px] font-black text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl border border-red-100 transition-all uppercase tracking-widest"
                >
                    View Referral History
                </button>
                <button className="text-[10px] font-black text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 transition-all uppercase tracking-widest">
                    Edit Details
                </button>
                <button
                    onClick={() => onResetPassword?.(user.userId, user.fullName, 'user')}
                    className="text-[10px] font-black text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                    <Key size={14} /> Reset Password
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Premium Header */}
            <PremiumHeader
                title="Ambassador Network"
                subtitle="Manage parent and staff ambassadors globally"
                icon={UserPlus}
                iconColor="text-white"
                gradientFrom="from-red-600"
                gradientTo="to-red-600"
            >
                <div className="flex gap-4">
                    <button
                        onClick={onBulkAdd}
                        className="px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 uppercase tracking-widest"
                        suppressHydrationWarning
                    >
                        <Download size={18} /> Bulk Upload
                    </button>
                    <button
                        onClick={onAddUser}
                        className="px-10 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl font-black text-xs shadow-2xl shadow-gray-900/20 hover:shadow-gray-900/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 uppercase tracking-widest border border-gray-700"
                        suppressHydrationWarning
                    >
                        <UserPlus size={18} /> New Ambassador
                    </button>
                </div>
            </PremiumHeader>

            <DataTable
                data={users}
                columns={columns as any}
                searchKey={['fullName', 'referralCode', 'mobileNumber']}
                searchValue={searchTerm}
                onSearchChange={onSearchChange}
                searchPlaceholder="Search ambassadors by name, code or mobile..."
                pageSize={10}
                renderExpandedRow={renderExpandedRow}
            />
        </div>
    )
}
