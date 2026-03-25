'use client'

import { useState, useEffect, useTransition, Fragment, useRef, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronRight, CheckCircle, Filter, ChevronDown, Clock, AlertCircle, Phone, MapPin, User, Search, Square, CheckSquare, Trash, XCircle, Download, X, Pencil, ArrowUp, ArrowDown, RefreshCcw, Layout, Calendar, CreditCard, Hash, Shield, Key, Upload } from 'lucide-react'
import { useClickOutside } from '@/hooks/use-click-outside'

import { DataTable } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import { bulkRejectReferrals, bulkDeleteReferrals, bulkConfirmReferrals, bulkConvertLeadsToStudents, exportReferrals, updateReferral, getGradeFee, deleteReferral, bulkRevertRejection } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import { format } from 'date-fns'
import { GRADES } from '@/lib/constants'
import { ReferralDetailPanel } from '@/components/superadmin/ReferralDetailPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ReferralManagementTableProps {
    referrals: any[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
        totalPending?: number
        totalConfirmed?: number
    }
    isReadOnly?: boolean
    onBulkAdd?: () => void
    confirmReferral?: (leadId: number, erp: string, feeType: 'OTP' | 'WOTP', admFee?: number, donFee?: number, annualFee?: number, academicYear?: string) => Promise<any>
    convertLeadToStudent?: (leadId: number, data: any) => Promise<any>
    rejectReferral?: (leadId: number, reason: string) => Promise<{ success: boolean; error?: string }>
    campuses?: any[] // Accept campuses list
    onImportCrm?: () => void // New Prop for CRM Import
    isSuperAdmin?: boolean // New restriction prop
    showCampusFilter?: boolean // New toggle prop
}

// --- Excel-Like Filter Component ---
function FilterDropdown({
    label,
    activeValues,
    options,
    onApply,
    onClose,
    onSort
}: {
    label: string,
    activeValues: string[],
    options: string[],
    onApply: (vals: string[]) => void,
    onClose: () => void,
    onSort?: (dir: 'asc' | 'desc') => void
}) {
    const [search, setSearch] = useState('')
    const [tempSelected, setTempSelected] = useState<string[]>(activeValues)

    // reset temp on open
    useEffect(() => { setTempSelected(activeValues) }, [activeValues])

    const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))

    const toggleOption = (opt: string) => {
        if (tempSelected.includes(opt)) {
            setTempSelected(tempSelected.filter(v => v !== opt))
        } else {
            setTempSelected([...tempSelected, opt])
        }
    }

    const handleSelectAll = () => {
        if (tempSelected.length === filteredOptions.length) setTempSelected([])
        else setTempSelected(filteredOptions)
    }

    return (
        <div
            className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
        >
            {/* Header / Search */}
            <div className="p-3 bg-gray-50 border-b border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Filter {label}</span>
                    <button onClick={onClose}><X size={14} className="text-gray-400 hover:text-red-500" /></button>
                </div>
                <div className="relative">
                    <Search size={12} className="absolute left-2 top-2 text-gray-400" />
                    <input
                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Sort Options */}
            {onSort && (
                <div className="flex border-b border-gray-100 divide-x divide-gray-100">
                    <button onClick={() => onSort('asc')} className="flex-1 py-2 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex justify-center items-center gap-1">
                        <ArrowUp size={12} /> A-Z
                    </button>
                    <button onClick={() => onSort('desc')} className="flex-1 py-2 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex justify-center items-center gap-1">
                        <ArrowDown size={12} /> Z-A
                    </button>
                </div>
            )}

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto">
                <button
                    onClick={handleSelectAll}
                    className="w-full px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 text-left border-b border-gray-50"
                >
                    {tempSelected.length === filteredOptions.length ? 'Unselect All' : 'Select All'}
                </button>
                {filteredOptions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No results</div>
                ) : (
                    filteredOptions.map(opt => {
                        const isSelected = tempSelected.includes(opt)
                        return (
                            <div
                                key={opt}
                                onClick={() => toggleOption(opt)}
                                className={`px-4 py-2 text-xs flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-indigo-50/50' : ''}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                    {isSelected && <CheckCircle size={10} className="text-white" />}
                                </div>
                                <span className={isSelected ? 'font-semibold text-gray-900' : 'text-gray-600'}>{opt}</span>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-between gap-2">
                <button
                    onClick={() => { onApply([]); onClose() }}
                    className="flex-1 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50"
                >
                    Clear
                </button>
                <button
                    onClick={() => { onApply(tempSelected); onClose() }}
                    className="flex-1 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:scale-95 transition-transform"
                >
                    Apply
                </button>
            </div>
        </div>
    )
}

export function ReferralManagementTable({
    referrals,
    meta,
    isReadOnly = false,
    onBulkAdd,
    confirmReferral, // Added prop for single confirm action
    convertLeadToStudent, // Added prop for single convert action
    rejectReferral, // Added prop for single reject action
    campuses = [], // Default to empty array
    onImportCrm, // Destructure new prop
    isSuperAdmin = false, // Destructure new restriction prop
    showCampusFilter = true
}: ReferralManagementTableProps) {
    // Check if we are filtering out data client side
    // ... existing code ...
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Fallback Campuses State
    const [campusList, setCampusList] = useState<any[]>(campuses)

    // Fetch campuses if not provided (Fallback)
    useEffect(() => {
        if (campusList.length === 0) {
            getCampuses().then(res => {
                if (res.success && res.campuses) {
                    setCampusList(res.campuses)
                }
            })
        }
    }, [])

    // --- State ---
    // Filters (Mirror URL params)
    // Filters (Mirror URL params)
    // Filters (Mirror URL params)
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [isExporting, setIsExporting] = useState(false)

    // Sync search state with URL when back/forward is used
    useEffect(() => {
        setSearch(searchParams.get('search') || '')
    }, [searchParams])

    // Live Mode
    const [isLive, setIsLive] = useState(false)

    // Polling Effect
    useEffect(() => {
        if (!isLive || isExporting) return // Pause polling while exporting to prevent refresh collision
        const interval = setInterval(() => {
            router.refresh()
            toast.success('Data refreshed', { duration: 1000, icon: <RefreshCcw size={12} /> })
        }, 10000) // 30s might be better but 10s is responsive
        return () => clearInterval(interval)
    }, [isLive, isExporting, router])

    // Pagination Auto-Correction
    useEffect(() => {
        if (!isPending && meta.totalPages > 0 && meta.page > meta.totalPages) {
            const params = new URLSearchParams(searchParams)
            params.set('page', meta.totalPages.toString())
            router.replace(`${pathname}?${params.toString()}`)
        }
    }, [meta.page, meta.totalPages, searchParams, pathname, router, isPending])

    // Dynamic Columns
    const [showColumns, setShowColumns] = useState({
        erp: true,
        parentMobile: true,
        campus: true,
        leadDetails: true,
        role: true,
        date: true,
        fee: true
    })
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
    const columnMenuRef = useRef<HTMLDivElement>(null)
    useClickOutside(columnMenuRef, () => setIsColumnMenuOpen(false))

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Bulk Confirmation States
    const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false)
    const [showBulkAddToStudentConfirm, setShowBulkAddToStudentConfirm] = useState(false)
    const [showBulkRejectConfirm, setShowBulkRejectConfirm] = useState(false)
    const [showBulkRevertRejectionConfirm, setShowBulkRevertRejectionConfirm] = useState(false)
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

    // --- Helpers ---
    function updateParam(key: string, value: string | string[]) {
        const params = new URLSearchParams(searchParams)
        // Handle array or single string
        if (Array.isArray(value)) {
            if (value.length > 0) params.set(key, value.join(','))
            else params.delete(key)
        } else {
            if (value && value !== 'All') params.set(key, value)
            else params.delete(key)
        }
        params.set('page', '1') // Reset paging
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`)
        })
    }

    // Debounce Search
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (searchParams.get('search') || '')) {
                updateParam('search', search)
            }
        }, 500)
        return () => clearTimeout(timeout)
    }, [search])

    // Expanded Row State

    const [editingLead, setEditingLead] = useState<any>(null) // For Edit Modal
    const [bulkFeeType, setBulkFeeType] = useState<'OTP' | 'WOTP' | 'None'>('None')

    // Detail Panel State
    const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<any | null>(null)

    // Helper to update lead and auto-calc fee
    const handleLeadUpdate = async (updates: any) => {
        // 1. Optimistic Update
        const nextState = { ...editingLead, ...updates }
        setEditingLead(nextState)

        // 2. Fee Calculation Trigger
        // Check if we have relevant fields (Campus, Grade, FeeType) to calculate
        if (updates.campus || updates.gradeInterested || updates.selectedFeeType) {
            const c = nextState.campus
            const g = nextState.gradeInterested
            const type = nextState.selectedFeeType

            if (c && g && type && (type === 'OTP' || type === 'WOTP')) {
                // Determine Academic Year? For now default to current.
                const ay = nextState.admittedYear || '2026-2027'

                try {
                    const res = await getGradeFee(c, g, ay)
                    if (res.success && res.fees) {
                        const newFee = type === 'OTP' ? res.fees.otp : res.fees.wotp
                        // Only update if fee is different and valid
                        if (newFee && newFee !== nextState.annualFee) {
                            setEditingLead((prev: any) => ({ ...prev, annualFee: newFee }))
                            toast.success(`Fee auto-updated to ₹${newFee.toLocaleString('en-IN')}`)
                        }
                    } else {
                        toast.error(res.error || 'No fee structure found for this Campus/Grade')
                    }
                } catch (e) {
                    console.error('Fee Calc Error', e)
                    toast.error('Failed to calculate fee')
                }
            }
        }
    }

    // --- Export State ---
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
    const exportMenuRef = useRef<HTMLDivElement>(null)
    useClickOutside(exportMenuRef, () => setIsExportMenuOpen(false))
    const ALL_EXPORT_COLUMNS = ['Lead ID', 'Parent Name', 'Parent Mobile', 'Student Name', 'Grade', 'Section', 'Campus', 'Status', 'Referrer', 'Referrer Role', 'Referrer Code', 'Referrer Campus', 'Referrer Mobile', 'Date Created', 'Confirmed Date', 'ERP Number', 'Academic Year', 'Fee Plan', 'Annual Fee', 'Admission Fee', 'Donation Fee', 'Rejection Reason']
    const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([...ALL_EXPORT_COLUMNS])

    // --- Excel-Like Filter Logic (Headers) ---
    const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null)
    const filterRef = useRef<HTMLDivElement>(null)
    useClickOutside(filterRef, () => setOpenFilterColumn(null))

    const handleFilterClick = (key: string) => {
        if (openFilterColumn === key) {
            setOpenFilterColumn(null)
        } else {
            setOpenFilterColumn(key)
        }
    }

    const renderFilterHeader = (label: string, activeValues: string[], paramKey: string, options: string[]) => {
        const isActive = activeValues.length > 0 && !(activeValues.length === 1 && activeValues[0] === 'All')
        const isOpen = openFilterColumn === paramKey

        return (
            <div className="flex items-center gap-2 relative">
                <span className={isActive ? 'font-bold text-indigo-700' : ''}>{label}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleFilterClick(paramKey)
                    }}
                    className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                    suppressHydrationWarning
                >
                    <Filter size={14} fill={isActive ? "currentColor" : "none"} strokeWidth={2.5} />
                    {isActive && <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">{activeValues.length}</span>}
                </button>

                {isOpen && (
                    <FilterDropdown
                        label={label}
                        activeValues={activeValues}
                        options={options}
                        onClose={() => setOpenFilterColumn(null)}
                        onApply={(vals) => updateParam(paramKey, vals)}
                        onSort={(dir) => {
                            // Sort Logic is handled by simple 'sort' param in backend.
                            // But my updateParam only handles filters.
                            // I'll hack it: updateParam knows 'sort' key?
                            // Actually, let's just use updateParam to set 'sort' field
                            // But wait, sort is complex object { field: 'x', dir: 'y' }?
                            // No, let's look at `admin/page.tsx`.
                            // It ignores `sort` param currently? No, line 24 said `// Add other filters`.
                            // admin-actions.ts `getAllReferrals` accepts sort.
                            // I need to update AdminPage to PASS sort to getAllReferrals.
                            // For now, let's just set a 'sort' param like 'field-asc'
                            // And I'll assume I update AdminPage later.
                            // Actually, for this task, I'll just set regular 'sort' param.
                            const sortVal = `${paramKey}-${dir}` // e.g. status-asc
                            updateParam('sort', sortVal)
                            setOpenFilterColumn(null)
                        }}
                    />
                )}
            </div>
        )
    }


    function handlePageChange(newPage: number) {
        const params = new URLSearchParams(searchParams)
        params.set('page', newPage.toString())
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`)
        })
    }



    // --- Contextual Bulk Logic ---
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
    const selectedLeadsMetadata = useMemo(() => {
        return referrals.filter(r => selectedIdSet.has(r.leadId))
    }, [selectedIdSet, referrals])

    const canBulkApprove = selectedLeadsMetadata.some(r => ['New', 'Follow-up', 'Interested'].includes(r.leadStatus))
    const canBulkStudent = selectedLeadsMetadata.some(r => r.leadStatus === 'Confirmed' && !r.student)
    const canBulkReject = selectedLeadsMetadata.some(r => r.leadStatus !== 'Rejected' && r.leadStatus !== 'Confirmed')
    const canBulkRevertRejection = selectedLeadsMetadata.some(r => r.leadStatus === 'Rejected')
    const canBulkDelete = selectedIds.length > 0 && isSuperAdmin

    // --- Batch Actions ---
    const handleBulkConfirm = async () => {
        setShowBulkApproveConfirm(true)
    }

    const executeBulkConfirm = async () => {
        setShowBulkApproveConfirm(false)
        const tid = toast.loading('Processing Confirmations...')
        const res = await bulkConfirmReferrals(selectedIds, bulkFeeType !== 'None' ? bulkFeeType : undefined)
        if (res.success) {
            toast.success(`Processed ${res.processed} referrals`, { id: tid })
            setSelectedIds([])
            setBulkFeeType('None') // Reset
            router.refresh()
        } else {
            toast.error(res.error, { id: tid })
        }
    }

    const handleBulkAddToStudent = async () => {
        setShowBulkAddToStudentConfirm(true)
    }

    const executeBulkAddToStudent = async () => {
        setShowBulkAddToStudentConfirm(false)
        const tid = toast.loading('Adding Students...')
        const res = await bulkConvertLeadsToStudents(selectedIds)
        if (res.success) {
            toast.success(`Processed ${res.processed} students`, { id: tid })
            if (res.errors && res.errors.length > 0) {
                toast.warning(`${res.errors.length} failed. Check console.`)
            }
            setSelectedIds([])
            router.refresh()
        } else {
            toast.error(res.error, { id: tid })
        }
    }

    const handleUpdateReferral = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingLead) return

        const tid = toast.loading('Updating Referral...')
        try {
            const res = await updateReferral(editingLead.leadId, {
                parentName: editingLead.parentName,
                parentMobile: editingLead.parentMobile,
                studentName: editingLead.studentName,
                gradeInterested: editingLead.gradeInterested,
                campus: editingLead.campus
            })

            if (res.success) {
                toast.success('Updated successfully', { id: tid })
                setEditingLead(null)
                router.refresh()
            } else {
                toast.error(res.error, { id: tid })
            }
        } catch (err) {
            toast.error('Update failed', { id: tid })
        }
    }

    const handleBulkReject = async () => {
        setShowBulkRejectConfirm(true)
    }

    const executeBulkReject = async () => {
        setShowBulkRejectConfirm(false)
        const tid = toast.loading('Rejecting...')
        const res = await bulkRejectReferrals(selectedIds)
        if (res.success) {
            toast.success('Rejected successfully', { id: tid })
            setSelectedIds([])
            router.refresh()
        } else {
            toast.error(res.error, { id: tid })
        }
    }

    const handleBulkRevertRejection = async () => {
        setShowBulkRevertRejectionConfirm(true)
    }

    const executeBulkRevertRejection = async () => {
        setShowBulkRevertRejectionConfirm(false)
        const tid = toast.loading('Reverting Rejections...')
        const res = await bulkRevertRejection(selectedIds)
        if (res.success) {
            toast.success(`Reverted ${res.count} rejections`, { id: tid })
            setSelectedIds([])
            router.refresh()
        } else {
            toast.error(res.error, { id: tid })
        }
    }

    const handleExport = async () => {
        if (isExporting) return
        setIsExporting(true)
        const tid = toast.loading('Generating CSV...')
        try {
            // Get values from searchParams
            const statusValues = searchParams.get('status') ? searchParams.get('status')!.split(',') : []
            const roleValues = searchParams.get('role') ? searchParams.get('role')!.split(',') : []
            const campusValues = searchParams.get('campus') ? searchParams.get('campus')!.split(',') : []
            const feeTypeValues = searchParams.get('feeType') ? searchParams.get('feeType')!.split(',') : []
            const dateFrom = searchParams.get('from') || undefined
            const dateTo = searchParams.get('to') || undefined

            setTimeout(async () => {
                try {
                    const res = await exportReferrals({
                        status: statusValues.length > 0 ? statusValues.join(',') : undefined,
                        role: roleValues.length > 0 ? roleValues.join(',') : undefined,
                        campus: campusValues.length > 0 ? campusValues.join(',') : undefined,
                        feeType: feeTypeValues.length > 0 ? feeTypeValues.join(',') : undefined,
                        academicYear: searchParams.get('year') || undefined,
                        grade: searchParams.get('grade') || undefined,
                        search: search || undefined,
                        dateRange: (dateFrom && dateTo) ? { from: dateFrom, to: dateTo } : undefined,
                        columns: selectedExportColumns
                    })

                    if (res.success && res.csv) {
                        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `referrals-export-${new Date().toISOString().split('T')[0]}.csv`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        window.URL.revokeObjectURL(url)
                        toast.success('Download started', { id: tid })
                    } else {
                        toast.error(res.error || 'Export failed', { id: tid })
                    }
                } catch (e) {
                    toast.error('Export error', { id: tid })
                } finally {
                    // Phase 2: Add a short delay before clearing the exporting state
                    // to ensure the browser has locked the file download and the main thread is free
                    setTimeout(() => {
                        setIsExporting(false)
                    }, 1000)
                }
            }, 100)
        } catch (e) {
            toast.error('Export error', { id: tid })
            setIsExporting(false)
        }
    }

    const handleBulkDelete = async () => {
        setShowBulkDeleteConfirm(true)
    }

    const executeBulkDelete = async () => {
        setShowBulkDeleteConfirm(false)
        const tid = toast.loading('Deleting...')
        const res = await bulkDeleteReferrals(selectedIds)
        if (res.success) {
            toast.success('Deleted successfully', { id: tid })
            setSelectedIds([])
            router.refresh()
        } else {
            toast.error(res.error, { id: tid })
        }
    }

    // Assuming ReferralManagementTableProps is defined here or imported
    // For the purpose of this edit, we'll add the property to the inferred props.
    // If ReferralManagementTableProps is an interface, it should be updated there.
    // Example:
    // interface ReferralManagementTableProps {
    //     referrals: ReferralWithUserAndStudent[]
    //     meta: PaginationMeta
    //     isReadOnly?: boolean
    //     onBulkAdd: (ids: string[]) => void
    //     confirmReferral: (id: string, feeType?: FeeType) => Promise<any>
    //     convertLeadToStudent: (id: string) => Promise<any>
    //     rejectReferral: (id: string) => Promise<any>
    //     campuses?: string[]
    //     isSuperAdmin?: boolean
    //     campaigns?: any[]
    //     showCampusFilter?: boolean // Added this line
    // }

    // --- Columns Definition ---
    const columns = useMemo(() => {
        const cols = []

        if (showColumns.leadDetails) {
            cols.push({
                header: 'Lead Details',
                accessorKey: 'studentName',
                cell: (row: any) => (
                    <div>
                        <div className="font-bold text-gray-900">{row.studentName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{row.parentName}</div>
                    </div>
                )
            })
        }

        if (showColumns.role) {
            cols.push({
                header: 'Referrer',
                accessorKey: 'user',
                cell: (row: any) => (
                    <div>
                        <div className="font-bold text-gray-900">{row.user?.fullName}</div>
                        <div className="text-xs text-gray-500">{row.user?.role}</div>
                    </div>
                )
            })
        }

        if (showColumns.parentMobile) {
            cols.push({
                header: 'Mobile',
                accessorKey: 'parentMobile',
                cell: (row: any) => <span className="font-mono text-xs">{row.parentMobile}</span>
            })
        }

        if (showColumns.campus && showCampusFilter) { // Conditional rendering based on showCampusFilter
            cols.push({
                header: 'Campus',
                accessorKey: 'campus',
                sortable: true
            })
        }

        if (showColumns.fee) {
            cols.push({
                header: 'Plan',
                accessorKey: 'selectedFeeType',
                cell: (row: any) => (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${row.selectedFeeType === 'OTP' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        row.selectedFeeType === 'WOTP' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                        {row.selectedFeeType || 'N/A'}
                    </span>
                )
            })
            cols.push({
                header: 'Annual Fee',
                accessorKey: 'annualFee',
                cell: (row: any) => (
                    <span className="font-black text-gray-900" suppressHydrationWarning>
                        {row.annualFee ? `₹${row.annualFee.toLocaleString()}` : 'N/A'}
                    </span>
                )
            })
        }

        cols.push({
            header: 'Status',
            accessorKey: 'leadStatus',
            cell: (row: any) => {
                const isConfirmed = row.leadStatus === 'Confirmed'
                const isAdmitted = row.leadStatus === 'Admitted'
                const isRejected = row.leadStatus === 'Rejected'
                const isFollowUp = row.leadStatus === 'Follow-up' || row.leadStatus === 'Follow_up'

                return (
                    <div className="relative group/status flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-all duration-300 border ${isAdmitted ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm shadow-indigo-500/10' :
                            isConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/10' :
                                isRejected ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                    isFollowUp ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                            {row.leadStatus}
                        </span>
                    </div>
                )
            }
        })

        if (showColumns.date) {
            cols.push({
                header: 'Date',
                accessorKey: 'createdAt',
                cell: (row: any) => {
                    const date = new Date(row.createdAt)
                    const now = new Date()
                    const diffTime = Math.abs(now.getTime() - date.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    const isStale = diffDays > 2 && row.leadStatus === 'New'

                    return (
                        <div className="flex flex-col">
                            <span className={`text-[11px] font-bold ${isStale ? 'text-rose-600 animate-pulse' : 'text-gray-500'}`}>
                                {format(date, 'dd MMM yyyy')}
                            </span>
                            {isStale && (
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                    <AlertCircle size={10} /> {diffDays}d Stale
                                </span>
                            )}
                        </div>
                    )
                }
            })
        }

        cols.push({
            header: 'View',
            accessorKey: 'leadId',
            cell: (row: any) => (
                <button
                    onClick={() => setSelectedLeadForDetail(row)}
                    className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 shadow-sm bg-white hover:scale-110 active:scale-95"
                    title="View Details"
                    suppressHydrationWarning
                >
                    <ChevronRight size={16} strokeWidth={2.5} />
                </button>
            )
        })

        return cols
    }, [showColumns, setSelectedLeadForDetail])

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-[100vw] overflow-x-hidden">
            {/* Header / Stats Row Placeholder if needed */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl relative">
                        <User size={20} strokeWidth={2.5} />
                        {isPending && (
                            <div className="absolute inset-0 bg-white/50 animate-pulse rounded-xl" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            Global Referral System (v2)
                        </h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                            Page {meta.page} of {meta.totalPages} • {meta.total} Total
                        </p>
                    </div>
                </div>

            </div>

            {/* Live Analytics Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-red-100 hover:shadow-md transition-all duration-300">
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-all duration-300">
                        <User size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total leads</p>
                        <h4 className="text-xl font-black text-gray-900 leading-none mt-1">{meta.total}</h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-amber-100 hover:shadow-md transition-all duration-300">
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all duration-300">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Action Needed</p>
                        <h4 className="text-xl font-black text-gray-900 leading-none mt-1">
                            {meta.totalPending !== undefined ? meta.totalPending : referrals.filter(r => ['New', 'Follow_up', 'Follow-up', 'Interested'].includes(r.leadStatus)).length}
                        </h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-emerald-100 hover:shadow-md transition-all duration-300">
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all duration-300">
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admitted/Confirmed</p>
                        <h4 className="text-xl font-black text-gray-900 leading-none mt-1">
                            {meta.totalConfirmed !== undefined ? meta.totalConfirmed : referrals.filter(r => ['Confirmed', 'Admitted'].includes(r.leadStatus)).length}
                        </h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 hover:shadow-md transition-all duration-300">
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all duration-300">
                        <Filter size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conv. Rate</p>
                        <h4 className="text-xl font-black text-gray-900 leading-none mt-1">
                            {meta.totalConfirmed !== undefined && meta.total > 0
                                ? ((meta.totalConfirmed / meta.total) * 100).toFixed(0)
                                : (referrals.length > 0 ? Math.round((referrals.filter(r => ['Confirmed', 'Admitted'].includes(r.leadStatus)).length / referrals.length) * 100) : 0)
                            }%
                        </h4>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Live Toggle */}
                <button
                    onClick={() => setIsLive(!isLive)}
                    suppressHydrationWarning={true}
                    className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isLive ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white border-gray-200 text-gray-500'}`}
                    title="Auto-refresh every 10s"
                >
                    <RefreshCcw size={14} className={isLive ? 'animate-spin' : ''} />
                    {isLive ? 'Live' : 'Off'}
                </button>

                {/* Export Dropdown */}
                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        suppressHydrationWarning={true}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                    >
                        <Download size={14} /> Export
                    </button>
                    {isExportMenuOpen && (
                        <div className="absolute left-0 top-12 bg-white border border-gray-100 shadow-2xl rounded-xl p-4 w-[500px] z-50 animate-in fade-in slide-in-from-top-2 flex flex-col ring-1 ring-black/5">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Select Columns to Export</h4>
                            <div className="grid grid-cols-2 gap-2 mb-4 scrollbar-hide overflow-y-auto max-h-[60vh]">
                                {ALL_EXPORT_COLUMNS.map(col => (
                                    <label key={col} className="flex items-center gap-2 text-xs p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${selectedExportColumns.includes(col) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}`}>
                                            {selectedExportColumns.includes(col) && <CheckCircle size={10} className="text-white" />}
                                        </div>
                                        {/* Hidden real checkbox for logic, custom UI above */}
                                        <input
                                            type="checkbox"
                                            checked={selectedExportColumns.includes(col)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedExportColumns([...selectedExportColumns, col])
                                                else setSelectedExportColumns(selectedExportColumns.filter(c => c !== col))
                                            }}
                                            className="hidden"
                                        />
                                        <span className={`font-medium ${selectedExportColumns.includes(col) ? 'text-gray-900' : 'text-gray-600'}`}>{col}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="pt-3 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => setSelectedExportColumns(ALL_EXPORT_COLUMNS)}
                                    className="flex-1 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => {
                                        setIsExportMenuOpen(false)
                                        handleExport()
                                    }}
                                    className="flex-1 py-1.5 text-[10px] font-bold bg-indigo-600 text-white rounded shadow hover:bg-indigo-700"
                                >
                                    Download
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Column Toggle */}
                <div className="relative" ref={columnMenuRef}>
                    <button
                        onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                        suppressHydrationWarning={true}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-50"
                    >
                        <Layout size={14} /> Columns
                    </button>
                    {isColumnMenuOpen && (
                        <div className="absolute right-0 top-12 bg-white border border-gray-100 shadow-xl rounded-xl p-3 w-48 z-50 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Toggle Columns</h4>
                            {Object.keys(showColumns)
                                .filter(key => showCampusFilter || key !== 'campus')
                                .map(key => (
                                    <label key={key} className="flex items-center gap-2 text-sm p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(showColumns as any)[key]}
                                            onChange={(e) => setShowColumns({ ...showColumns, [key]: e.target.checked })}
                                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    </label>
                                ))}
                        </div>
                    )}
                </div>

                {onImportCrm && !isReadOnly && (
                    <button
                        onClick={onImportCrm}
                        suppressHydrationWarning={true}
                        className="px-4 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-100 transition-colors flex items-center gap-2"
                    >
                        <Shield size={14} /> CRM Blocklist
                    </button>
                )}

                {onBulkAdd && !isReadOnly && (
                    <button
                        onClick={onBulkAdd}
                        suppressHydrationWarning={true}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-transform active:scale-95 shadow-lg shadow-gray-200"
                    >
                        <Upload size={14} /> Import
                    </button>
                )}
            </div>


            {/* Filters */}
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search parents, students, mobile..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        suppressHydrationWarning={true}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium"
                    />
                </div>

                {/* Dynamic Filters */}
                <select
                    value={searchParams.get('role') || ''}
                    onChange={(e) => updateParam('role', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                    suppressHydrationWarning={true}
                >
                    <option value="">All Roles</option>
                    <option value="Parent">Parent</option>
                    <option value="Staff">Staff</option>
                </select>

                {showCampusFilter && (
                    <select
                        value={searchParams.get('campus') || ''}
                        onChange={(e) => updateParam('campus', e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                        suppressHydrationWarning={true}
                    >
                        <option value="">All Campuses</option>
                        {campusList.map(c => (
                            <option key={c.id} value={c.campusName}>{c.campusName}</option>
                        ))}
                    </select>
                )}

                <select
                    value={searchParams.get('feeType') || ''}
                    onChange={(e) => updateParam('feeType', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                    suppressHydrationWarning={true}
                >
                    <option value="">All Plans</option>
                    <option value="OTP">OTP</option>
                    <option value="WOTP">WOTP</option>
                </select>

                <select
                    value={searchParams.get('grade') || ''}
                    onChange={(e) => updateParam('grade', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                    suppressHydrationWarning={true}
                >
                    <option value="">All Grades</option>
                    {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>

                <select
                    value={searchParams.get('status') || ''}
                    onChange={(e) => updateParam('status', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                    suppressHydrationWarning={true}
                >
                    <option value="">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Rejected">Rejected</option>
                </select>

                {/* Date Filter (Keeping Date Range here as it's global) */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2">
                    <input
                        type="date"
                        value={searchParams.get('from') || ''}
                        onChange={(e) => {
                            updateParam('from', e.target.value)
                        }}
                        suppressHydrationWarning={true}
                        className="py-2 text-sm font-medium text-gray-700 focus:outline-none"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={searchParams.get('to') || ''}
                        onChange={(e) => {
                            updateParam('to', e.target.value)
                        }}
                        suppressHydrationWarning={true}
                        className="py-2 text-sm font-medium text-gray-700 focus:outline-none"
                    />
                </div>
            </div>



            <DataTable
                columns={columns}
                data={referrals}
                manualPagination={true}
                pageCount={meta.totalPages}
                rowCount={meta.total}
                currentPage={meta.page}
                onPageChange={handlePageChange}
                enableMultiSelection={true}
                onSelectionChange={(selected) => setSelectedIds(selected.map((r: any) => r.leadId))}
                uniqueKey="leadId"
                emptyState={
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-6 shadow-xl shadow-red-100/50">
                            <User size={40} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">No Referrals Yet?</h3>
                        <p className="text-gray-500 max-w-sm mb-8 font-medium">
                            Your community is waiting. Share your code or open the Promo Kit to start earning benefits.
                        </p>
                        <button
                            onClick={() => router.push('/marketing')}
                            suppressHydrationWarning={true}
                            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-2xl shadow-gray-200 flex items-center gap-3"
                        >
                            <Download size={18} /> Open Promo Kit
                        </button>
                    </div>
                }
            />



            {/* Floating Batch Actions */}
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-gray-900 border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-xl ring-1 ring-white/20">
                        <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                            <div className="bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center">
                                {selectedIds.length}
                            </div>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className={`flex flex-col items-center justify-center p-4 border border-indigo-100 rounded-2xl transition-all ${isExporting ? 'bg-indigo-50/50 cursor-wait' : 'bg-indigo-50 hover:bg-indigo-100 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95'}`}
                            >
                                <Download size={24} className={`mb-2 ${isExporting ? 'animate-bounce text-indigo-400' : 'text-indigo-600'}`} />
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{isExporting ? 'Exporting...' : 'Export Selected'}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {canBulkApprove && (
                                <div className="flex items-center gap-2 pr-3 border-r border-white/10">
                                    <select
                                        value={bulkFeeType}
                                        onChange={(e) => setBulkFeeType(e.target.value as any)}
                                        className="bg-gray-800 text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none border border-white/5 focus:border-red-500"
                                    >
                                        <option value="None">Inherit Plan</option>
                                        <option value="OTP">Set OTP</option>
                                        <option value="WOTP">Set WOTP</option>
                                    </select>
                                    <button
                                        onClick={handleBulkConfirm}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 flex items-center gap-2"
                                    >
                                        <CheckCircle size={14} /> Confirm
                                    </button>
                                </div>
                            )}

                            {canBulkStudent && (
                                <button
                                    onClick={handleBulkAddToStudent}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 flex items-center gap-2 border-r border-white/10"
                                >
                                    <User size={14} /> Add Student
                                </button>
                            )}

                            {canBulkReject && (
                                <button
                                    onClick={handleBulkReject}
                                    className="text-white/60 hover:text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                                >
                                    <XCircle size={14} /> Reject
                                </button>
                            )}

                            {canBulkRevertRejection && (
                                <button
                                    onClick={handleBulkRevertRejection}
                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    <RefreshCcw size={14} /> Revert Rejection
                                </button>
                            )}

                            {canBulkDelete && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    <Trash size={14} /> Delete
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-white/40 hover:text-white p-2 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Referral Detail Side Panel (Phase 2 UX) */}
            <ReferralDetailPanel
                referral={selectedLeadForDetail}
                onClose={() => setSelectedLeadForDetail(null)}
                isSuperAdmin={isSuperAdmin}
                campuses={campusList}
                onUpdate={async (id, data) => {
                    const res = await updateReferral(id, data)
                    if (res.success) {
                        // Update local selection to reflect changes in UI immediately
                        setSelectedLeadForDetail((prev: any) => prev?.leadId === id ? { ...prev, ...data } : prev)
                        router.refresh()
                    }
                    return res
                }}
                onConfirm={async (id, erp, feeType, admFee, donFee, annualFee, academicYear) => {
                    const res = await confirmReferral?.(id, erp, feeType, admFee, donFee, annualFee, academicYear)
                    if (res?.success) {
                        setSelectedLeadForDetail((prev: any) => prev?.leadId === id ? {
                            ...prev,
                            leadStatus: 'Admitted',
                            admissionNumber: erp,
                            selectedFeeType: feeType,
                            annualFee,
                            admittedYear: academicYear
                        } : prev)
                        router.refresh()
                    }
                    return res
                }}
                onReject={rejectReferral}
                onDelete={referralId => deleteReferral(referralId)}
            />

            {/* Bulk Confirm Dialogs */}
            <ConfirmDialog
                isOpen={showBulkApproveConfirm}
                title="Confirm Admissions?"
                description={bulkFeeType !== 'None'
                    ? `Are you sure you want to confirm ${selectedIds.length} referrals with the ${bulkFeeType} plan?`
                    : `Are you sure you want to confirm ${selectedIds.length} referrals? (Only those with pre-assigned plans will be processed)`}
                confirmText="Yes, Confirm All"
                variant="success"
                onConfirm={executeBulkConfirm}
                onCancel={() => setShowBulkApproveConfirm(false)}
            />

            <ConfirmDialog
                isOpen={showBulkAddToStudentConfirm}
                title="Add to Student Database?"
                description={`Are you sure you want to add ${selectedIds.length} leads to the Student Database? This will create new student profiles.`}
                confirmText="Yes, Add Students"
                variant="info"
                onConfirm={executeBulkAddToStudent}
                onCancel={() => setShowBulkAddToStudentConfirm(false)}
            />

            <ConfirmDialog
                isOpen={showBulkRejectConfirm}
                title="Reject Referrals?"
                description={`Are you sure you want to REJECT ${selectedIds.length} referrals?`}
                confirmText="Yes, Reject"
                variant="danger"
                onConfirm={executeBulkReject}
                onCancel={() => setShowBulkRejectConfirm(false)}
            />

            <ConfirmDialog
                isOpen={showBulkRevertRejectionConfirm}
                title="Revert Rejections?"
                description={`Are you sure you want to REVERT REJECTION for ${selectedIds.length} referrals? Their status will be reset to New.`}
                confirmText="Yes, Revert All"
                variant="warning"
                onConfirm={executeBulkRevertRejection}
                onCancel={() => setShowBulkRevertRejectionConfirm(false)}
            />

            <ConfirmDialog
                isOpen={showBulkDeleteConfirm}
                title="Delete Referrals?"
                description={`Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} referrals? This action cannot be undone.`}
                confirmText="Yes, Delete Permanently"
                variant="danger"
                onConfirm={executeBulkDelete}
                onCancel={() => setShowBulkDeleteConfirm(false)}
            />

            {/* Edit Modal */}
            {editingLead && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Edit Referral Details</h3>
                            <button onClick={() => setEditingLead(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                                <X size={18} />
                            </button>
                        </div>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()
                                if (!editingLead) return
                                const tid = toast.loading('Updating referral...')
                                try {
                                    const res = await updateReferral(editingLead.leadId, {
                                        studentName: editingLead.studentName || undefined,
                                        parentName: editingLead.parentName || undefined,
                                        parentMobile: editingLead.parentMobile || undefined,
                                        gradeInterested: editingLead.gradeInterested || undefined,
                                        campus: editingLead.campus || undefined,

                                        // Admin Fields
                                        admissionNumber: editingLead.admissionNumber || undefined,
                                        section: editingLead.section || undefined,
                                        leadStatus: editingLead.leadStatus,
                                        selectedFeeType: editingLead.selectedFeeType || null,
                                        annualFee: editingLead.annualFee,
                                        admittedYear: editingLead.admittedYear,
                                        rejectionReason: editingLead.rejectionReason,
                                        admissionFeeCollected: editingLead.admissionFeeCollected,
                                        donationFeeCollected: editingLead.donationFeeCollected
                                    })

                                    if (res.success) {
                                        toast.success('Referral updated successfully!', { id: tid })
                                        setEditingLead(null)
                                        router.refresh()
                                    } else {
                                        toast.error(res.error, { id: tid })
                                    }
                                } catch (error) {
                                    toast.error('Failed to update', { id: tid })
                                }
                            }}
                        >
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                {/* Section 1: Lead Information */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead & Parent Information</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Parent Name (Lead)</label>
                                            <input
                                                type="text"
                                                value={editingLead.parentName}
                                                onChange={e => setEditingLead({ ...editingLead, parentName: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium focus:ring-red-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Student Name</label>
                                            <input
                                                type="text"
                                                value={editingLead.studentName || ''}
                                                onChange={e => setEditingLead({ ...editingLead, studentName: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-red-500/20"
                                                placeholder="Student Name..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Mobile</label>
                                            <input
                                                type="text"
                                                value={editingLead.parentMobile}
                                                onChange={e => setEditingLead({ ...editingLead, parentMobile: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-red-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Grade</label>
                                            <select
                                                value={editingLead.gradeInterested || ''}
                                                onChange={e => handleLeadUpdate({ gradeInterested: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-red-500/20"
                                            >
                                                <option value="">Select Grade</option>
                                                {(() => {
                                                    const selectedCampusName = editingLead.campus || ''
                                                    const selectedCampus = campuses.find((c: any) => c.campusName === selectedCampusName)
                                                    let availableGrades: string[] = []

                                                    if (selectedCampus && selectedCampus.grades) {
                                                        availableGrades = selectedCampus.grades.split(',').map((g: string) => g.trim()).filter(Boolean)
                                                    }
                                                    if (availableGrades.length === 0) {
                                                        availableGrades = [...GRADES]
                                                    }
                                                    const currentVal = editingLead.gradeInterested
                                                    const showGrades = [...availableGrades]
                                                    if (currentVal && !showGrades.includes(currentVal)) {
                                                        showGrades.unshift(currentVal)
                                                    }
                                                    return Array.from(new Set(showGrades)).map(g => (
                                                        <option key={g || 'empty-grade'} value={g}>{g}</option>
                                                    ))
                                                })()}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Campus</label>
                                            <select
                                                value={editingLead.campus || ''}
                                                onChange={e => handleLeadUpdate({ campus: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-red-500/20"
                                                suppressHydrationWarning={true}
                                            >
                                                <option value="">Select Campus...</option>
                                                {(campuses || []).map((c: any) => (
                                                    <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Academic Year</label>
                                            <select
                                                value={editingLead.admittedYear || '2026-2027'}
                                                onChange={e => handleLeadUpdate({ admittedYear: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-red-500/20"
                                                suppressHydrationWarning={true}
                                            >
                                                <option value="2026-2027">2026-2027</option>
                                                <option value="2025-2026">2025-2026</option>
                                                <option value="2024-2025">2024-2025</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Administrative Details */}
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <Shield size={14} className="text-amber-600" />
                                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Office & Admission Details</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Lead Status</label>
                                            <select
                                                value={editingLead.leadStatus}
                                                onChange={e => setEditingLead({ ...editingLead, leadStatus: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs font-bold bg-amber-50/30 focus:ring-amber-500/20"
                                                suppressHydrationWarning={true}
                                            >
                                                <option value="New">New</option>
                                                <option value="Follow-up">Follow-up</option>
                                                <option value="Interested">Interested</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Admitted">Admitted</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Admission/ERP No</label>
                                            <input
                                                type="text"
                                                value={editingLead.admissionNumber || ''}
                                                onChange={e => setEditingLead({ ...editingLead, admissionNumber: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono bg-amber-50/30 focus:ring-amber-500/20"
                                                placeholder="ERP-123"
                                                suppressHydrationWarning={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Fee Plan</label>
                                            <select
                                                value={editingLead.selectedFeeType || ''}
                                                onChange={e => handleLeadUpdate({ selectedFeeType: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs font-bold bg-amber-50/30 focus:ring-amber-500/20"
                                                suppressHydrationWarning={true}
                                            >
                                                <option value="">-- Select --</option>
                                                <option value="OTP">OTP</option>
                                                <option value="WOTP">WOTP</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Section</label>
                                            <input
                                                type="text"
                                                value={editingLead.section || ''}
                                                onChange={e => setEditingLead({ ...editingLead, section: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50/30 focus:ring-amber-500/20"
                                                placeholder="A / B..."
                                                suppressHydrationWarning={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Annual Fee</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    value={editingLead.annualFee || ''}
                                                    onChange={e => setEditingLead({ ...editingLead, annualFee: e.target.value ? Number(e.target.value) : null })}
                                                    className="w-full pl-7 pr-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50/30 font-mono font-bold focus:ring-amber-500/20"
                                                    placeholder="60000"
                                                    suppressHydrationWarning={true}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Rejection Reason</label>
                                            <input
                                                type="text"
                                                value={editingLead.rejectionReason || ''}
                                                onChange={e => setEditingLead({ ...editingLead, rejectionReason: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50/30 focus:ring-amber-500/20"
                                                placeholder="Reason..."
                                                suppressHydrationWarning={true}
                                            />
                                        </div>
                                    </div>

                                    {!['ACET', 'AASC', 'ACCHM'].includes(editingLead.campus || '') && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Admission Fee</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={editingLead.admissionFeeCollected ?? ''}
                                                        onChange={e => setEditingLead({ ...editingLead, admissionFeeCollected: e.target.value ? Number(e.target.value) : null })}
                                                        className="w-full pl-7 pr-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50/30 font-mono font-bold focus:ring-amber-500/20"
                                                        placeholder="0"
                                                        suppressHydrationWarning={true}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Donation Fee</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={editingLead.donationFeeCollected ?? ''}
                                                        onChange={e => setEditingLead({ ...editingLead, donationFeeCollected: e.target.value ? Number(e.target.value) : null })}
                                                        className="w-full pl-7 pr-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50/30 font-mono font-bold focus:ring-amber-500/20"
                                                        placeholder="0"
                                                        suppressHydrationWarning={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 flex gap-3 border-t bg-gray-50">
                                <button
                                    type="button"
                                    onClick={() => setEditingLead(null)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-colors shadow-lg shadow-gray-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
