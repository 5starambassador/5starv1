'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Student, User, Campus, BulkStudentData } from '@/types'
import { StudentTable } from '@/components/superadmin/StudentTable'
import CSVUploader from '@/components/CSVUploader'
import { addStudent, updateStudent, bulkAddStudents } from '@/app/student-actions'
import { getGradesForCampus } from '@/lib/grade-utils'

interface StudentPanelProps {
    students: Student[]
    users: User[]
    campuses: Campus[]
}

export function StudentPanel({ students, users, campuses }: StudentPanelProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [showStudentModal, setShowStudentModal] = useState(false)
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)

    const [studentForm, setStudentForm] = useState<any>({
        fullName: '',
        parentId: '',
        campusId: '',
        grade: '',
        section: '',
        rollNumber: '',
        baseFee: undefined,
        discountPercent: 0,
        isNewParent: false,
        newParentName: '',
        newParentMobile: ''
    })

    // Open Edit Student Modal
    const openEditModal = (student: Student) => {
        setEditingStudent(student)
        setStudentForm({
            fullName: student.fullName,
            parentId: student.parentId.toString(),
            campusId: student.campusId.toString(),
            grade: student.grade,
            section: student.section || '',
            rollNumber: student.rollNumber || '',
            baseFee: student.baseFee,
            discountPercent: student.discountPercent,
            isNewParent: false, // When editing, we assume parent is existing
            newParentName: '',
            newParentMobile: ''
        })
        setShowStudentModal(true)
    }

    // Add/Update Student Handler
    const handleSaveStudent = async () => {
        if (!studentForm.fullName || !studentForm.campusId || !studentForm.grade) {
            toast.error('Please fill in required fields (Name, Campus, Grade)')
            return
        }

        if (studentForm.isNewParent) {
            if (!studentForm.newParentName || !studentForm.newParentMobile) {
                toast.error('Please enter New Parent Name and Mobile Number')
                return
            }
            if (studentForm.newParentMobile.length !== 10) {
                toast.error('Parent Mobile Number must be 10 digits')
                return
            }
        } else if (!studentForm.parentId) {
            toast.error('Please select a Parent')
            return
        }

        setModalLoading(true)

        let result
        if (editingStudent) {
            result = await updateStudent(editingStudent.studentId, {
                fullName: studentForm.fullName,
                parentId: parseInt(studentForm.parentId),
                campusId: parseInt(studentForm.campusId),
                grade: studentForm.grade,
                section: studentForm.section,
                rollNumber: studentForm.rollNumber,
                baseFee: studentForm.baseFee,
                discountPercent: studentForm.discountPercent
            })
        } else {
            result = await addStudent({
                fullName: studentForm.fullName,
                parentId: studentForm.isNewParent ? 0 : parseInt(studentForm.parentId), // 0 or ignored if newParent provided
                campusId: parseInt(studentForm.campusId),
                grade: studentForm.grade,
                section: studentForm.section,
                rollNumber: studentForm.rollNumber,
                baseFee: studentForm.baseFee,
                discountPercent: studentForm.discountPercent,
                newParent: studentForm.isNewParent ? {
                    fullName: studentForm.newParentName,
                    mobileNumber: studentForm.newParentMobile
                } : undefined
            })
        }

        setModalLoading(false)
        if (result.success) {
            setShowStudentModal(false)
            setEditingStudent(null)
            setStudentForm({
                fullName: '', parentId: '', campusId: '', grade: '', section: '', rollNumber: '', baseFee: 60000, discountPercent: 0,
                isNewParent: false, newParentName: '', newParentMobile: ''
            })
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to save student')
        }
    }

    // Bulk Upload Handler
    const handleBulkUpload = async (data: BulkStudentData[]): Promise<{ success: boolean; added: number; failed: number; errors: string[] }> => {
        const result = await bulkAddStudents(data)
        if (result.success && result.added > 0) {
            router.refresh()
        }
        return {
            success: result.success,
            added: result.added,
            failed: result.failed,
            errors: result.errors
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <StudentTable
                students={students}
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                onAddStudent={() => {
                    setEditingStudent(null)
                    setStudentForm({
                        fullName: '', parentId: '', campusId: '', grade: '', section: '',
                        rollNumber: '', baseFee: 60000, discountPercent: 0,
                        isNewParent: false, newParentName: '', newParentMobile: ''
                    })
                    setShowStudentModal(true)
                }}
                onEdit={openEditModal}
                onBulkAdd={() => setShowBulkUploadModal(true)}
                onViewAmbassador={(code) => {
                    // This creates a dependency on parent view state. 
                    // Ideally we navigate via URL.
                    router.push(`/superadmin?view=users&search=${code}`)
                }}
            />

            {/* Add Student Modal */}
            {
                showStudentModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
                                <button onClick={() => setShowStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                                    <input
                                        type="text"
                                        value={studentForm.fullName}
                                        onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Enter student name"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        Parent Details
                                        {!editingStudent && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="newParentToggle"
                                                    checked={studentForm.isNewParent}
                                                    onChange={(e) => setStudentForm({ ...studentForm, isNewParent: e.target.checked })}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <label htmlFor="newParentToggle" style={{ fontSize: '11px', color: '#B91C1C', cursor: 'pointer', fontWeight: '500' }}>Add New Parent?</label>
                                            </div>
                                        )}
                                    </label>

                                    {/* Parent Selection Block - Fixed */}
                                    {studentForm.isNewParent ? (
                                        <div style={{ background: '#FEF2F2', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                                            <input
                                                type="text"
                                                value={studentForm.newParentName}
                                                onChange={(e) => setStudentForm({ ...studentForm, newParentName: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', marginBottom: '8px' }}
                                                placeholder="New Parent Name"
                                            />
                                            <input
                                                type="tel"
                                                value={studentForm.newParentMobile}
                                                onChange={(e) => setStudentForm({ ...studentForm, newParentMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px' }}
                                                placeholder="Parent Mobile (10 digits)"
                                            />
                                        </div>
                                    ) : (
                                        <select
                                            value={studentForm.parentId}
                                            onChange={(e) => setStudentForm({ ...studentForm, parentId: e.target.value })}
                                            disabled={!!editingStudent}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', background: editingStudent ? '#F3F4F6' : 'white' }}
                                        >
                                            <option value="">Select Existing Parent</option>
                                            {(users || []).filter(u => u.role === 'Parent').map((u, i) => (
                                                <option key={`${u.userId}-${i}`} value={u.userId}>{u.fullName} ({u.mobileNumber})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Campus *</label>
                                    <select
                                        value={studentForm.campusId}
                                        onChange={(e) => setStudentForm({ ...studentForm, campusId: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="">Select Campus</option>
                                        {campuses.map((c, i) => (
                                            <option key={`${c.id}-${i}`} value={c.id}>{c.campusName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Grade *</label>
                                    <select
                                        value={studentForm.grade}
                                        onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="">Select Grade</option>
                                        {getGradesForCampus(studentForm.campusId, campuses).map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Section</label>
                                    <input
                                        type="text"
                                        value={studentForm.section}
                                        onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="e.g. A"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Roll Number</label>
                                    <input
                                        type="text"
                                        value={studentForm.rollNumber}
                                        onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="e.g. 1001"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Base Fee</label>
                                    <input
                                        type="number"
                                        value={studentForm.baseFee}
                                        onChange={(e) => setStudentForm({ ...studentForm, baseFee: parseInt(e.target.value) })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Leave blank to auto-calculate"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Discount %</label>
                                    <input
                                        type="number"
                                        value={studentForm.discountPercent}
                                        onChange={(e) => setStudentForm({ ...studentForm, discountPercent: parseInt(e.target.value) })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Auto from Parent"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    style={{ flex: 1, padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveStudent}
                                    disabled={modalLoading}
                                    style={{ flex: 1, padding: '12px', background: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    {modalLoading ? 'Saving...' : editingStudent ? 'Update Only' : 'Add Student'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Upload Modal */}
            {showBulkUploadModal && (
                <CSVUploader
                    onClose={() => setShowBulkUploadModal(false)}
                    type="students"
                    onUpload={handleBulkUpload as any}
                />
            )}
        </div>
    )
}
