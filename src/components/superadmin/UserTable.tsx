import { UserPlus, Download, CheckCircle, XCircle, Calendar, CreditCard, Smartphone, Hash, Building, Trash2, Key, Shield } from 'lucide-react'
import { PremiumHeader } from '@/components/premium/PremiumHeader'
import { ActivityHistory } from './ActivityHistory'
import { UserAuditTimeline } from './UserAuditTimeline'
import { User } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { calculateStars } from '@/lib/gamification'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { bulkUserAction } from '@/app/bulk-actions'

interface UserTableProps {
    users: User[]
    searchTerm: string
    onSearchChange: (value: string) => void
    onAddUser: () => void
    onBulkAdd: () => void
    onDelete: (userId: number, name: string) => void
    onToggleStatus: (userId: number, currentStatus: string) => void
    onViewReferrals?: (referralCode: string) => void
    onResetPassword?: (id: number, name: string, type: 'user' | 'admin') => void
    onEdit?: (user: User) => void
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
    onResetPassword,
    onEdit
}: UserTableProps) {
    const [selectedUsers, setSelectedUsers] = useState<User[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [showAuditTimeline, setShowAuditTimeline] = useState(false)
    const [selectedUserForAudit, setSelectedUserForAudit] = useState<User | null>(null)
    const router = useRouter()

    // Bulk Action Handler
    const handleBulkAction = async (action: 'activate' | 'suspend' | 'delete' | 'deactivate') => {
        const confirmMessage = action === 'delete'
            ? `DANGER: You are about to PERMANENTLY DELETE ${selectedUsers.length} ambassadors and all their associated referral leads. This action CANNOT be undone. Are you absolutely sure?`
            : `Are you sure you want to ${action} ${selectedUsers.length} selected ambassadors?`

        if (!confirm(confirmMessage)) return

        setIsProcessing(true)
        try {
            const res = await bulkUserAction(selectedUsers.map(u => u.userId), action)
            if (res.success) {
                toast.success(`Bulk ${action} successful: ${res.count} users affected`)
                setSelectedUsers([])
                router.refresh()
            } else {
                toast.error(res.error || 'Bulk action failed')
            }
        } catch (error) {
            toast.error('Connection error during bulk action')
        } finally {
            setIsProcessing(false)
        }
    }

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
            header: 'Star Status',
            accessorKey: 'badge',
            cell: (user: User) => {
                const stars = calculateStars(user.confirmedReferralCount || 0)

                return (
                    <div className="flex items-center gap-0.5" title={stars.tier}>
                        {[...Array(5)].map((_, i) => (
                            <svg
                                key={i}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill={i < stars.starCount ? "currentColor" : "none"}
                                stroke="currentColor"
                                className={`w-3.5 h-3.5 ${i < stars.starCount ? (stars.tier === '5-Star' ? 'text-red-600' : 'text-amber-400') : 'text-gray-200 stroke-1'}`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={i < stars.starCount ? 0 : 1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        ))}
                    </div>
                )
            }
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
            header: 'EMP ID',
            accessorKey: 'empId',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <span className="text-[10px] font-bold text-gray-500 font-mono tracking-wider">
                    {user.empId || '-'}
                </span>
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
            header: 'Password',
            accessorKey: 'password',
            cell: (user: User) => (
                <code className="text-[10px] bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">
                    {user.password || '••••••'}
                </code>
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

            <div className="mt-8">
                <ActivityHistory userId={user.userId} userName={user.fullName} />
            </div>

            {/* Quick Actions or more details could go here */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                <button
                    onClick={() => onViewReferrals?.(user.referralCode)}
                    className="text-[10px] font-black text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl border border-red-100 transition-all uppercase tracking-widest"
                >
                    View Referral History
                </button>
                <button
                    onClick={() => onEdit?.(user)}
                    className="text-[10px] font-black text-gray-900 bg-white hover:bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 transition-all uppercase tracking-widest shadow-sm"
                >
                    Edit Details
                </button>
                <button
                    onClick={() => onResetPassword?.(user.userId, user.fullName, 'user')}
                    className="text-[10px] font-black text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                    <Key size={14} /> Reset Password
                </button>
                <button
                    onClick={() => {
                        setSelectedUserForAudit(user)
                        setShowAuditTimeline(true)
                    }}
                    className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                    <Shield size={14} /> View Audit Trail
                </button>
            </div>
        </div>
    )

    // Export State
    const [showExportModal, setShowExportModal] = useState(false)
    const [selectedColumns, setSelectedColumns] = useState({
        fullName: true,
        mobileNumber: true,
        role: true,
        campus: true,
        referralCode: true,
        confirmedReferrals: true,
        status: true,
        email: false,
        empId: false,
        childEprNo: false,
        yearBenefit: false,
        longTermBenefit: false,
        joinedDate: false,
        password: false
    })

    const handleExport = () => {
        // Filter data based on search
        const filteredData = users.filter(user =>
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.mobileNumber?.includes(searchTerm) ||
            user.referralCode?.toLowerCase().includes(searchTerm.toLowerCase())
        )

        const headers = []
        if (selectedColumns.fullName) headers.push('Full Name')
        if (selectedColumns.mobileNumber) headers.push('Mobile Number')
        if (selectedColumns.role) headers.push('Role')
        if (selectedColumns.email) headers.push('Email')
        if (selectedColumns.campus) headers.push('Campus')
        if (selectedColumns.empId) headers.push('EMP ID')
        if (selectedColumns.childEprNo) headers.push('Child ERP No')
        if (selectedColumns.referralCode) headers.push('Referral Code')
        if (selectedColumns.confirmedReferrals) headers.push('Confirmed Referrals')
        if (selectedColumns.yearBenefit) headers.push('Year Benefit %')
        if (selectedColumns.longTermBenefit) headers.push('Long Term Benefit %')
        if (selectedColumns.joinedDate) headers.push('Joined Date')
        if (selectedColumns.status) headers.push('Status')
        if (selectedColumns.password) headers.push('Password')

        const csvRows = [headers.join(',')]

        for (const user of filteredData) {
            const row = []
            if (selectedColumns.fullName) row.push(`"${user.fullName || ''}"`)
            if (selectedColumns.mobileNumber) row.push(`"${user.mobileNumber || ''}"`)
            if (selectedColumns.role) row.push(`"${user.role || ''}"`)
            if (selectedColumns.email) row.push(`"${user.email || ''}"`)
            if (selectedColumns.campus) row.push(`"${user.assignedCampus || ''}"`)
            if (selectedColumns.empId) row.push(`"${user.empId || ''}"`)
            if (selectedColumns.childEprNo) row.push(`"${user.childEprNo || ''}"`)
            if (selectedColumns.referralCode) row.push(`"${user.referralCode || ''}"`)
            if (selectedColumns.confirmedReferrals) row.push(user.confirmedReferralCount || 0)
            if (selectedColumns.yearBenefit) row.push(user.yearFeeBenefitPercent || 0)
            if (selectedColumns.longTermBenefit) row.push(user.longTermBenefitPercent || 0)
            if (selectedColumns.joinedDate) row.push(`"${new Date(user.createdAt).toLocaleDateString()}"`)
            if (selectedColumns.status) row.push(`"${user.status}"`)
            if (selectedColumns.password) row.push(`"${user.password || ''}"`)

            csvRows.push(row.join(','))
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ambassadors_export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        setShowExportModal(false)
        toast.success('Export downloaded successfully')
    }

    // Toggle Column Handler
    const toggleColumn = (key: keyof typeof selectedColumns) => {
        setSelectedColumns(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Premium Header */}
            <PremiumHeader
                title="Ambassador Network"
                subtitle="Manage parent and staff ambassadors globally"
                icon={UserPlus}
                iconColor="text-white"
                gradientFrom="from-red-600"
                gradientTo="to-red-600"
            >
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 uppercase tracking-widest"
                    >
                        <Download size={16} /> Export
                    </button>
                    <button
                        onClick={() => {
                            const csvContent = "Full Name,Mobile Number,Role,Email,Campus Name,EMP ID,Child ERP No,Academic Year,Password\nJohn Doe,9876543210,Staff,john@example.com,Achariya School,EMP001,,2025-2026,Pass@123\nJane Doe,9876543211,Parent,jane@example.com,Achariya School,,STU001,2025-2026,Pass@123"
                            const blob = new Blob([csvContent], { type: 'text/csv' })
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'ambassador_template.csv'
                            a.click()
                        }}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 uppercase tracking-widest"
                    >
                        <Download size={16} /> Template
                    </button>
                    <button
                        onClick={onBulkAdd}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 uppercase tracking-widest"
                        suppressHydrationWarning
                    >
                        <UserPlus size={16} /> Bulk Upload
                    </button>
                    <button
                        onClick={onAddUser}
                        className="px-5 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl font-black text-xs shadow-2xl shadow-gray-900/20 hover:shadow-gray-900/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-2 uppercase tracking-widest border border-gray-700"
                        suppressHydrationWarning
                    >
                        <UserPlus size={16} /> Add New
                    </button>
                </div>
            </PremiumHeader>

            {/* Bulk Action Bar (Floating) */}
            {selectedUsers.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="bg-white text-black font-bold h-6 w-6 rounded-full flex items-center justify-center text-xs">
                                {selectedUsers.length}
                            </div>
                            <span className="text-sm font-medium text-gray-300">Selected</span>
                        </div>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <div className="flex items-center gap-2">
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
                                onClick={() => handleBulkAction('deactivate')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors flex items-center gap-2"
                            >
                                <XCircle size={14} /> Deactivate
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 hover:bg-red-900/30 rounded-lg text-xs font-bold uppercase tracking-wider text-red-400 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full overflow-x-auto pb-4">
                <DataTable
                    data={users}
                    columns={columns as any}
                    searchKey={['fullName', 'referralCode', 'mobileNumber']}
                    searchValue={searchTerm}
                    onSearchChange={onSearchChange}
                    searchPlaceholder="Search ambassadors by name, code or mobile..."
                    pageSize={10}
                    renderExpandedRow={renderExpandedRow}
                    enableMultiSelection={true}
                    onSelectionChange={(selected) => setSelectedUsers(selected)}
                    uniqueKey="userId"
                />
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Export Data</h3>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Columns</p>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(selectedColumns).map(([key, value]) => (
                                    <label key={key} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all">
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={() => toggleColumn(key as keyof typeof selectedColumns)}
                                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="flex-1 py-3 text-gray-600 font-bold text-sm bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex-1 py-3 text-white font-bold text-sm bg-gray-900 hover:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={16} /> Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Audit Timeline Modal */}
            {showAuditTimeline && selectedUserForAudit && (
                <UserAuditTimeline
                    userId={selectedUserForAudit.userId}
                    userName={selectedUserForAudit.fullName}
                    onClose={() => {
                        setShowAuditTimeline(false)
                        setSelectedUserForAudit(null)
                    }}
                />
            )}
        </div>
    )
}

