'use client'

import { useState, useEffect, useTransition, Fragment, useRef, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronRight, CheckCircle, Filter, ChevronDown, Clock, AlertCircle, Phone, MapPin, User, Search, Square, CheckSquare, Trash, XCircle, Download, X, Pencil, ArrowUp, ArrowDown, RefreshCcw, Layout, Calendar, CreditCard, Hash, Shield, Key, Upload } from 'lucide-react'

import { DataTable } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import { bulkRejectReferrals, bulkDeleteReferrals, bulkConfirmReferrals, bulkConvertLeadsToStudents, exportReferrals, updateReferral, getGradeFee } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import { format } from 'date-fns'
import { GRADES } from '@/lib/constants'

interface ReferralManagementTableProps {
    referrals: any[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
    isReadOnly?: boolean
    onBulkAdd?: () => void
    confirmReferral?: (leadId: number, erp: string, feeType: 'OTP' | 'WOTP') => Promise<any>
    convertLeadToStudent?: (leadId: number, data: any) => Promise<any>
    rejectReferral?: (leadId: number) => Promise<{ success: boolean; error?: string }>
    campuses?: any[] // Accept campuses list
    onImportCrm?: () => void // New Prop for CRM Import
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
    onImportCrm // Destructure new prop
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

    // Sync search state with URL when back/forward is used
    useEffect(() => {
        setSearch(searchParams.get('search') || '')
    }, [searchParams])

    // Live Mode
    const [isLive, setIsLive] = useState(false)

    // Polling Effect
    useEffect(() => {
        if (!isLive) return
        const interval = setInterval(() => {
            router.refresh()
            toast.success('Data refreshed', { duration: 1000, icon: <RefreshCcw size={12} /> })
        }, 10000) // 30s might be better but 10s is responsive
        return () => clearInterval(interval)
    }, [isLive, router])

    // Pagination Auto-Correction
    useEffect(() => {
        if (meta.totalPages > 0 && meta.page > meta.totalPages) {
            const params = new URLSearchParams(searchParams)
            params.set('page', meta.totalPages.toString())
            router.replace(`${pathname}?${params.toString()}`)
        }
    }, [meta.page, meta.totalPages, searchParams, pathname, router])

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

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([])

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

    const [confirmingId, setConfirmingId] = useState<number | null>(null)
    const [erpInput, setErpInput] = useState('')
    const [selectedFeeType, setSelectedFeeType] = useState<'OTP' | 'WOTP'>('OTP')
    const [bulkFeeType, setBulkFeeType] = useState<'OTP' | 'WOTP' | 'None'>('None')
    const [editingLead, setEditingLead] = useState<any>(null) // For Edit Modal
    const [editMode, setEditMode] = useState<'referral' | 'office'>('referral')

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
    const ALL_EXPORT_COLUMNS = ['Lead ID', 'Parent Name', 'Parent Mobile', 'Student Name', 'Grade', 'Section', 'Campus', 'Status', 'Referrer', 'Referrer Role', 'Referrer Mobile', 'Date Created', 'ERP Number', 'Academic Year', 'Fee Plan', 'Annual Fee', 'Rejection Reason']
    const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([...ALL_EXPORT_COLUMNS])

    // --- Excel-Like Filter Logic (Headers) ---
    const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null)
    const filterRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setOpenFilterColumn(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

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



    // --- Bulk Actions ---
    const handleBulkConfirm = async () => {
        const msg = bulkFeeType !== 'None'
            ? `Confirm ${selectedIds.length} referrals with ${bulkFeeType} plan?`
            : `Confirm ${selectedIds.length} referrals? (Only those with pre-assigned plans will be processed)`

        if (!confirm(msg)) return
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
        if (!confirm(`Add ${selectedIds.length} leads to Student Database? This will create student profiles.`)) return
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
        if (!confirm(`Reject ${selectedIds.length} referrals?`)) return
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

    const handleExport = async () => {
        const tid = toast.loading('Generating CSV...')
        try {
            // Get values from searchParams
            const statusValues = searchParams.get('status') ? searchParams.get('status')!.split(',') : []
            const roleValues = searchParams.get('role') ? searchParams.get('role')!.split(',') : []
            const campusValues = searchParams.get('campus') ? searchParams.get('campus')!.split(',') : []
            const feeTypeValues = searchParams.get('feeType') ? searchParams.get('feeType')!.split(',') : []
            const dateFrom = searchParams.get('from') || undefined
            const dateTo = searchParams.get('to') || undefined

            const res = await exportReferrals({
                status: statusValues.length > 0 ? statusValues.join(',') : undefined,
                role: roleValues.length > 0 ? roleValues.join(',') : undefined,
                campus: campusValues.length > 0 ? campusValues.join(',') : undefined,
                feeType: feeTypeValues.length > 0 ? feeTypeValues.join(',') : undefined,
                grade: searchParams.get('grade') || undefined,
                search: search || undefined,
                dateRange: (dateFrom && dateTo) ? { from: dateFrom, to: dateTo } : undefined,
                columns: selectedExportColumns // Pass selected columns
            })

            if (res.success && res.csv) {
                const blob = new Blob([res.csv], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `referrals-export-${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                toast.success('Download started', { id: tid })
            } else {
                toast.error(res.error || 'Export failed', { id: tid })
            }
        } catch (e) {
            toast.error('Export error', { id: tid })
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Permanently DELETE ${selectedIds.length} referrals?`)) return
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


    // --- Columns Definition ---
    const columns = [
        {
            header: 'Lead Details',
            accessorKey: 'studentName',
            cell: (row: any) => (
                <div>
                    <div className="font-bold text-gray-900">{row.studentName || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{row.parentName}</div>
                </div>
            )
        },
        {
            header: 'Referrer',
            accessorKey: 'user',
            cell: (row: any) => (
                <div>
                    <div className="font-bold text-gray-900">{row.user?.fullName}</div>
                    <div className="text-xs text-gray-500">{row.user?.role}</div>
                </div>
            )
        },
        {
            header: 'Mobile',
            accessorKey: 'parentMobile',
            cell: (row: any) => <span className="font-mono text-xs">{row.parentMobile}</span>
        },
        {
            header: 'Campus',
            accessorKey: 'campus',
            sortable: true
        },
        {
            header: 'Status',
            accessorKey: 'leadStatus',
            cell: (row: any) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${row.leadStatus === 'Confirmed' ? 'bg-green-100 text-green-700' :
                    row.leadStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {row.leadStatus}
                </span>
            )
        },
        {
            header: 'Date',
            accessorKey: 'createdAt',
            cell: (row: any) => <span className="text-xs text-gray-500">{format(new Date(row.createdAt), 'dd MMM yyyy')}</span>
        }
    ]

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
                <div className="relative">
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
                <div className="relative">
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
                            {Object.keys(showColumns).map(key => (
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
                            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-2xl shadow-gray-200 flex items-center gap-3"
                        >
                            <Download size={18} /> Open Promo Kit
                        </button>
                    </div>
                }
                renderExpandedRow={(r: any) => (
                    <div className="p-8 bg-gradient-to-br from-gray-50/80 to-white shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Section 1: Lead Information */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} className="text-gray-500" />
                                    Lead Information
                                </h4>
                                <div>
                                    <p className="text-lg font-bold text-gray-900 uppercase tracking-tight">{r.studentName || 'Not Specified'}</p>
                                    <p className="text-sm text-gray-500 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-wider">
                                        <User size={12} className="text-ui-primary" /> {r.parentName}
                                    </p>
                                    <p className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-0.5">
                                        <Phone size={12} /> {r.parentMobile}
                                    </p>
                                    {(r.gradeInterested || r.section) && (
                                        <p className="text-xs text-gray-600 bg-gray-100 inline-block px-2 py-1 rounded mt-2 font-semibold">
                                            Interested in: {r.gradeInterested} {r.section ? `(${r.section})` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Referrer Information */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} className="text-blue-500" />
                                    Referrer
                                </h4>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{r.user.fullName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${r.user.role === 'Staff' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {r.user.role}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            #{r.user.referralCode}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Status & Timeline */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} className="text-amber-500" />
                                    Timeline
                                </h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Created:</span>
                                        <span className="font-medium text-gray-900">
                                            {format(new Date(r.createdAt), 'dd MMM yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Status:</span>
                                        <span className={`font-bold ${r.leadStatus === 'Confirmed' ? 'text-green-600' : 'text-gray-900'}`}>{r.leadStatus}</span>
                                    </div>
                                    {r.admissionNumber && (
                                        <div className="flex justify-between text-xs pt-1 border-t border-gray-100 mt-1">
                                            <span className="text-gray-500">ERP No:</span>
                                            <span className="font-mono font-bold text-gray-900">{r.admissionNumber}</span>
                                        </div>
                                    )}
                                    {r.selectedFeeType && (
                                        <div className="flex justify-between text-xs pt-1 border-t border-gray-100 mt-1">
                                            <span className="text-gray-500">Applied Plan:</span>
                                            <span className="font-bold text-red-600">{r.selectedFeeType} Structure</span>
                                        </div>
                                    )}
                                    {r.annualFee !== null && r.annualFee !== undefined && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Confirmed Fee:</span>
                                            <span className="font-black text-gray-900">₹{r.annualFee.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 4: Quick Actions */}
                            <div className="space-y-3 border-l border-gray-100 pl-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    Actions
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditMode('referral')
                                                setEditingLead({ ...r }) // Copy data
                                            }}
                                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Pencil size={12} /> Edit Lead
                                        </button>
                                    )}
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditMode('office')
                                                setEditingLead({ ...r }) // Copy data
                                            }}
                                            className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border border-amber-200"
                                        >
                                            <Shield size={12} /> Office Use
                                        </button>
                                    )}
                                    {!isReadOnly && r.leadStatus !== 'Confirmed' && confirmReferral && (
                                        <>
                                            {confirmingId === r.leadId ? (
                                                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Step 1: ERP Number</label>
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Enter Admission/ERP No..."
                                                            suppressHydrationWarning={true}
                                                            value={erpInput}
                                                            onChange={(e) => setErpInput(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Step 2: Annual Fee Plan</label>
                                                        <div className="relative group">
                                                            <select
                                                                value={selectedFeeType}
                                                                onChange={(e) => setSelectedFeeType(e.target.value as 'OTP' | 'WOTP')}
                                                                className="w-full px-3 py-2.5 text-xs font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50 text-gray-700 cursor-pointer appearance-none transition-all hover:bg-gray-100"
                                                                suppressHydrationWarning={true}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <option value="OTP">OTP - Standard Direct Payment</option>
                                                                <option value="WOTP">WOTP - Flexible Installment Plan</option>
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
                                                                <ChevronDown size={14} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 pt-2 border-t border-gray-50">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (!erpInput.trim()) return toast.error('ERP Number is required')
                                                                confirmReferral?.(r.leadId, erpInput, selectedFeeType).then(res => {
                                                                    if (res.success) {
                                                                        toast.success('Admission Confirmed!')
                                                                        setConfirmingId(null)
                                                                        setErpInput('')
                                                                        router.refresh()
                                                                    } else toast.error(res.error)
                                                                })
                                                            }}
                                                            className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-bold shadow-md shadow-green-500/20 active:scale-95 transition-all"
                                                        >
                                                            Complete Confirmation
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setConfirmingId(null)
                                                                setErpInput('')
                                                            }}
                                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setConfirmingId(r.leadId)
                                                        setErpInput('')
                                                    }}
                                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:translate-x-1"
                                                >
                                                    Confirm Admission
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {!isReadOnly && r.leadStatus !== 'Confirmed' && rejectReferral && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm('Reject this referral? This cannot be undone.')) {
                                                    rejectReferral(r.leadId).then((res: { success: boolean; error?: string }) => {
                                                        if (res.success) {
                                                            toast.success('Referral rejected')
                                                            router.refresh()
                                                        } else toast.error(res.error)
                                                    })
                                                }
                                            }}
                                            className="w-full py-2 bg-white border border-gray-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                                        >
                                            Reject Referral
                                        </button>
                                    )}
                                    {!isReadOnly && r.leadStatus === 'Confirmed' && !r.student && convertLeadToStudent && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm('Add to Student Database?')) {
                                                    convertLeadToStudent(r.leadId, { studentName: r.parentName + "'s Child" }).then(res => {
                                                        if (res.success) {
                                                            toast.success('Added to Students!')
                                                            router.refresh()
                                                        } else toast.error(res.error)
                                                    })
                                                }
                                            }}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:translate-x-1"
                                        >
                                            Add to Students
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            />



            {/* Floating Batch Actions */}
            {
                selectedIds.length > 0 && !isReadOnly && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
                        <div className="bg-[#0f172a] text-white p-2 pl-6 pr-2 rounded-full shadow-2xl flex items-center gap-4 border border-gray-800 ring-4 ring-black/5">
                            <div className="font-bold text-sm">
                                <span className="text-red-400">{selectedIds.length}</span> Selected
                            </div>
                            <div className="h-4 w-px bg-gray-700" />
                            <div className="flex items-center gap-2">
                                <select
                                    value={bulkFeeType}
                                    onChange={(e) => setBulkFeeType(e.target.value as any)}
                                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs font-bold text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                                    suppressHydrationWarning={true}
                                >
                                    <option value="None">Select Plan...</option>
                                    <option value="OTP">OTP</option>
                                    <option value="WOTP">WOTP</option>
                                </select>
                                <button
                                    onClick={handleBulkConfirm}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold transition-colors"
                                    suppressHydrationWarning={true}
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={handleBulkAddToStudent}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors"
                                    suppressHydrationWarning={true}
                                >
                                    Add to Students
                                </button>
                                <button
                                    onClick={handleBulkReject}
                                    className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                                    title="Reject"
                                    suppressHydrationWarning={true}
                                >
                                    <XCircle size={18} />
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                                    title="Delete"
                                    suppressHydrationWarning={true}
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                            <button onClick={() => setSelectedIds([])} className="ml-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )
            }


            {/* Edit Modal */}
            {/* Edit Modal */}
            {editingLead && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">{editMode === 'referral' ? 'Edit Lead Details' : 'Office Use (Admin)'}</h3>
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

                                        // New Fields
                                        admissionNumber: editingLead.admissionNumber || undefined,
                                        section: editingLead.section || undefined,
                                        leadStatus: editingLead.leadStatus,
                                        selectedFeeType: editingLead.selectedFeeType,
                                        annualFee: editingLead.annualFee
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
                            className="p-6 space-y-4"
                        >
                            <div className="space-y-4">
                                {editMode === 'referral' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Parent Name (Lead)</label>
                                            <input
                                                type="text"
                                                value={editingLead.parentName}
                                                onChange={e => setEditingLead({ ...editingLead, parentName: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Student Name</label>
                                            <input
                                                type="text"
                                                value={editingLead.studentName || ''}
                                                onChange={e => setEditingLead({ ...editingLead, studentName: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="Student Name..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mobile</label>
                                                <input
                                                    type="text"
                                                    value={editingLead.parentMobile}
                                                    onChange={e => setEditingLead({ ...editingLead, parentMobile: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Grade</label>
                                                <select
                                                    value={editingLead.gradeInterested || ''}
                                                    onChange={e => handleLeadUpdate({ gradeInterested: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
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
                                                            <option key={g} value={g}>{g}</option>
                                                        ))
                                                    })()}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Campus</label>
                                            <select
                                                value={editingLead.campus || ''}
                                                onChange={e => handleLeadUpdate({ campus: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"
                                                suppressHydrationWarning={true}
                                            >
                                                <option value="">Select Campus...</option>
                                                {(campuses || []).map((c: any) => (
                                                    <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Academic Year</label>
                                            <select
                                                value={editingLead.admittedYear || '2026-2027'}
                                                onChange={e => handleLeadUpdate({ admittedYear: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"
                                                suppressHydrationWarning={true}
                                            >
                                                <option value="2026-2027">2026-2027</option>
                                                <option value="2025-2026">2025-2026</option>
                                                <option value="2024-2025">2024-2025</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {editMode === 'office' && (
                                    <div className="space-y-4 border-l pl-4 border-gray-100">
                                        <div className="bg-amber-50 rounded-lg p-3 space-y-3 border border-amber-100">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-200/50">
                                                <Shield size={14} className="text-amber-600" />
                                                <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Office Use</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Admission No</label>
                                                    <input
                                                        type="text"
                                                        value={editingLead.admissionNumber || ''}
                                                        onChange={e => setEditingLead({ ...editingLead, admissionNumber: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                                        placeholder="ERP-123"
                                                        suppressHydrationWarning={true}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Status</label>
                                                    <select
                                                        value={editingLead.leadStatus}
                                                        onChange={e => setEditingLead({ ...editingLead, leadStatus: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs font-bold bg-white"
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
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Fee Plan</label>
                                                    <select
                                                        value={editingLead.selectedFeeType || ''}
                                                        onChange={e => handleLeadUpdate({ selectedFeeType: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs font-bold bg-white"
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
                                                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-sm bg-white"
                                                        placeholder="A / B..."
                                                        suppressHydrationWarning={true}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Academic Year</label>
                                                    <select
                                                        value={editingLead.admittedYear || '2026-2027'}
                                                        onChange={e => handleLeadUpdate({ admittedYear: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs font-bold bg-white"
                                                        suppressHydrationWarning={true}
                                                    >
                                                        <option value="2026-2027">2026-2027</option>
                                                        <option value="2025-2026">2025-2026</option>
                                                        <option value="2024-2025">2024-2025</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-amber-800/60 uppercase mb-1 block">Annual Fee</label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={editingLead.annualFee || ''}
                                                        onChange={e => setEditingLead({ ...editingLead, annualFee: e.target.value ? Number(e.target.value) : null })}
                                                        className="w-full pl-6 pr-2 py-1.5 border border-amber-200 rounded text-sm bg-white font-mono font-bold"
                                                        placeholder="60000"
                                                        suppressHydrationWarning={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3 border-t mt-4">
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
                    </div >
                </div >
            )
            }
        </div >
    )
}
