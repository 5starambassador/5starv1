import { useState, useMemo, useEffect } from 'react'
import {
    Search, UserPlus, Filter, Download, Edit, Trash2,
    CheckCircle, XCircle, ArrowRight, Building, GraduationCap,
    User, Phone, Calendar, CreditCard, Hash, Copy, Eye,
    RefreshCcw, Layout, MoreHorizontal, FileSpreadsheet, FileText
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
import { Student } from '@/types'
import { AcademicYearFilter } from '@/components/AcademicYearFilter'
import { StudentSourceFilter } from '@/components/StudentSourceFilter'
import { exportToCSV } from '@/lib/export-utils'
import { bulkStudentAction } from '@/app/bulk-student-actions'

interface StudentTableProps {
    students: Student[]
    searchTerm: string // Kept for prop compatibility/initial state
    onSearchChange: (value: string) => void // Kept for prop compatibility
    onAddStudent: () => void
    onBulkAdd: () => void
    onEdit: (student: Student) => void
    onViewAmbassador: (referralCode: string) => void
    onRowClick?: (student: Student) => void
    campuses?: any[]
    onBackfillFees?: () => void
    isBackfilling?: boolean
    onGenerateReport?: () => void
}

export function StudentTable({
    students: initialStudents,
    searchTerm: initialSearch,
    onSearchChange,
    onAddStudent,
    onBulkAdd,
    onEdit,
    onViewAmbassador,
    onRowClick,
    campuses = [],
    onBackfillFees,
    isBackfilling = false,
    onGenerateReport
}: StudentTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // --- State ---
    const [searchTerm, setSearchTerm] = useState(initialSearch || '')
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [targetCampusId, setTargetCampusId] = useState<number | null>(null)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [showColumnMenu, setShowColumnMenu] = useState(false)
    const [liveMode, setLiveMode] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    // Filters
    const [filters, setFilters] = useState({
        campus: [] as string[],
        grade: [] as string[],
        status: [] as string[],
        feeType: [] as string[]
    })

    const [activeFilter, setActiveFilter] = useState<string | null>(null)

    // Column Visibility
    const [visibleColumns, setVisibleColumns] = useState({
        details: true,
        campus: true,
        grade: true,
        guardian: true,
        ambassador: true,
        fee: true,
        status: true,
        stats: true
    })

    // Bulk Confirmation State
    const [bulkConfirmation, setBulkConfirmation] = useState<{ isOpen: boolean, action: 'activate' | 'suspend' | 'delete' | null }>({
        isOpen: false,
        action: null
    })

    // --- Derived Data ---

    // Filter Logic
    const filteredStudents = useMemo(() => {
        return initialStudents.filter(s => {
            // Search
            const searchLower = searchTerm.toLowerCase()
            const matchesSearch =
                !searchLower ||
                (s.fullName || '').toLowerCase().includes(searchLower) ||
                (s.parent?.mobileNumber || '').includes(searchLower) ||
                (s.admissionNumber || '').toLowerCase().includes(searchLower) ||
                (s.rollNumber || '').toLowerCase().includes(searchLower)

            if (!matchesSearch) return false

            // Filters
            if (filters.campus.length > 0 && !filters.campus.includes(s.campus?.campusName || 'N/A')) return false
            if (filters.grade.length > 0 && !filters.grade.includes(s.grade || 'N/A')) return false
            if (filters.status.length > 0 && !filters.status.includes(s.status || 'Active')) return false
            if (filters.feeType.length > 0) {
                const type = (s as any).selectedFeeType || 'WOTP'
                if (!filters.feeType.includes(type === 'OTP' ? 'One Time' : 'Installment')) return false
            }

            // Academic Year Filter
            const selectedYear = searchParams.get('year')
            if (selectedYear && selectedYear !== 'All' && s.academicYear !== selectedYear) return false

            // Student Source Filter
            const selectedSource = searchParams.get('source') || 'referral'
            if (selectedSource === 'referral' && !s.ambassador) return false
            if (selectedSource === 'organic' && s.ambassador) return false

            return true
        })
    }, [initialStudents, searchTerm, filters, searchParams])

    // Stats Logic
    const stats = useMemo(() => {
        const total = initialStudents.length
        const active = initialStudents.filter(s => s.status === 'Active').length
        const inactive = initialStudents.filter(s => s.status !== 'Active').length
        // Simulated "Graduated" or other stat if needed, for now just Fee Collection Rate?
        const otpCount = initialStudents.filter(s => (s as any).selectedFeeType === 'OTP').length
        return { total, active, inactive, otpCount }
    }, [initialStudents])

    // Filter Options Generation
    const filterOptions = useMemo(() => ({
        campus: Array.from(new Set(initialStudents.map(s => s.campus?.campusName || 'N/A'))).sort(),
        grade: Array.from(new Set(initialStudents.map(s => s.grade || 'N/A'))).sort(),
        status: ['Active', 'Suspended', 'Inactive', 'Deleted'],
        feeType: ['One Time', 'Installment']
    }), [initialStudents])

    // --- Actions ---

    // Polling for Live Mode
    useEffect(() => {
        if (!liveMode || isExporting) return // Pause polling while exporting to prevent refresh collision
        const interval = setInterval(() => {
            router.refresh()
            toast.success('Synced with database', { duration: 1000, icon: <RefreshCcw size={12} /> })
        }, 15000)
        return () => clearInterval(interval)
    }, [liveMode, isExporting, router])

    const handleBulkAction = (action: 'activate' | 'suspend' | 'delete') => {
        setBulkConfirmation({ isOpen: true, action })
    }

    const executeBulkAction = async () => {
        const action = bulkConfirmation.action
        if (!action) return

        setIsProcessing(true)
        try {
            const res = await bulkStudentAction(selectedStudents.map(s => s.studentId), action)
            if (res.success) {
                toast.success(`Bulk ${action} successful: ${res.count} students affected`)
                setSelectedStudents([])
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

    const executeSingleDelete = async () => {
        if (!deleteId) return

        setIsProcessing(true)
        try {
            const res = await bulkStudentAction([deleteId], 'delete')
            if (res.success) {
                toast.success('Student deleted successfully')
                setDeleteId(null)
                router.refresh()
            } else {
                toast.error(res.error || 'Failed to delete student')
            }
        } catch (error) {
            toast.error('Connection error during deletion')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleTransfer = async () => {
        if (!targetCampusId) {
            toast.error('Please select a target campus')
            return
        }

        setIsProcessing(true)
        try {
            const res = await bulkStudentAction(selectedStudents.map(s => s.studentId), 'transfer', targetCampusId)
            if (res.success) {
                toast.success(`Successfully transferred ${res.count} students`)
                setSelectedStudents([])
                setShowTransferModal(false)
                setTargetCampusId(null)
                router.refresh()
            } else {
                toast.error(res.error || 'Transfer failed')
            }
        } catch (error) {
            toast.error('Connection error during transfer')
        } finally {
            setIsProcessing(false)
        }
    }

    // --- Columns Definition ---
    const columns = useMemo(() => {
        const cols: any[] = []

        if (visibleColumns.details) {
            cols.push({
                header: 'Student Profile',
                accessorKey: 'fullName',
                sortable: true,
                cell: (student: Student) => (
                    <div className="flex items-center gap-4 py-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-200">
                            {(student.fullName || 'S').charAt(0)}
                        </div>
                        <div>
                            <p className="font-extrabold text-gray-900 text-sm uppercase tracking-tight">{student.fullName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                    ID: {student.admissionNumber || student.studentId}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })
        }

        if (visibleColumns.campus) {
            cols.push({
                header: 'Campus',
                accessorKey: (s: Student) => s.campus?.campusName || 'N/A',
                sortable: true,
                filterable: true,
                cell: (student: Student) => (
                    <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                        {/* <Building size={12} className="text-gray-400" /> */}
                        {student.campus?.campusName || 'N/A'}
                    </div>
                )
            })
        }

        if (visibleColumns.grade) {
            cols.push({
                header: 'Grade & Section',
                accessorKey: 'grade',
                sortable: true,
                filterable: true,
                cell: (student: Student) => (
                    <div className="space-y-1">
                        <Badge variant="outline" className="font-bold text-[10px] bg-gray-50">
                            {student.grade}
                        </Badge>
                        {(student.section || student.rollNumber) && (
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                <Hash size={10} />
                                {student.section ? `Sec ${student.section}` : ''}
                                {student.section && student.rollNumber ? ' • ' : ''}
                                {student.rollNumber ? `Roll ${student.rollNumber}` : ''}
                            </p>
                        )}
                    </div>
                )
            })
        }

        if (visibleColumns.guardian) {
            cols.push({
                header: 'Guardian',
                accessorKey: (s: Student) => s.parent?.fullName || '',
                sortable: true,
                filterable: true,
                cell: (student: Student) => (
                    <div className="flex items-center gap-3">
                        <div className="space-y-1 flex-grow min-w-0">
                            <p className="font-bold text-gray-700 text-[11px] flex items-center gap-1.5 truncate" title={student.parent?.fullName || 'N/A'}>
                                {student.parent?.fullName || 'N/A'}
                            </p>
                            <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (student.parent?.mobileNumber) {
                                        navigator.clipboard.writeText(student.parent.mobileNumber)
                                        toast.success('Copied')
                                    }
                                }}
                            >
                                <Phone size={10} />
                                {student.parent?.mobileNumber || 'No Contact'}
                            </p>
                        </div>
                        {student.parent?.mobileNumber && (
                            <a 
                                href={`https://wa.me/${student.parent.mobileNumber}?text=${encodeURIComponent(`Hello! I'm from ACHARIYA Administration. I'm reaching out regarding your child *${student.fullName || 'your child'}*'s profile at ${student.campus || 'ACHARIYA'}. I'd love to help with any queries!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 active:scale-95 transition-all shrink-0 shadow-sm"
                                title="Nudge via WhatsApp"
                                aria-label={`Nudge ${student.fullName} via WhatsApp`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                        )}
                    </div>
                )
            })
        }

        if (visibleColumns.ambassador) {
            cols.push({
                header: 'Referral',
                accessorKey: (s: Student) => s.ambassador?.fullName || '',
                sortable: true,
                filterable: true,
                cell: (student: Student) => student.ambassador ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[120px]" title={student.ambassador.fullName}>
                                {student.ambassador.fullName}
                            </span>
                        </div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-3">
                            {student.ambassador.referralCode}
                        </span>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Organic</span>
                )
            })
        }

        if (visibleColumns.fee) {
            cols.push({
                header: 'Plan',
                accessorKey: (s: Student) => (s as any).selectedFeeType,
                sortable: true,
                filterable: true,
                cell: (student: Student) => {
                    const plan = (student as any).selectedFeeType || 'WOTP'
                    const annualFee = (student as any).annualFee ?? student.baseFee ?? 0
                    return (
                        <div className="space-y-1">
                            <Badge
                                variant={plan === 'OTP' ? 'purple' : 'warning'}
                                className={`font-black text-[9px] tracking-wider uppercase ${plan === 'OTP'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}
                            >
                                {plan}
                            </Badge>
                            <p className="text-[11px] font-black text-gray-900" suppressHydrationWarning>
                                {annualFee > 0 ? `₹${annualFee.toLocaleString()}` : 'N/A'}
                            </p>
                        </div>
                    )
                }
            })
        }

        if (visibleColumns.status) {
            cols.push({
                header: 'Status',
                accessorKey: 'status',
                sortable: true,
                filterable: true,
                cell: (student: Student) => (
                    <Badge variant={student.status === 'Active' ? 'success' : 'error'} className="font-black text-[10px] tracking-wider uppercase">
                        {student.status}
                    </Badge>
                )
            })
        }

        cols.push({
            header: 'Actions',
            accessorKey: 'studentId',
            cell: (student: Student) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onEdit(student)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Edit Student"
                        aria-label={`Edit ${student.fullName}`}
                        suppressHydrationWarning
                    >
                        <Edit size={14} />
                    </button>
                    <button
                        onClick={() => setDeleteId(student.studentId)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete Student"
                        aria-label={`Delete ${student.fullName}`}
                        suppressHydrationWarning
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => onRowClick && onRowClick(student)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="View Details"
                        aria-label={`View details for ${student.fullName}`}
                        suppressHydrationWarning
                    >
                        <Eye size={14} />
                    </button>
                </div>
            )
        })

        return cols
    }, [visibleColumns, onEdit, onRowClick])

    const renderExpandedRow = (student: Student) => (
        <div className="p-6 bg-gray-50/50 border-t border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
            <div className="space-y-4">
                <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Info</h4>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-medium">Admission Number</span>
                            <span className="font-bold text-gray-900">{student.admissionNumber || 'Not Assigned'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-medium">Academic Year</span>
                            <span className="font-bold text-gray-900">{student.academicYear || '2026-2027'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-medium">Roll Number</span>
                            <span className="font-bold text-gray-900">{student.rollNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Financial Status</h4>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-medium">Total Fee</span>
                            <span className="font-bold text-gray-900" suppressHydrationWarning>₹{(student.baseFee || (student as any).annualFee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-medium">Collected (Adm)</span>
                            <span className="font-bold text-emerald-600" suppressHydrationWarning>₹{(student.admissionFeeCollected || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-medium">Collected (Donation)</span>
                            <span className="font-bold text-emerald-600" suppressHydrationWarning>₹{(student.donationFeeCollected || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quick Actions</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => student.ambassador?.referralCode && onViewAmbassador(student.ambassador.referralCode)}
                            disabled={!student.ambassador}
                            className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            View Ambassador
                        </button>
                        <button
                            onClick={() => onEdit(student)}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            Full Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students', value: stats.total, color: 'indigo', icon: User },
                    { label: 'Active Students', value: stats.active, color: 'emerald', icon: CheckCircle },
                    { label: 'One-Time Plan', value: stats.otpCount, color: 'purple', icon: CreditCard },
                    { label: 'Inactive/Left', value: stats.inactive, color: 'red', icon: XCircle }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-2xl font-black text-gray-900 mt-1 group-hover:text-${stat.color}-600 transition-colors`}>{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                            <stat.icon size={20} className={`text-${stat.color}-600`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar - Redesigned for Clarity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row flex-wrap gap-4 items-start lg:items-center justify-between sticky top-4 z-30">

                {/* Left Zone: Discovery (Search + Filters) */}
                <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full lg:w-auto items-stretch md:items-center flex-grow lg:flex-grow-0">
                    {/* Search */}
                    <div className="relative flex-grow md:flex-grow-0 md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <label htmlFor="student-search" className="sr-only">Search Students</label>
                        <input
                            type="text"
                            id="student-search"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 h-10 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            aria-label="Search students by name, mobile, admission number or roll number"
                            suppressHydrationWarning
                        />
                    </div>

                    {/* Global View Filters (Grouped) */}
                    <div className="flex items-center gap-2 bg-gray-50/50 p-1 rounded-2xl border border-gray-100 shadow-sm">
                        <AcademicYearFilter />
                        <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                        <StudentSourceFilter />
                    </div>

                    {/* Data Filters Column-specific */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            {(() => {
                                const filterOptionsList = [
                                    { id: 'campus', label: 'Campus', icon: Building, count: filters.campus.length, options: filterOptions.campus },
                                    { id: 'grade', label: 'Grade', icon: GraduationCap, count: filters.grade.length, options: filterOptions.grade },
                                    { id: 'status', label: 'Status', icon: CheckCircle, count: filters.status.length, options: filterOptions.status },
                                ];
                                return filterOptionsList.map((filter) => (
                                    <div key={filter.id} className="relative">
                                        {(() => {
                                            const isActive = activeFilter === filter.id;
                                            const isSet = filter.count > 0;
                                            const activeClass = "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm";
                                            const inactiveClass = "bg-transparent border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700";
                                            
                                            return isActive ? (
                                                <button
                                                    onClick={() => setActiveFilter(null)}
                                                    className={`h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${isSet ? activeClass : inactiveClass}`}
                                                    aria-label={`Filter by ${filter.label}${isSet ? ` - ${filter.count} selected` : ''}`}
                                                    aria-expanded="true"
                                                    aria-haspopup="true"
                                                    suppressHydrationWarning
                                                >
                                                    <filter.icon size={12} className={isSet ? 'text-indigo-600' : 'text-gray-400'} />
                                                    {filter.label}
                                                    {isSet && (
                                                        <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full min-w-[1.25rem]">{filter.count}</span>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setActiveFilter(filter.id)}
                                                    className={`h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${isSet ? activeClass : inactiveClass}`}
                                                    aria-label={`Filter by ${filter.label}${isSet ? ` - ${filter.count} selected` : ''}`}
                                                    aria-expanded="false"
                                                    aria-haspopup="true"
                                                    suppressHydrationWarning
                                                >
                                                    <filter.icon size={12} className={isSet ? 'text-indigo-600' : 'text-gray-400'} />
                                                    {filter.label}
                                                    {isSet && (
                                                        <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full min-w-[1.25rem]">{filter.count}</span>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                        {activeFilter === filter.id && (
                                            <FilterDropdown
                                                label={filter.label}
                                                options={filter.options}
                                                activeValues={filters[filter.id as keyof typeof filters] as string[]}
                                                onApply={(vals) => setFilters(prev => ({ ...prev, [filter.id]: vals }))}
                                                onClose={() => setActiveFilter(null)}
                                            />
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* Right Zone: Actions */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">

                    {/* Utility Group (Compact) */}
                    {/* Main Actions Group */}
                    <div className="flex items-center gap-2">
                            {liveMode ? (
                                <button
                                    onClick={() => setLiveMode(false)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg transition-all bg-green-100 text-green-700"
                                    title="Live Mode: ON"
                                    aria-label="Disable live database syncing"
                                    aria-pressed="true"
                                    suppressHydrationWarning
                                >
                                    <RefreshCcw size={14} className="animate-spin" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setLiveMode(true)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-gray-400 hover:bg-white hover:text-gray-600"
                                    title="Live Mode: OFF"
                                    aria-label="Enable live database syncing"
                                    aria-pressed="false"
                                    suppressHydrationWarning
                                >
                                    <RefreshCcw size={14} />
                                </button>
                            )}

                            <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                            {showColumnMenu ? (
                                <button
                                    onClick={() => setShowColumnMenu(false)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg transition-all bg-white shadow-sm text-indigo-600"
                                    title="Manage Columns"
                                    aria-label="Close column visibility menu"
                                    aria-expanded="true"
                                    suppressHydrationWarning
                                >
                                    <Layout size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowColumnMenu(true)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-gray-400 hover:bg-white hover:text-gray-600"
                                    title="Manage Columns"
                                    aria-label="Open column visibility menu"
                                    aria-expanded="false"
                                    suppressHydrationWarning
                                >
                                    <Layout size={14} />
                                </button>
                            )}

                            {/* Column Menu Dropdown */}
                            {showColumnMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Columns</p>
                                    {Object.keys(visibleColumns).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }))}
                                            className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg mb-1 flex items-center justify-between ${visibleColumns[key as keyof typeof visibleColumns] ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <span className="uppercase">{key}</span>
                                            {visibleColumns[key as keyof typeof visibleColumns] && <CheckCircle size={12} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                            <button
                                onClick={async () => {
                                    setIsExporting(true)
                                    setTimeout(() => {
                                        try {
                                            exportToCSV(filteredStudents, 'Student_List', [
                                                { header: 'Full Name', accessor: (s) => s.fullName },
                                                { header: 'Admission No', accessor: (s) => s.admissionNumber },
                                                { header: 'Grade', accessor: (s) => s.grade },
                                                { header: 'Parent', accessor: (s) => s.parent?.fullName || '' },
                                                { header: 'Mobile', accessor: (s) => s.parent?.mobileNumber || '' },
                                                { header: 'Ambassador', accessor: (s) => s.ambassador?.fullName || '' },
                                                { header: 'Status', accessor: (s) => s.status },
                                                { header: 'Fee Plan', accessor: (s) => (s as any).selectedFeeType || 'WOTP' },
                                                { header: 'Annual Fee', accessor: (s) => (s.baseFee || (s as any).annualFee || 0).toString() }
                                            ])
                                            toast.success('Export completed')
                                        } finally {
                                            setIsExporting(false)
                                        }
                                    }, 100)
                                }}
                                disabled={isExporting}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${isExporting ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm'}`}
                                title="Download Results"
                                aria-label="Download student list as CSV"
                                suppressHydrationWarning
                            >
                                <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
                            </button>
                        </div>

                        {onBackfillFees && (
                            <button
                                onClick={onBackfillFees}
                                disabled={isBackfilling}
                                className={`h-10 px-4 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 ${isBackfilling
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                title="Backfill Fees"
                                aria-label="Backfill missing fee records"
                                suppressHydrationWarning
                            >
                                <CreditCard size={14} className={isBackfilling ? 'animate-pulse' : 'text-gray-400'} />
                                <span className="hidden sm:inline">Backfill</span>
                            </button>
                        )}

                        {onGenerateReport && (
                            <button
                                onClick={onGenerateReport}
                                className="h-10 px-4 bg-white border border-dashed border-purple-300 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-50 hover:border-purple-400 transition-all flex items-center gap-2 shadow-sm"
                                title="Generate Report"
                                aria-label="Generate student reports"
                                suppressHydrationWarning
                            >
                                <FileText size={14} />
                                <span className="hidden sm:inline">Report</span>
                            </button>
                        )}

                        <button
                            onClick={onAddStudent}
                            className="h-10 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            aria-label="Add new student record"
                            suppressHydrationWarning
                        >
                            <UserPlus size={16} />
                            <span>Add Student</span>
                        </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <DataTable
                    data={filteredStudents}
                    columns={columns}
                    pageSize={10}
                    enableMultiSelection={true}
                    onSelectionChange={setSelectedStudents}
                    uniqueKey="studentId"
                    renderExpandedRow={renderExpandedRow}
                    onRowClick={onRowClick}
                />
            </div>

            {/* Bulk Actions Fixed Bar */}
            {selectedStudents.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 border border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 bg-white/10 rounded font-black text-xs">{selectedStudents.length}</span>
                            <span className="text-xs font-bold text-gray-300">Selected</span>
                        </div>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleBulkAction('activate')} disabled={isProcessing} className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold text-emerald-400 transition-colors flex items-center gap-2" aria-label="Activate selected students">
                                <CheckCircle size={14} /> Activate
                            </button>
                            <button onClick={() => handleBulkAction('suspend')} disabled={isProcessing} className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold text-amber-400 transition-colors flex items-center gap-2" aria-label="Suspend selected students">
                                <XCircle size={14} /> Suspend
                            </button>
                            <button onClick={() => setShowTransferModal(true)} disabled={isProcessing} className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold text-indigo-400 transition-colors flex items-center gap-2" aria-label="Transfer selected students to another campus">
                                <ArrowRight size={14} /> Transfer
                            </button>
                            <button onClick={() => handleBulkAction('delete')} disabled={isProcessing} className="px-3 py-1.5 hover:bg-red-900/30 rounded-lg text-xs font-bold text-red-400 transition-colors flex items-center gap-2" aria-label="Delete selected students">
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                        <button onClick={() => setSelectedStudents([])} className="ml-2 hover:text-white text-gray-500" aria-label="Clear student selection">
                            <XCircle size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <ConfirmDialog
                isOpen={bulkConfirmation.isOpen}
                title={`Confirm Bulk ${bulkConfirmation.action === 'delete' ? 'Deletion' : 'Update'}`}
                description={<p>Are you sure you want to <strong>{bulkConfirmation.action}</strong> {selectedStudents.length} students?</p>}
                confirmText={`Yes, ${bulkConfirmation.action}`}
                variant={bulkConfirmation.action === 'delete' ? 'danger' : 'warning'}
                onConfirm={executeBulkAction}
                onCancel={() => setBulkConfirmation({ isOpen: false, action: null })}
                isLoading={isProcessing}
            />

            <ConfirmDialog
                isOpen={!!deleteId}
                title="Delete Student"
                description={<p className="text-red-500">This action cannot be undone. Are you sure?</p>}
                confirmText="Delete"
                variant="danger"
                onConfirm={executeSingleDelete}
                onCancel={() => setDeleteId(null)}
                isLoading={isProcessing}
            />

            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-gray-900 mb-6">Transfer Students</h3>
                        <p className="text-xs text-gray-500 mb-4">Select target campus for {selectedStudents.length} students.</p>
                        <label htmlFor="transfer-campus-select" className="sr-only">Target Campus</label>
                        <select
                            id="transfer-campus-select"
                            value={targetCampusId || ''}
                            onChange={(e) => setTargetCampusId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 text-sm font-bold"
                            aria-label="Select target campus for student transfer"
                        >
                            <option value="">Select Target Campus</option>
                            {campuses.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.campusName}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => setShowTransferModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                            <button onClick={handleTransfer} disabled={!targetCampusId} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">Transfer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
