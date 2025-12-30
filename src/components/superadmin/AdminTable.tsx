import { ShieldCheck, Download, MoreHorizontal, CheckCircle, XCircle, Calendar, Hash, Building2, Smartphone, Shield, Trash2, Key } from 'lucide-react'
import { PremiumHeader } from '@/components/premium/PremiumHeader'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Admin } from '@/types'

interface AdminTableProps {
    admins: Admin[]
    searchTerm: string // Keeping for interface compatibility but DataTable has internal search
    onSearchChange: (value: string) => void
    onAddAdmin: () => void
    onBulkAdd: () => void
    onDelete: (adminId: number, name: string) => void
    onToggleStatus: (adminId: number, currentStatus: string) => void
    onResetPassword?: (id: number, name: string, type: 'user' | 'admin') => void
}

export function AdminTable({
    admins,
    onAddAdmin,
    onBulkAdd,
    onDelete,
    onToggleStatus,
    onResetPassword
}: AdminTableProps) {
    const columns = [
        {
            header: 'Administrator',
            accessorKey: 'adminName',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <div className="flex flex-col">
                    <p className="font-bold text-gray-900 group-hover:text-red-700 transition-colors uppercase tracking-tight text-sm">
                        {admin.adminName ?? 'N/A'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Smartphone size={10} className="text-gray-400" />
                        <p className="text-[11px] font-medium text-gray-500">{admin.adminMobile ?? 'No Mobile'}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <Badge variant="outline" className="font-black text-[10px] tracking-wider uppercase border-gray-200">
                    {admin.role}
                </Badge>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'assignedCampus',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-600">{admin.assignedCampus || 'Global Management'}</span>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (admin: Admin) => (
                <Badge variant={admin.status === 'Active' ? 'success' : 'error'} className="font-black text-[10px] tracking-wider uppercase">
                    {admin.status}
                </Badge>
            )
        },
        {
            header: 'Actions',
            accessorKey: (admin: Admin) => admin.adminId,
            cell: (admin: Admin) => (
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onToggleStatus(admin.adminId, admin.status)}
                        className={`p-2 rounded-xl transition-all shadow-sm bg-white border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 ${admin.status === 'Active' ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    >
                        {admin.status === 'Active' ? <XCircle size={16} strokeWidth={2.5} /> : <CheckCircle size={16} strokeWidth={2.5} />}
                    </button>
                    <button
                        onClick={() => onDelete(admin.adminId, admin.adminName)}
                        className="p-2 rounded-xl text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-50 shadow-sm bg-white hover:scale-110 active:scale-95 group"
                    >
                        <Trash2 size={16} strokeWidth={2.5} className="group-hover:animate-pulse" />
                    </button>
                </div>
            )
        }
    ]

    const renderExpandedRow = (admin: Admin) => (
        <div className="p-8 bg-gradient-to-br from-gray-50/50 to-white border-x border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} className="text-red-500" />
                        Account Created
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        {new Date(admin.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} className="text-blue-500" />
                        Privilege Level
                    </p>
                    <p className="text-sm font-black text-blue-600 uppercase">
                        {admin.role === 'Super Admin' ? 'System Owner' : 'Campus Head'}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Hash size={12} className="text-purple-500" />
                        Administrator ID
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        #ADM-{admin.adminId.toString().padStart(4, '0')}
                    </p>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                <button
                    onClick={() => onResetPassword?.(admin.adminId, admin.adminName, 'admin')}
                    className="text-[10px] font-black text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                    <Key size={14} /> Reset Password
                </button>
                <button className="text-[10px] font-black text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 transition-all uppercase tracking-widest">
                    Audit Activity
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Premium Header */}
            <PremiumHeader
                title="System Administrators"
                subtitle="Manage executive and operational access controls"
                icon={ShieldCheck}
                iconColor="text-white"
                iconBgColor="bg-gray-900"
                gradientFrom="from-gray-900"
                gradientTo="to-gray-800"
            >
                <div className="flex gap-4">
                    <button
                        onClick={onBulkAdd}
                        className="px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 uppercase tracking-widest"
                        suppressHydrationWarning
                    >
                        <Download size={18} /> Export List
                    </button>
                    <button
                        onClick={onAddAdmin}
                        className="px-10 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-black text-xs shadow-2xl shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 uppercase tracking-widest border border-red-500"
                        suppressHydrationWarning
                    >
                        <ShieldCheck size={18} /> New Administrator
                    </button>
                </div>
            </PremiumHeader>

            <DataTable
                data={admins}
                columns={columns as any}
                searchKey="adminName"
                searchPlaceholder="Search administrators by name or mobile..."
                pageSize={10}
                renderExpandedRow={renderExpandedRow}
            />
        </div>
    )
}
