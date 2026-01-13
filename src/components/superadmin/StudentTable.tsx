import { Search, UserPlus, Filter, Download, MoreHorizontal, Edit, Trash, ChevronRight, Phone, CreditCard, Calendar, User, Building, GraduationCap, Percent, Hash, Trash2, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Student } from '@/types'
import { exportToCSV } from '@/lib/export-utils'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { bulkStudentAction } from '@/app/bulk-student-actions'

interface StudentTableProps {
    students: Student[]
    searchTerm: string
    onSearchChange: (value: string) => void
    onAddStudent: () => void
    onBulkAdd: () => void
    onEdit: (student: Student) => void
    onViewAmbassador: (referralCode: string) => void
    campuses?: any[]
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function StudentTable({
    students,
    searchTerm,
    onSearchChange,
    onAddStudent,
    onBulkAdd,
    onEdit,
    onViewAmbassador,
    campuses = []
}: StudentTableProps) {
    const router = useRouter()
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [targetCampusId, setTargetCampusId] = useState<number | null>(null)
    const [deleteId, setDeleteId] = useState<number | null>(null)

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
    const columns = [
        {
            header: 'Student Detail',
            accessorKey: 'fullName' as keyof Student,
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-red-200">
                        {(student.fullName || 'S').charAt(0)}
                    </div>
                    <div>
                        <p className="font-extrabold text-gray-900 text-[15px] uppercase tracking-tight">{student.fullName}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">ID: {student.studentId.toString().padStart(6, '0')}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Enrolled Academic',
            accessorKey: (s: Student) => s.campus?.campusName || 'N/A',
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-700 font-bold text-sm">
                        <Building size={14} className="text-gray-400" />
                        {student.campus?.campusName || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 font-medium text-xs">
                        <GraduationCap size={14} className="text-gray-400" />
                        Grade {student.grade}
                    </div>
                </div>
            )
        },
        {
            header: 'Parent/Guardian',
            accessorKey: (s: Student) => s.parent?.fullName || '',
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <div className="space-y-1">
                    <p className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" />
                        {student.parent?.fullName || 'N/A'}
                    </p>
                    <p className="text-xs text-blue-600 font-black flex items-center gap-1.5">
                        <Phone size={12} className="text-blue-400" />
                        {student.parent?.mobileNumber || 'No Contact'}
                    </p>
                </div>
            )
        },
        {
            header: 'Ambassador',
            accessorKey: (s: Student) => s.ambassador?.fullName || '',
            sortable: true,
            filterable: true,
            cell: (student: Student) => student.ambassador ? (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                        <p className="text-sm font-black text-red-600 uppercase tracking-tight">{student.ambassador.fullName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            {student.ambassador.referralCode}
                        </span>
                    </div>
                </div>
            ) : (
                <span className="text-xs font-bold text-gray-400 italic">Direct Admission</span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status' as keyof Student,
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <Badge variant={student.status === 'Active' ? 'success' : 'error'} className="font-black text-[10px] tracking-wider uppercase">
                    {student.status}
                </Badge>
            )
        },
        {
            header: 'Actions',
            accessorKey: (student: Student) => student.studentId,
            cell: (student: Student) => (
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onEdit(student)}
                        className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all shadow-sm bg-white hover:scale-110"
                    >
                        <Edit size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setDeleteId(student.studentId)}
                        className="p-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm bg-white hover:scale-110"
                    >
                        <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                </div>
            )
        }
    ]

    const renderExpandedRow = (student: Student) => (
        <div className="p-8 bg-gradient-to-br from-gray-50 to-white border-x border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} className="text-red-500" />
                        Registration Date
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        {new Date(student.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={12} className="text-emerald-500" />
                        Fee Structure
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                        ₹{student.baseFee.toLocaleString()} <span className="text-[10px] text-gray-400">/ YEAR</span>
                    </p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Hash size={12} className="text-purple-500" />
                        Roll Number / Section
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        {student.section || 'N/A'} - {student.rollNumber || 'N/A'}
                    </p>
                </div>
            </div>

            {student.ambassador && (
                <div className="mt-8 p-6 bg-red-50/50 rounded-[24px] border border-red-100 border-dashed">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
                                <GraduationCap size={20} className="text-white" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Referral Source Details</h4>
                                <p className="text-sm font-black text-gray-900">{student.ambassador.fullName} ({student.ambassador.role})</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                                <Phone size={14} /> {student.ambassador.mobileNumber}
                            </button>
                            <button
                                onClick={() => student.ambassador?.referralCode && onViewAmbassador(student.ambassador.referralCode)}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest"
                            >
                                View Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    const filteredStudents = students.filter(s =>
        (s.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (s.parent?.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (s.parent?.mobileNumber || '').includes(searchTerm || '')
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-white to-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            Student Enrollment
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                Directory
                            </span>
                        </h3>
                        <p className="text-sm font-medium text-gray-400 mt-1">Directory of all admitted students and referral mapping.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-600/5 focus:border-emerald-600 transition-all text-sm font-bold shadow-sm"
                                suppressHydrationWarning
                            />
                        </div>
                        <button
                            onClick={() => {
                                const headers = ['Full Name', 'Parent Name', 'Parent Mobile', 'Campus Name', 'Grade', 'Section', 'Roll Number', 'Student ERP No', 'Ambassador Mobile', 'Ambassador Name', 'AY']
                                const csvContent = headers.join(',') + '\n' + 'John Doe,Jane Doe,9876543210,Main Campus,Grade 10,A,24AG123,ERP001,9876543211,Jane Amb,2024-25'
                                const blob = new Blob([csvContent], { type: 'text/csv' })
                                const url = window.URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.setAttribute('download', 'student_template.csv')
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                            }}
                            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Filter size={16} /> Template
                        </button>
                        <button
                            onClick={onBulkAdd}
                            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Download size={16} /> Import
                        </button>
                        <button
                            onClick={() => exportToCSV(filteredStudents, 'Student_List', [
                                { header: 'Full Name', accessor: (s) => s.fullName },
                                { header: 'Campus', accessor: (s) => s.campus?.campusName },
                                { header: 'Grade', accessor: (s) => s.grade },
                                { header: 'Parent', accessor: (s) => s.parent?.fullName },
                                { header: 'Mobile', accessor: (s) => s.parent?.mobileNumber },
                                { header: 'Status', accessor: (s) => s.status }
                            ])}
                            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Download size={16} /> Export
                        </button>
                        <button
                            onClick={onAddStudent}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <UserPlus size={16} strokeWidth={2.5} />
                            New Student
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedStudents.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 border border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                <GraduationCap size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-bold">{selectedStudents.length} Selected</span>
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
                                onClick={() => setShowTransferModal(true)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider text-blue-400 transition-colors flex items-center gap-2"
                            >
                                <ArrowRight size={14} /> Transfer
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
                            onClick={() => setSelectedStudents([])}
                            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <XCircle size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-black text-gray-900 mb-6">Transfer Students</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Transfer {selectedStudents.length} selected students to a new campus.
                        </p>
                        <select
                            value={targetCampusId || ''}
                            onChange={(e) => setTargetCampusId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6"
                        >
                            <option value="">Select Target Campus</option>
                            {campuses.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.campusName}</option>
                            ))}
                        </select>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowTransferModal(false)
                                    setTargetCampusId(null)
                                }}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={!targetCampusId || isProcessing}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isProcessing ? 'Transferring...' : 'Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full xl:max-w-[calc(100vw-340px)] mx-auto overflow-hidden">
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                    <DataTable
                        data={filteredStudents}
                        columns={columns as any}
                        pageSize={10}
                        renderExpandedRow={renderExpandedRow}
                        enableMultiSelection={true}
                        onSelectionChange={(selected) => setSelectedStudents(selected)}
                        uniqueKey="studentId"
                    />
                </div>
            </div>
            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={bulkConfirmation.isOpen}
                title={`Confirm Bulk ${bulkConfirmation.action === 'delete' ? 'Deletion' : 'Update'}`}
                description={
                    bulkConfirmation.action === 'delete' ? (
                        <p className="text-red-600 font-medium">
                            DANGER: You are about to PERMANENTLY DELETE <strong>{selectedStudents.length}</strong> students.
                            <br />This action CANNOT be undone. Are you absolutely sure?
                        </p>
                    ) : (
                        <p>
                            Are you sure you want to <strong>{bulkConfirmation.action}</strong> {selectedStudents.length} selected students?
                        </p>
                    )
                }
                confirmText={`Yes, ${bulkConfirmation.action} All`}
                variant={bulkConfirmation.action === 'delete' ? 'danger' : 'warning'}
                onConfirm={executeBulkAction}
                onCancel={() => setBulkConfirmation({ isOpen: false, action: null })}
                isLoading={isProcessing}
            />

            {/* Single Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="Delete Student?"
                description={
                    <p className="text-red-600 font-medium">
                        Are you sure you want to PERMANENTLY DELETE this student?
                        <br />This action cannot be undone.
                    </p>
                }
                confirmText="Delete Student"
                variant="danger"
                onConfirm={executeSingleDelete}
                onCancel={() => setDeleteId(null)}
                isLoading={isProcessing}
            />
        </div>
    )
}
