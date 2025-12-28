'use client'

import React, { useState } from 'react'
import { Download, ChevronDown, ChevronUp, Edit3, X, Save, User as UserIcon, GraduationCap, CreditCard, Activity } from 'lucide-react'
import { generatePDFReport } from '@/lib/pdf-export'
import { toast } from 'sonner'
import { updateStudent } from '@/app/student-actions'

interface CampusStudentsClientProps {
    students: any[]
    query: string
}

export function CampusStudentsClient({ students: initialStudents, query }: CampusStudentsClientProps) {
    const [students, setStudents] = useState(initialStudents)
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [editForm, setEditForm] = useState<any>(null)

    const handleExportPDF = () => {
        const columns = ['Student Name', 'Grade', 'Parent Name', 'Parent Mobile', 'Status']
        const data = students.map(student => [
            student.fullName,
            student.grade,
            student.parent?.fullName || 'N/A',
            student.parent?.mobileNumber || 'N/A',
            student.status
        ])

        generatePDFReport({
            title: 'Campus Students Report',
            subtitle: `Generated on ${new Date().toLocaleDateString()}`,
            columns,
            data,
            fileName: `campus_students_${Date.now()}`
        })
        toast.success('PDF exported successfully!')
    }

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id)
        setEditingId(null)
    }

    const startEditing = (student: any) => {
        setEditingId(student.studentId)
        setEditForm({
            fullName: student.fullName,
            grade: student.grade,
            section: student.section || '',
            rollNumber: student.rollNumber || '',
            status: student.status
        })
    }

    const handleSave = async (id: number) => {
        setIsSaving(true)
        try {
            const result = await updateStudent(id, editForm)
            if (result.success) {
                setStudents(prev => prev.map(s => s.studentId === id ? { ...s, ...editForm } : s))
                setEditingId(null)
                toast.success('Student updated successfully')
            } else {
                toast.error(result.error || 'Failed to update student')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Header with Search and Export */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2 w-72 focus-within:ring-2 focus-within:ring-primary-maroon/20 transition-all">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <form action="" className="flex-1 text-sm">
                        <input
                            name="q"
                            type="text"
                            placeholder="Search by name or roll no..."
                            defaultValue={query}
                            className="bg-transparent outline-none w-full"
                        />
                    </form>
                </div>
                <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-maroon text-white rounded-xl text-sm font-semibold hover:bg-primary-maroon/90 shadow-lg shadow-primary-maroon/20 transition-all active:scale-95"
                >
                    <Download size={16} />
                    Export PDF
                </button>
            </div>

            <div className="flex items-center justify-between px-2">
                <p className="text-sm font-medium text-gray-500">
                    Showing <span className="text-gray-900">{students.length}</span> students
                </p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Data</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="py-5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student info</th>
                                <th className="py-5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Grade / Section</th>
                                <th className="py-5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Parent Details</th>
                                <th className="py-5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                                <th className="py-5 px-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.length > 0 ? (
                                students.map((student: any) => (
                                    <React.Fragment key={student.studentId}>
                                        <tr
                                            onClick={() => toggleExpand(student.studentId)}
                                            className={`group cursor-pointer transition-all hover:bg-primary-gold/5 ${expandedId === student.studentId ? 'bg-primary-gold/5' : ''}`}
                                        >
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-maroon/10 to-primary-gold/10 flex items-center justify-center text-primary-maroon group-hover:scale-110 transition-transform flex-shrink-0">
                                                        <UserIcon size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 truncate">{student.fullName}</p>
                                                        <p className="text-xs text-gray-400 truncate">ID: {student.rollNumber || '---'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 hidden md:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-700">{student.grade}</span>
                                                    <span className="text-xs text-gray-400">Sec: {student.section || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 hidden sm:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{student.parent?.fullName}</span>
                                                    <span className="text-xs text-primary-maroon">{student.parent?.mobileNumber}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 hidden lg:table-cell">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${student.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                    student.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="text-gray-300 group-hover:text-primary-maroon transition-colors">
                                                    {expandedId === student.studentId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        {expandedId === student.studentId && (
                                            <tr>
                                                <td colSpan={5} className="p-0 border-t-0">
                                                    <div className="bg-gray-50/50 p-8 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">

                                                            {/* Left: General Info */}
                                                            <div className="md:col-span-8 space-y-6">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                                        <div className="flex items-center gap-2 mb-2 text-primary-maroon">
                                                                            <GraduationCap size={16} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Academic Details</span>
                                                                        </div>
                                                                        {editingId === student.studentId ? (
                                                                            <div className="space-y-3 mt-4">
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Roll Number</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="w-full bg-gray-50 border-0 rounded-lg p-2 text-sm mt-1"
                                                                                        value={editForm.rollNumber}
                                                                                        onChange={e => setEditForm({ ...editForm, rollNumber: e.target.value })}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Section</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="w-full bg-gray-50 border-0 rounded-lg p-2 text-sm mt-1"
                                                                                        value={editForm.section}
                                                                                        onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-1 mt-2">
                                                                                <p className="text-lg font-bold text-gray-900">{student.grade} - {student.section || 'No Sec'}</p>
                                                                                <p className="text-sm text-gray-500">Enrollment ID: <span className="font-mono">{student.rollNumber || 'Not set'}</span></p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                                        <div className="flex items-center gap-2 mb-2 text-primary-gold">
                                                                            <Activity size={16} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status Management</span>
                                                                        </div>
                                                                        {editingId === student.studentId ? (
                                                                            <div className="mt-4">
                                                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Current Status</label>
                                                                                <select
                                                                                    className="w-full bg-gray-50 border-0 rounded-lg p-2 text-sm mt-1"
                                                                                    value={editForm.status}
                                                                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                                                >
                                                                                    <option value="Active">Active</option>
                                                                                    <option value="Inactive">Inactive</option>
                                                                                    <option value="Alumni">Alumni</option>
                                                                                </select>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="mt-2">
                                                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${student.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                                    {student.status}
                                                                                </span>
                                                                                <p className="text-xs text-gray-400 mt-2">Joined: {new Date(student.createdAt).toLocaleDateString()}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Fee Structure Display */}
                                                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <div className="flex items-center gap-2 text-gray-900">
                                                                            <CreditCard size={18} />
                                                                            <h4 className="font-bold">Fee Breakdown</h4>
                                                                        </div>
                                                                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">2025-26 Academic Year</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-6">
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Annual Base Fee</p>
                                                                            <p className="text-xl font-bold text-gray-900">₹{student.baseFee?.toLocaleString()}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Scholarship/Discount</p>
                                                                            <p className="text-xl font-bold text-green-600">{student.discountPercent}% OFF</p>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <div className="absolute -inset-2 bg-primary-gold/10 rounded-xl blur-lg animate-pulse"></div>
                                                                            <div className="relative">
                                                                                <p className="text-[10px] font-bold text-primary-gold uppercase">Final Payable</p>
                                                                                <p className="text-xl font-bold text-primary-gold">₹{(student.baseFee * (1 - student.discountPercent / 100)).toLocaleString()}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right: Actions */}
                                                            <div className="md:col-span-4 flex flex-col gap-3">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); editingId === student.studentId ? handleSave(student.studentId) : startEditing(student) }}
                                                                    disabled={isSaving}
                                                                    className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold transition-all ${editingId === student.studentId
                                                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'
                                                                        : 'bg-primary-gold text-white hover:bg-primary-gold/90 shadow-lg shadow-primary-gold/20'
                                                                        }`}
                                                                >
                                                                    {isSaving ? (
                                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : editingId === student.studentId ? (
                                                                        <><Save size={18} /> Save Changes</>
                                                                    ) : (
                                                                        <><Edit3 size={18} /> Edit Profile</>
                                                                    )}
                                                                </button>
                                                                {editingId === student.studentId ? (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                                                                        className="flex items-center justify-center gap-2 w-full py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                                                                    >
                                                                        <X size={18} /> Cancel
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/91${student.parent?.mobileNumber}`, '_blank') }}
                                                                        className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366]/10 text-[#25D366] rounded-2xl font-bold hover:bg-[#25D366]/20 transition-all"
                                                                    >
                                                                        Contact Parent
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                <UserIcon size={32} />
                                            </div>
                                            <p className="text-gray-500 font-medium">No students found matching "{query}"</p>
                                            <button onClick={() => window.location.href = '/campus/students'} className="text-primary-maroon font-bold text-sm">Clear Search</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
