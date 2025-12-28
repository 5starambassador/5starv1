import { Search, UserPlus, Filter, Download, MoreHorizontal, Edit, Trash, ChevronRight } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'

interface Student {
    studentId: number
    fullName: string
    parent?: { fullName: string; mobileNumber: string }
    campus?: { campusName: string }
    grade: string
    status: string
    ambassador?: {
        fullName: string
        mobileNumber: string
        role?: string
        referralCode?: string
    }
}

interface StudentTableProps {
    students: Student[]
    searchTerm: string
    onSearchChange: (value: string) => void
    onAddStudent: () => void
    onBulkAdd: () => void
    onEdit: (student: any) => void
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #CC0000, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '16px' }}>
                        {(student.fullName || 'S').charAt(0)}
                    </div>
                    <div>
                        <p style={{ fontWeight: '800', color: '#111827', margin: 0, fontSize: '15px' }}>{student.fullName}</p>
                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, fontWeight: '700' }}>ACH-ST-{student.studentId}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Campus',
            accessorKey: (s: Student) => s.campus?.campusName || 'N/A',
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: 0 }}>{student.campus?.campusName || 'N/A'}</p>
            )
        },
        {
            header: 'Grade',
            accessorKey: 'grade' as keyof Student,
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, fontWeight: '500' }}>{student.grade}</p>
            )
        },
        {
            header: 'Parent Contact',
            accessorKey: (s: Student) => s.parent?.fullName || '',
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: 0 }}>{student.parent?.fullName || 'N/A'}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, fontWeight: '500' }}>{student.parent?.mobileNumber || 'No Contact'}</p>
                </div>
            )
        },
        {
            header: 'Ambassador',
            accessorKey: (s: Student) => s.ambassador?.fullName || '',
            sortable: true,
            filterable: true,
            cell: (student: Student) => student.ambassador ? (
                <div className="flex flex-col gap-0.5">
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#CC0000', margin: 0 }}>{student.ambassador.fullName}</p>
                    <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF' }}>{student.ambassador.referralCode}</span>
                        <span style={{ height: '3px', width: '3px', background: '#D1D5DB', borderRadius: '50%' }} />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#D1D5DB', textTransform: 'uppercase' }}>{student.ambassador.role}</span>
                    </div>
                </div>
            ) : (
                <span style={{ fontSize: '12px', color: '#D1D5DB', fontStyle: 'italic', fontWeight: '500' }}>Direct Admission</span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status' as keyof Student,
            sortable: true,
            filterable: true,
            cell: (student: Student) => (
                <span style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', background: student.status === 'Active' ? '#ECFDF5' : '#FEF2F2', color: student.status === 'Active' ? '#059669' : '#DC2626' }}>
                    {student.status}
                </span>
            )
        },
        {
            header: 'Actions',
            accessorKey: (s: Student) => s.studentId,
            cell: (student: Student) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        onClick={() => onEdit(student)}
                        className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-500 hover:text-red-600 hover:border-red-100 hover:shadow-lg transition-all"
                    >
                        <Edit size={16} />
                    </button>
                    <button className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all">
                        <Trash size={16} />
                    </button>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between flex-wrap gap-6 premium-border">
                <div style={{ position: 'relative', flex: 1, minWidth: '350px' }}>
                    {/* Search is handled by DataTable if we pass searchKey, but here we have external search prop. 
                       However, unified logic suggests letting DataTable handle it or syncing.
                       For now, since DataTable *has* its own search, we can use that if we want, OR we can hide DataTable's search and use this one.
                       Actually, the parent passes `searchTerm`. To avoid double search bars, let's keep this header and pass data to DataTable.
                       BUT DataTable filters `data` based on its own `searchTerm` state. 
                       If we want to use *this* external search, we should filter `students` before passing to DataTable, 
                       OR update DataTable to accept controlled `searchTerm`.
                       Given the previous `StudentTable` implementation, `searchTerm` comes from props.
                       Let's filter the data *before* passing to DataTable, and pass `searchKey={undefined}` to DataTable so it doesn't show its own search bar.
                   */}
                    {/* Wait, the implementation of filteredStudents was removed in previous step.
                       If DataTable handles filtering, it needs the term. 
                       DataTable currently has internal state for searchTerm. 
                       To keep "Excel-like filtering" + "External Global Search", I should pass the *filtered* data to DataTable. 
                       So I will restore `filteredStudents` logic and pass THAT to DataTable. 
                       Column filters will work on the *result* of the global search.
                   */}
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search system-wide students or parents..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all text-sm font-medium"
                        suppressHydrationWarning
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onBulkAdd}
                        className="px-5 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 hover:shadow-lg transition-all flex items-center gap-2"
                        suppressHydrationWarning
                    >
                        <Download size={18} /> Bulk Import
                    </button>
                    <button
                        onClick={onAddStudent}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#CC0000] to-[#EF4444] text-white border-none font-bold text-sm shadow-xl shadow-red-600/20 hover:shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                        suppressHydrationWarning
                    >
                        <UserPlus size={20} /> Add Student
                    </button>
                </div>
            </div>

            <DataTable
                data={students.filter(s =>
                    (s.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                    (s.parent?.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                    (s.parent?.mobileNumber || '').includes(searchTerm || '')
                )}
                columns={columns}
                pageSize={10}
            />
        </div>
    )
}
