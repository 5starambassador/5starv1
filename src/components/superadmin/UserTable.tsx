import { RefreshCw, UserPlus, Download, CheckCircle, XCircle, Calendar, CreditCard, Smartphone, Hash, Building, Trash2, Key, Shield, Star, ArrowRight, ChevronDown, CheckSquare, Filter } from 'lucide-react'
import { AcademicYearFilter } from '@/components/AcademicYearFilter'
import Image from 'next/image'

import { ActivityHistory } from './ActivityHistory'
import { UserAuditTimeline } from './UserAuditTimeline'
import { UserDetailPanel } from './UserDetailPanel'
import { User } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { calculateStars } from '@/lib/gamification'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { bulkUserAction } from '@/app/bulk-actions'
import { useClickOutside } from '@/hooks/use-click-outside'
import { getUsersForExport } from '@/app/superadmin-actions'

interface UserTableProps {
    users: User[]
    pagination?: {
        page: number
        pageSize: number
        totalCount: number
        totalPages: number
    } | null
    searchTerm: string
    onSearchChange: (value: string) => void
    onPageChange?: (page: number) => void
    onAddUser: () => void
    onBulkAdd: () => void
    onDelete: (userId: number, name: string) => void
    onToggleStatus: (userId: number, currentStatus: string) => void
    onViewReferrals?: (referralCode: string) => void
    onResetPassword?: (id: number, name: string, type: 'user' | 'admin') => void
    onEdit?: (user: User) => void
    onPurge?: (userId: number, name: string) => void
    campuses?: { id: number; campusName: string }[]
    statusFilterValue: string[]
    onStatusFilterChange: (status: string[] | ((prev: string[]) => string[])) => void
    roleFilterValue: string[]
    onRoleFilterChange: (role: string[] | ((prev: string[]) => string[])) => void
    sourceFilterValue: string[]
    onSourceFilterChange: (source: string[] | ((prev: string[]) => string[])) => void
    campusFilterValue: string[]
    onCampusFilterChange: (campus: string[] | ((prev: string[]) => string[])) => void
    onClearAllFilters: () => void
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function UserTable({
    users,
    pagination,
    onAddUser,
    onBulkAdd,
    onDelete,
    onToggleStatus,
    searchTerm,
    onSearchChange,
    onPageChange,
    onViewReferrals,
    onResetPassword,
    onEdit,
    onPurge,
    campuses = [],
    statusFilterValue,
    onStatusFilterChange,
    roleFilterValue,
    onRoleFilterChange,
    sourceFilterValue,
    onSourceFilterChange,
    campusFilterValue,
    onCampusFilterChange,
    onClearAllFilters
}: UserTableProps) {
    const [selectedUsers, setSelectedUsers] = useState<User[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [showAuditTimeline, setShowAuditTimeline] = useState(false)
    const [selectedUserForAudit, setSelectedUserForAudit] = useState<User | null>(null)
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    const [showCampusDropdown, setShowCampusDropdown] = useState(false)
    const campusDropdownRef = useRef<HTMLDivElement>(null)

    useClickOutside(campusDropdownRef, () => setShowCampusDropdown(false))

    // Bulk Confirmation State
    const [bulkConfirmation, setBulkConfirmation] = useState<{ isOpen: boolean, action: 'activate' | 'suspend' | 'delete' | 'deactivate' | null }>({
        isOpen: false,
        action: null
    })

    // Bulk Action Handler
    const handleBulkAction = (action: 'activate' | 'suspend' | 'delete' | 'deactivate') => {
        setBulkConfirmation({ isOpen: true, action })
    }

    const executeBulkAction = async () => {
        const action = bulkConfirmation.action
        if (!action) return

        setIsProcessing(true)
        try {
            const res = await bulkUserAction(selectedUsers.map(u => u.userId), action)
            if (res.success) {
                if (res.message) {
                    toast.success(res.message)
                } else {
                    toast.success(`Bulk ${action} successful: ${res.count} users affected`)
                }
                setSelectedUsers([])
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
            header: 'Ambassador',
            accessorKey: 'fullName',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 group-hover:text-red-700 transition-colors uppercase tracking-tight text-sm">
                            {user.fullName ?? 'N/A'}
                        </p>
                        <span className="font-black text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-widest shadow-sm">
                            {user.referralCode || 'N/A'}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Badge variant={user.role === 'Staff' ? 'info' : 'outline'} className="font-black text-[9px] tracking-wider uppercase px-1.5 py-0">
                            {user.role}
                        </Badge>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <Smartphone size={10} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400">{user.mobileNumber ?? 'No Mobile'}</p>
                            </div>
                            {user.mobileNumber && (
                                <a 
                                    href={`https://wa.me/${user.mobileNumber}?text=${encodeURIComponent(`Hello *${user.fullName || 'Ambassador'}*, I'm from ACHARIYA Administration. I'm checking in regarding your Ambassador activity. We're grateful for your support!`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 active:scale-95 transition-all shadow-sm"
                                    title="Nudge via WhatsApp"
                                    aria-label={`Send WhatsApp nudge to ${user.fullName}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Star Status',
            accessorKey: 'badge',
            cell: (user: User) => {
                const stars = calculateStars(user.confirmedReferralCount || 0)
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-0.5" title={stars.tier}>
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={12}
                                    fill={i < stars.starCount ? "currentColor" : "none"}
                                    className={`${i < stars.starCount ? (stars.tier === '5-Star' ? 'text-red-600' : 'text-amber-400') : 'text-gray-200'}`}
                                    strokeWidth={i < stars.starCount ? 0 : 1}
                                />
                            ))}
                        </div>
                    </div>
                )
            }
        },
        {
            header: 'Context',
            accessorKey: 'assignedCampus',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <Building size={10} className="text-gray-400" />
                        <span className={`text-[11px] font-bold truncate max-w-[100px] ${(!user.assignedCampus || user.assignedCampus === 'Global') ? 'text-gray-400 font-normal italic' : 'text-gray-600'}`}>
                            {user.assignedCampus && user.assignedCampus !== 'Global' ? user.assignedCampus : 'Unassigned'}
                        </span>
                    </div>
                    {user.grade && (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-4">
                            Grade: {user.grade}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Referrals',
            accessorKey: 'confirmedReferralCount',
            sortable: true,
            filterable: true,
            cell: (user: User) => (
                <div className="flex flex-col">
                    <span className="font-black text-red-600 text-sm">{user.confirmedReferralCount}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Confirmed</span>
                </div>
            )
        },
        {
            header: 'Source',
            accessorKey: 'registrationSource',
            sortable: true,
            filterable: true,
            cell: (user: User) => {
                const source = (user as any).registrationSource || 'System'
                const isManual = source === 'Manual' || source === 'Admin Created' || source === 'Manual_Import'

                // Map the labels for a cleaner display
                const labelMap: Record<string, string> = {
                    'Manual_Import': 'Manual',
                    'Admin Created': 'Admin',
                    'Manual': 'Manual',
                    'System': 'System'
                }

                return (
                    <Badge
                        variant={isManual ? 'outline' : 'info'}
                        className={`font-black text-[8px] tracking-tighter uppercase w-fit px-1 py-0 ${isManual ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}
                    >
                        {labelMap[source] || source}
                    </Badge>
                )
            }
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (user: User) => {
                const isDeleted = user.status === 'Deleted'
                return (
                    <div className="flex flex-col gap-1">
                        <Badge
                            variant={isDeleted ? 'error' : (user.status === 'Active' ? 'success' : 'outline')}
                            className="font-black text-[8px] tracking-tighter uppercase w-fit px-1 py-0"
                        >
                            {user.status}
                        </Badge>
                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap" suppressHydrationWarning>
                            Joined {new Date(user.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                )
            },
        },
        {
            header: <span className="flex justify-end w-full pr-1">Actions</span>,
            accessorKey: (user: User) => user.userId,
            cell: (user: User) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setSelectedUserForDetail(user)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all border border-gray-100 shadow-sm bg-white hover:scale-110 active:scale-95"
                        title="View Details"
                        aria-label={`View details for ${user.fullName}`}
                        suppressHydrationWarning
                    >
                        <ArrowRight size={16} strokeWidth={2.5} />
                    </button>
                    {user.status !== 'Deleted' ? (
                        <>
                            <button
                                onClick={() => onToggleStatus(user.userId, user.status)}
                                className={`p-2 rounded-xl transition-all shadow-sm bg-white border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 ${user.status === 'Active' ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                aria-label={user.status === 'Active' ? `Deactivate ${user.fullName}` : `Activate ${user.fullName}`}
                                suppressHydrationWarning
                            >
                                {user.status === 'Active' ? <XCircle size={16} strokeWidth={2.5} /> : <CheckCircle size={16} strokeWidth={2.5} />}
                            </button>
                            <button
                                onClick={() => onDelete(user.userId, user.fullName)}
                                className="p-2 rounded-xl text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-50 shadow-sm bg-white hover:scale-110 active:scale-95 group"
                                suppressHydrationWarning
                                title="Move to Archive"
                                aria-label={`Archive ${user.fullName}`}
                            >
                                <Trash2 size={16} strokeWidth={2.5} className="group-hover:animate-pulse" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => onPurge?.(user.userId, user.fullName)}
                            className="p-2 rounded-xl text-white bg-red-600 hover:bg-red-700 transition-all border border-red-700 shadow-lg hover:scale-110 active:scale-95 group flex items-center gap-1.5 px-3"
                            suppressHydrationWarning
                            title="Purge Permanently"
                        >
                            <Trash2 size={14} strokeWidth={2.5} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Purge</span>
                        </button>
                    )}
                </div>
            )
        }
    ]


    const [isExporting, setIsExporting] = useState(false)
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportDateRange, setExportDateRange] = useState({
        from: '',
        to: ''
    })
    const [selectedColumns, setSelectedColumns] = useState({
        fullName: true,
        mobileNumber: true,
        role: true,
        campus: true,
        referralCode: true,
        confirmedReferrals: true,
        status: true,
        email: true,
        empId: true,
        grade: true,
        isFiveStarMember: true,
        benefitStatus: true,
        childInAchariya: true,
        childName: true,
        childEprNo: true,
        aadharNo: true,
        address: true,
        bankAccountDetails: true,
        accountNumber: true,
        bankName: true,
        ifscCode: true,
        academicYear: true,
        studentFee: true,
        paymentAmount: true,
        paymentStatus: true,
        transactionId: true,
        yearBenefit: true,
        longTermBenefit: true,
        joinedDate: true,
        password: false,
        source: true
    })

    const handleExport = async () => {
        setIsExporting(true)
        // Give UI a moment to show loading state
        setTimeout(async () => {
            try {
                const selectedYear = searchParams.get('year')
            const exportData = await getUsersForExport({
                academicYear: selectedYear || 'All',
                search: searchTerm,
                status: statusFilterValue.join(','),
                role: roleFilterValue.join(','),
                source: sourceFilterValue.join(','),
                campusFilter: campusFilterValue.join(','),
                startDate: exportDateRange.from || undefined,
                endDate: exportDateRange.to || undefined
            })

            const headers = []
            if (selectedColumns.fullName) headers.push('Full Name')
            if (selectedColumns.mobileNumber) headers.push('Mobile Number')
            if (selectedColumns.role) headers.push('Role')
            if (selectedColumns.email) headers.push('Email')
            if (selectedColumns.campus) headers.push('Assigned Campus')
            if (selectedColumns.empId) headers.push('EMP ID')
            if (selectedColumns.grade) headers.push('Grade')
            if (selectedColumns.isFiveStarMember) headers.push('Is 5-Star Member')
            if (selectedColumns.benefitStatus) headers.push('Benefit Status')
            if (selectedColumns.childInAchariya) headers.push('Child In Achariya')
            if (selectedColumns.childName) headers.push('Child Name')
            if (selectedColumns.childEprNo) headers.push('Child ERP No')
            if (selectedColumns.aadharNo) headers.push('Aadhar No')
            if (selectedColumns.address) headers.push('Address')
            if (selectedColumns.bankAccountDetails) headers.push('Bank Account Details')
            if (selectedColumns.accountNumber) headers.push('Account Number')
            if (selectedColumns.bankName) headers.push('Bank Name')
            if (selectedColumns.ifscCode) headers.push('IFSC Code')
            if (selectedColumns.academicYear) headers.push('Academic Year')
            if (selectedColumns.studentFee) headers.push('Student Fee')
            if (selectedColumns.paymentAmount) headers.push('Payment Amount')
            if (selectedColumns.paymentStatus) headers.push('Payment Status')
            if (selectedColumns.transactionId) headers.push('Transaction ID')
            if (selectedColumns.referralCode) headers.push('Referral Code')
            if (selectedColumns.confirmedReferrals) headers.push('Confirmed Referrals')
            if (selectedColumns.yearBenefit) headers.push('Year Benefit %')
            if (selectedColumns.longTermBenefit) headers.push('Long Term Benefit %')
            if (selectedColumns.joinedDate) headers.push('Joined Date')
            if (selectedColumns.status) headers.push('Status')
            if (selectedColumns.source) headers.push('Upload Source')
            if (selectedColumns.password) headers.push('Password')

            const csvRows = [headers.join(',')]

            for (const user of exportData) {
                const row = []
                if (selectedColumns.fullName) row.push(`"${user.fullName || ''}"`)
                if (selectedColumns.mobileNumber) row.push(`="${user.mobileNumber || ''}"`)
                if (selectedColumns.role) row.push(`"${user.role || ''}"`)
                if (selectedColumns.email) row.push(`"${user.email || ''}"`)
                if (selectedColumns.campus) row.push(`"${user.assignedCampus || ''}"`)
                if (selectedColumns.empId) row.push(`="${user.empId || ''}"`)
                if (selectedColumns.grade) row.push(`"${user.grade || ''}"`)
                if (selectedColumns.isFiveStarMember) row.push(user.isFiveStarMember ? 'Yes' : 'No')
                if (selectedColumns.benefitStatus) row.push(`"${user.benefitStatus}"`)
                if (selectedColumns.childInAchariya) row.push(user.childInAchariya ? 'Yes' : 'No')
                if (selectedColumns.childName) row.push(`"${user.childName || ''}"`)
                if (selectedColumns.childEprNo) row.push(`="${user.childEprNo || ''}"`)
                if (selectedColumns.aadharNo) row.push(`="${user.aadharNo || ''}"`)
                if (selectedColumns.address) row.push(`"${(user.address || '').replace(/"/g, '""')}"`)
                if (selectedColumns.bankAccountDetails) row.push(`"${(user.bankAccountDetails || '').replace(/"/g, '""')}"`)
                if (selectedColumns.accountNumber) {
                    let acc = user.accountNumber
                    if (!acc && user.bankAccountDetails) {
                        const parts = user.bankAccountDetails.split('-')
                        if (parts.length > 1) acc = parts[1]?.trim()
                    }
                    row.push(`="${acc || ''}"`)
                }
                if (selectedColumns.bankName) {
                    let bnk = user.bankName
                    if (!bnk && user.bankAccountDetails) {
                        bnk = user.bankAccountDetails.split('-')[0]?.trim()
                    }
                    row.push(`="${bnk || ''}"`)
                }
                if (selectedColumns.ifscCode) {
                    let ifsc = user.ifscCode
                    if (!ifsc && user.bankAccountDetails) {
                        const match = user.bankAccountDetails.match(/\((.*?)\)/)
                        if (match) ifsc = match[1]
                    }
                    row.push(`="${ifsc || ''}"`)
                }
                if (selectedColumns.academicYear) row.push(`="${user.academicYear || ''}"`)
                if (selectedColumns.studentFee) row.push(user.studentFee || 0)
                if (selectedColumns.paymentAmount) row.push(user.paymentAmount || 0)
                if (selectedColumns.paymentStatus) row.push(`"${user.paymentStatus || ''}"`)
                if (selectedColumns.transactionId) row.push(`="${user.transactionId || ''}"`)
                if (selectedColumns.referralCode) row.push(`="${user.referralCode || ''}"`)
                if (selectedColumns.confirmedReferrals) row.push(user.confirmedReferralCount || 0)
                if (selectedColumns.yearBenefit) row.push(user.yearFeeBenefitPercent || 0)
                if (selectedColumns.longTermBenefit) row.push(user.longTermBenefitPercent || 0)
                if (selectedColumns.joinedDate) row.push(`"${new Date(user.createdAt).toLocaleDateString()}"`)
                if (selectedColumns.status) row.push(`"${user.status}"`)
                if (selectedColumns.source) {
                    const source = (user as any).registrationSource || 'System'
                    row.push(`"${source === 'Admin Created' ? 'Admin Created' : (source === 'Manual' ? 'Manual Import' : 'System/Organic')}"`)
                }
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
            toast.success(`Exported ${exportData.length} records successfully`)
            } catch (error) {
                console.error('Export Error:', error)
                toast.error('Failed to export data. Please try again.')
            } finally {
                setIsExporting(false)
            }
        }, 100)
    }

    // Toggle Column Handler
    const toggleColumn = (key: keyof typeof selectedColumns) => {
        setSelectedColumns(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const setAllColumns = (value: boolean) => {
        const reset: any = {}
        Object.keys(selectedColumns).forEach(key => {
            reset[key] = value
        })
        setSelectedColumns(reset)
    }

    return (
        <>
            <div className="space-y-6 animate-fade-in relative">
            {/* Premium Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-100">
                        <UserPlus size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Ambassador Network</h1>
                        <p className="text-sm text-gray-500 font-bold tracking-wide">Manage parent and staff ambassadors globally</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                        suppressHydrationWarning
                    >
                        <Download size={16} /> Export
                    </button>
                    <button
                        onClick={() => {
                            const csvContent = "Full Name,Mobile Number,Role,Email,Assigned Campus,Emp ID,Child ERP No,Academic Year,Password,Referral Code,Child In Achariya,Benefit Status,Aadhar No,Address,Bank Name,Account Number,IFSC Code\nJohn Doe,9876543210,Staff,john@example.com,Achariya School,EMP001,,2025-2026,Pass@123,,No,Active,,,\nJane Doe,9876543211,Parent,jane@example.com,Achariya School,,STU001,2025-2026,Pass@123,,Yes,PendingVerification,,,"
                            const blob = new Blob([csvContent], { type: 'text/csv' })
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'ambassador_template.csv'
                            a.click()
                        }}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                        suppressHydrationWarning
                    >
                        <Download size={16} /> Template
                    </button>
                    <button
                        onClick={onBulkAdd}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                        suppressHydrationWarning
                    >
                        <UserPlus size={16} /> Bulk Upload
                    </button>
                    <button
                        onClick={onAddUser}
                        className="px-5 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
                        suppressHydrationWarning
                    >
                        <UserPlus size={16} /> Add New
                    </button>
                </div>
            </div>

            {/* Dynamic Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-gray-400" />
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Quick Filters:</span>
                </div>

                <AcademicYearFilter />

                {/* Role Filter */}
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 items-center gap-1">
                    {['Parent', 'Staff', 'Alumni', 'Others'].map(role => {
                        const isActive = roleFilterValue.includes(role)
                        return isActive ? (
                            <button
                                key={role}
                                onClick={() => {
                                    onRoleFilterChange(prev => prev.filter(r => r !== role))
                                }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all bg-indigo-600 text-white shadow-md"
                                aria-pressed="true"
                                suppressHydrationWarning
                            >
                                {role}
                            </button>
                        ) : (
                            <button
                                key={role}
                                onClick={() => {
                                    onRoleFilterChange(prev => [...prev, role])
                                }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-gray-400 hover:text-gray-600"
                                aria-pressed="false"
                                suppressHydrationWarning
                            >
                                {role}
                            </button>
                        )
                    })}

                </div>

                {/* Status Filter */}
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 items-center gap-1">
                    {['Active', 'Inactive', 'Suspended', 'Pending', 'Deleted'].map(status => {
                        const isActive = statusFilterValue.includes(status)
                        return isActive ? (
                            <button
                                key={status}
                                onClick={() => {
                                    onStatusFilterChange((prev: string[]) => prev.filter((s: string) => s !== status))
                                }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all bg-red-600 text-white shadow-md"
                                aria-pressed="true"
                                suppressHydrationWarning
                            >
                                {status}
                            </button>
                        ) : (
                            <button
                                key={status}
                                onClick={() => {
                                    onStatusFilterChange((prev: string[]) => [...prev, status])
                                }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-gray-400 hover:text-gray-600"
                                aria-pressed="false"
                                suppressHydrationWarning
                            >
                                {status}
                            </button>
                        )
                    })}

                </div>

                {/* Source Filter */}
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 items-center gap-1">
                    {[
                        { label: 'Manual', value: 'manual' },
                        { label: 'System', value: 'system' }
                    ].map(source => (
                        <button
                            key={source.value}
                            onClick={() => {
                                onSourceFilterChange(prev => prev.includes(source.value) ? prev.filter(s => s !== source.value) : [...prev, source.value])
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${sourceFilterValue.includes(source.value) ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            suppressHydrationWarning
                        >
                            {source.label}
                        </button>
                    ))}
                </div>

                {/* Campus Filter Dropdown */}
                <div className="relative" ref={campusDropdownRef}>
                    {showCampusDropdown ? (
                        <button
                            onClick={() => setShowCampusDropdown(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${campusFilterValue.length > 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-indigo-600 text-white border-indigo-600'}`}
                            aria-expanded="true"
                            aria-haspopup="true"
                            aria-label="Filter by Campus"
                            suppressHydrationWarning
                        >
                            <Building size={12} />
                            Filter Campus {campusFilterValue.length > 0 && `(${campusFilterValue.length})`}
                            <ChevronDown size={12} className="ml-1 transition-transform rotate-180" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowCampusDropdown(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${campusFilterValue.length > 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'}`}
                            aria-expanded="false"
                            aria-haspopup="true"
                            aria-label="Filter by Campus"
                            suppressHydrationWarning
                        >
                            <Building size={12} />
                            Filter Campus {campusFilterValue.length > 0 && `(${campusFilterValue.length})`}
                            <ChevronDown size={12} className="ml-1 transition-transform" />
                        </button>
                    )}


                    {showCampusDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                <button
                                    onClick={() => {
                                        onCampusFilterChange(prev => prev.includes('Global') ? prev.filter(c => c !== 'Global') : [...prev, 'Global'])
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between ${campusFilterValue.includes('Global') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                    suppressHydrationWarning
                                >
                                    Global / Unknown
                                    {campusFilterValue.includes('Global') && <CheckSquare size={12} />}
                                </button>
                                {campuses.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            onCampusFilterChange(prev => prev.includes(c.campusName) ? prev.filter(cn => cn !== c.campusName) : [...prev, c.campusName])
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between ${campusFilterValue.includes(c.campusName) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        suppressHydrationWarning
                                    >
                                        {c.campusName}
                                        {campusFilterValue.includes(c.campusName) && <CheckSquare size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Clear All Filters */}
                {(roleFilterValue.length > 0 || campusFilterValue.length > 0 || statusFilterValue.length > 0 || sourceFilterValue.length > 0) && (
                    <button
                        onClick={onClearAllFilters}
                        className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest pl-2"
                        suppressHydrationWarning
                    >
                        Clear All
                    </button>
                )}

                <div className="ml-auto text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    Showing {users.length} results
                </div>
            </div>

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

            <div className="w-full overflow-hidden">
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                    <DataTable
                        data={users}
                        columns={columns as any}
                        manualPagination={!!pagination}
                        pageCount={pagination?.totalPages}
                        rowCount={pagination?.totalCount}
                        currentPage={pagination?.page}
                        onPageChange={onPageChange}
                        searchKey={['fullName', 'referralCode', 'mobileNumber', 'childEprNo', 'empId', 'childName']}
                        searchValue={searchTerm}
                        onSearchChange={onSearchChange}
                        searchPlaceholder="Search ambassadors by name, code or mobile..."
                        pageSize={10}
                        enableMultiSelection={true}
                        onSelectionChange={(selected: User[]) => setSelectedUsers(selected)}
                        uniqueKey="userId"
                        onRowClick={setSelectedUserForDetail}
                    />
                </div>
            </div>
        </div>

            {/* Export Modal (Portal sibling) */}
            {showExportModal && (
                <div 
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="export-modal-title"
                >
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 id="export-modal-title" className="text-lg font-bold text-gray-900">Export Data</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAllColumns(true)}
                                    className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setAllColumns(false)}
                                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6 pt-2 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date Range (Optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="export-from" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From</label>
                                    <input
                                        id="export-from"
                                        type="date"
                                        value={exportDateRange.from}
                                        onChange={(e) => setExportDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="export-to" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To</label>
                                    <input
                                        id="export-to"
                                        type="date"
                                        value={exportDateRange.to}
                                        onChange={(e) => setExportDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
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
                                disabled={isExporting}
                                className={`flex-1 py-3 bg-red-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-200 hover:shadow-red-300 transition-all flex items-center justify-center gap-2 ${isExporting ? 'opacity-80 cursor-wait' : 'hover:-translate-y-0.5'}`}
                            >
                                {isExporting ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Download CSV
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Detail Side Panel */}
            <UserDetailPanel
                user={selectedUserForDetail}
                onClose={() => setSelectedUserForDetail(null)}
                onEdit={(user) => {
                    setSelectedUserForDetail(null)
                    onEdit?.(user)
                }}
                onResetPassword={(id, name, type) => {
                    setSelectedUserForDetail(null)
                    onResetPassword?.(id, name, type)
                }}
                onViewAudit={(user) => {
                    setSelectedUserForAudit(user)
                    setShowAuditTimeline(true)
                }}
            />

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

            {/* Bulk Confirm Dialog */}
            <ConfirmDialog
                isOpen={bulkConfirmation.isOpen}
                title={`Confirm Bulk ${bulkConfirmation.action === 'delete' ? 'Deletion' : 'Update'}`}
                description={
                    bulkConfirmation.action === 'delete' ? (
                        <p className="text-red-600 font-medium">
                            DANGER: You are about to PERMANENTLY DELETE <strong>{selectedUsers.length}</strong> ambassadors.
                            <br />This will also delete all associated referral leads. This action CANNOT be undone.
                        </p>
                    ) : (
                        <p>
                            Are you sure you want to <strong>{bulkConfirmation.action}</strong> {selectedUsers.length} selected ambassadors?
                        </p>
                    )
                }
                confirmText={`Yes, ${bulkConfirmation.action} All`}
                variant={bulkConfirmation.action === 'delete' ? 'danger' : 'warning'}
                onConfirm={executeBulkAction}
                onCancel={() => setBulkConfirmation({ isOpen: false, action: null })}
                isLoading={isProcessing}
            />
        </>
    )
}

