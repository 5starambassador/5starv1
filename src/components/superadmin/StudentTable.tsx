import { Search, UserPlus, Filter, Download, MoreHorizontal, Edit, Trash, ChevronRight, Phone, CreditCard, Calendar, User, Building, GraduationCap, Percent, Hash, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Student } from '@/types'

interface StudentTableProps {
    students: Student[]
    searchTerm: string
    onSearchChange: (value: string) => void
    onAddStudent: () => void
    onBulkAdd: () => void
    onEdit: (student: Student) => void
}

export function StudentTable({
    students,
    searchTerm,
    onSearchChange,
    onAddStudent,
    onBulkAdd,
    onEdit
}: StudentTableProps) {
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
            )
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
                    <button className="p-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm bg-white hover:scale-110">
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
                        <Percent size={12} className="text-blue-500" />
                        Benefit Applied
                    </p>
                    <p className="text-sm font-black text-emerald-600">
                        {student.discountPercent}% Discount
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
                            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest">
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
            <div className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50 flex items-center justify-between flex-wrap gap-8 premium-border relative overflow-hidden">
                <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-50/50 rounded-bl-full -z-10 blur-3xl"></div>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-600 rounded-3xl shadow-lg shadow-emerald-200">
                        <GraduationCap size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Student Enrollment</h3>
                        <p className="text-sm font-medium text-gray-400 mt-1">Directory of all admitted students and referral mapping.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={onBulkAdd}
                        className="px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 uppercase tracking-widest"
                    >
                        <Download size={18} /> Import Roster
                    </button>
                    <button
                        onClick={onAddStudent}
                        className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-black text-xs shadow-2xl shadow-emerald-600/20 hover:shadow-emerald-600/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 uppercase tracking-widest border border-emerald-500"
                    >
                        <UserPlus size={18} /> New Student
                    </button>
                </div>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Global search by student name, parent name or mobile..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[24px] outline-none focus:ring-8 focus:ring-emerald-600/5 focus:border-emerald-600 transition-all text-sm font-bold shadow-sm"
                    suppressHydrationWarning
                />
            </div>

            <DataTable
                data={filteredStudents}
                columns={columns as any}
                pageSize={10}
                renderExpandedRow={renderExpandedRow}
            />
        </div>
    )
}
