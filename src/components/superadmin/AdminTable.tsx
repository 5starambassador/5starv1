import { ShieldCheck, Download, MoreHorizontal, CheckCircle, XCircle, Calendar, Hash, Building2, Smartphone, Shield, Trash2, Key, Edit } from 'lucide-react'

import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Admin } from '@/types'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { bulkAdminAction } from '@/app/bulk-admin-actions'
import { mapAdminRole } from '@/lib/enum-utils'
import { exportToCSV } from '@/lib/export-utils'

interface AdminTableProps {
    admins: Admin[]
    searchTerm: string // Keeping for interface compatibility but DataTable has internal search
    onSearchChange: (value: string) => void
    onAddAdmin: () => void
    onBulkAdd?: () => void
    onDelete: (adminId: number, name: string) => void
    onToggleStatus: (adminId: number, currentStatus: string) => void
    onResetPassword?: (id: number, name: string, type: 'user' | 'admin') => void
    onEdit?: (admin: Admin) => void
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function AdminTable({
    admins,
    onAddAdmin,
    onBulkAdd,
    onDelete,
    onToggleStatus,
    onResetPassword,
    onEdit
}: AdminTableProps) {
    const router = useRouter()
    const [selectedAdmins, setSelectedAdmins] = useState<Admin[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    // Bulk Confirmation State
    const [bulkConfirmation, setBulkConfirmation] = useState<{ isOpen: boolean, action: 'activate' | 'suspend' | 'delete' | null }>({
        isOpen: false,
        action: null
    })

    // Bulk Action Handler
    const handleBulkAction = (action: 'activate' | 'suspend' | 'delete') => {
        setBulkConfirmation({ isOpen: true, action })
    }

    const executeBulkAction = async () => {
        const action = bulkConfirmation.action
        if (!action) return

        setIsProcessing(true)
        try {
            const res = await bulkAdminAction(selectedAdmins.map(a => a.adminId), action)
            if (res.success) {
                toast.success(`Bulk ${action} successful: ${res.count} admins affected`)
                setSelectedAdmins([])
                setBulkConfirmation({ isOpen: false, action: null })
                router.refresh()
            } else {
                toast.error(res.error || 'Bulk action failed')
                setBulkConfirmation({ isOpen: false, action: null })
            }
        } catch (error) {
            toast.error('Connection error during bulk action')
            setBulkConfirmation({ isOpen: false, action: null })
        } finally {
            setIsProcessing(false)
        }
    }
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
                    {mapAdminRole(admin.role as any)}
                </Badge>
            ),
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
            ),
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
            ),
        },
        {
            header: 'Actions',
            accessorKey: (admin: Admin) => admin.adminId,
            cell: (admin: Admin) => (
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onEdit?.(admin)}
                        className="p-2.5 rounded-2xl text-blue-600 hover:text-white hover:bg-blue-600 transition-all border border-blue-50 shadow-sm bg-white hover:scale-110 active:scale-95 transition-all"
                        suppressHydrationWarning
                    >
                        <Edit size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onToggleStatus(admin.adminId, admin.status)}
                        className={`p-2.5 rounded-2xl transition-all shadow-sm bg-white border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 ${admin.status === 'Active' ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        suppressHydrationWarning
                    >
                        {admin.status === 'Active' ? <XCircle size={16} strokeWidth={2.5} /> : <CheckCircle size={16} strokeWidth={2.5} />}
                    </button>
                    <button
                        onClick={() => onDelete(admin.adminId, admin.adminName)}
                        className="p-2.5 rounded-2xl text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-50 shadow-sm bg-white hover:scale-110 active:scale-95 transition-all group"
                        suppressHydrationWarning
                    >
                        <Trash2 size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            )
        }
    ]

    const renderExpandedRow = (admin: Admin) => (
        <div className="p-10 bg-gradient-to-br from-gray-50/50 to-white/30 border-x border-b border-gray-100/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                        <Calendar size={14} className="text-red-500" />
                        Temporal Entry
                    </p>
                    <p className="text-sm font-black text-gray-900 italic tracking-tight">
                        {new Date(admin.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                        <Shield size={14} className="text-blue-500" />
                        Auth Protocol
                    </p>
                    <p className="text-sm font-black text-blue-600 uppercase tracking-widest italic">
                        {mapAdminRole(admin.role as any)}
                    </p>
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                        <Hash size={14} className="text-purple-500" />
                        Unique Signature
                    </p>
                    <p className="text-sm font-black text-gray-900 font-mono">
                        #ADM-{admin.adminId.toString().padStart(4, '0')}
                    </p>
                </div>
            </div>
            <div className="mt-10 pt-8 border-t border-gray-100 flex gap-4">
                <button
                    onClick={() => onResetPassword?.(admin.adminId, admin.adminName, 'admin')}
                    className="px-6 py-3.5 bg-white border border-amber-100 text-amber-600 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-amber-50 transition-all flex items-center gap-2 shadow-sm"
                >
                    <Key size={14} /> Reset Passphrase
                </button>
                <button className="px-6 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-gray-200">
                    Audit Activity Log
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-8 rounded-[40px] border border-white/50 shadow-xl shadow-gray-200/50">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-gray-900 text-white rounded-[20px] shadow-lg shadow-gray-200 border border-gray-800">
                        <ShieldCheck size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Executive Control</h1>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] font-mono mt-0.5">Administrative Permission Layer</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToCSV(admins, 'System_Admins', [
                            { header: 'Name', accessor: (a) => a.adminName },
                            { header: 'Mobile', accessor: (a) => a.adminMobile },
                            { header: 'Role', accessor: (a) => a.role },
                            { header: 'Campus', accessor: (a) => a.assignedCampus || 'Global' },
                            { header: 'Status', accessor: (a) => a.status },
                            { header: 'Created On', accessor: (a) => a.createdAt }
                        ])}
                        className="px-6 py-4 bg-white border border-gray-100 text-gray-500 rounded-2xl font-black text-[10px] hover:bg-gray-50 hover:text-black transition-all flex items-center gap-2 uppercase tracking-widest"
                        suppressHydrationWarning
                    >
                        <Download size={16} /> Export Intelligence
                    </button>
                    <button
                        onClick={onAddAdmin}
                        className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 uppercase tracking-[0.2em] border border-red-500"
                        suppressHydrationWarning
                    >
                        <ShieldCheck size={16} /> Ignite Executive
                    </button>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedAdmins.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 border border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                <Shield size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-bold">{selectedAdmins.length} Selected</span>
                        </div>
                        <div className="h-6 w-px bg-gray-700"></div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleBulkAction('activate')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider text-emerald-400 transition-colors flex items-center gap-2"
                            >
                                <CheckCircle size={14} /> Activate
                            </button>
                            <button
                                onClick={() => handleBulkAction('suspend')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider text-amber-400 transition-colors flex items-center gap-2"
                            >
                                <XCircle size={14} /> Suspend
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 hover:bg-red-900/30 rounded-lg text-xs font-bold uppercase tracking-wider text-red-400 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                        <div className="h-6 w-px bg-gray-700"></div>
                        <button
                            onClick={() => setSelectedAdmins([])}
                            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <XCircle size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full xl:max-w-[calc(100vw-340px)] mx-auto overflow-hidden">
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                    <DataTable
                        data={admins}
                        columns={columns as any}
                        searchKey="adminName"
                        searchPlaceholder="Search administrators by name or mobile..."
                        pageSize={10}
                        renderExpandedRow={renderExpandedRow}
                        enableMultiSelection={true}
                        onSelectionChange={(selected) => setSelectedAdmins(selected)}
                        uniqueKey="adminId"
                    />
                </div>
            </div>

            {/* Bulk Confirm Dialog */}
            <ConfirmDialog
                isOpen={bulkConfirmation.isOpen}
                title={`Confirm Bulk ${bulkConfirmation.action === 'delete' ? 'Deletion' : 'Update'}`}
                description={
                    bulkConfirmation.action === 'delete' ? (
                        <p className="text-red-600 font-medium">
                            DANGER: You are about to PERMANENTLY DELETE <strong>{selectedAdmins.length}</strong> administrators.
                            <br />This will remove their access immediately. Are you absolutely sure?
                        </p>
                    ) : (
                        <p>
                            Are you sure you want to <strong>{bulkConfirmation.action}</strong> {selectedAdmins.length} selected administrators?
                        </p>
                    )
                }
                confirmText={`Yes, ${bulkConfirmation.action} All`}
                variant={bulkConfirmation.action === 'delete' ? 'danger' : 'warning'}
                onConfirm={executeBulkAction}
                onCancel={() => setBulkConfirmation({ isOpen: false, action: null })}
                isLoading={isProcessing}
            />
        </div>
    )
}
