'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, User as UserIcon, CheckCircle, Clock, CreditCard, RefreshCcw } from 'lucide-react'
import { Student, User, Campus, BulkStudentData, GradeFee } from '@/types'
import { StudentTable } from '@/components/superadmin/StudentTable'
import { StudentDetailPanel } from '@/components/superadmin/StudentDetailPanel'
import CSVUploader from '@/components/CSVUploader'
import { addStudent, updateStudent, bulkAddStudents } from '@/app/student-actions'
import { backfillStudentFees, generateMissingGradeFeeReport } from '@/app/import-actions'
import { getGradesForCampus } from '@/lib/grade-utils'
import { AcademicYearFilter } from '@/components/AcademicYearFilter'
import { AnimatePresence } from 'framer-motion'

interface StudentsPageClientProps {
    students: Student[]
    users: User[]
    campuses: Campus[]
    gradeFees: GradeFee[]
}

export default function StudentsPageClient({ students, users, campuses, gradeFees }: StudentsPageClientProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [showStudentModal, setShowStudentModal] = useState(false)
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null)
    const [isLive, setIsLive] = useState(false)
    const [isBackfilling, setIsBackfilling] = useState(false)

    // Backfill Handler
    const handleBackfillFees = async () => {
        console.log('[BACKFILL] Starting fee backfill...')
        setIsBackfilling(true)

        let failedCount = 0
        try {
            const result = await backfillStudentFees()
            console.log('[BACKFILL] Result:', result)

            if (result.success) {
                failedCount = result.failed || 0
                toast.success(`Successfully updated ${result.updated} students! (Failed: ${failedCount})`)
                router.refresh()
            } else {
                toast.error(result.error || 'Backfill failed')
            }
        } catch (error: any) {
            console.error('[BACKFILL] Error:', error)
            toast.error(`Error during backfill: ${error.message}`)
        } finally {
            setIsBackfilling(false)
        }

        // Auto-generate CSV report AFTER resetting loading state
        if (failedCount > 0) {
            try {
                console.log('[BACKFILL] Generating CSV report for failed entries...')
                const reportResult = await generateMissingGradeFeeReport()
                if (reportResult.success && reportResult.missingCombinations) {
                    // Convert to CSV format
                    const csvRows = []
                    csvRows.push(['Campus', 'Grade', 'Academic Year', 'Students Affected', 'Reason', 'Action Required'])

                    for (const combo of reportResult.missingCombinations) {
                        csvRows.push([
                            combo.campusName,
                            combo.grade,
                            combo.academicYear,
                            combo.studentCount.toString(),
                            `No GradeFee record configured`,
                            `Add GradeFee entry with annualFee_otp and annualFee_wotp values`
                        ])
                    }

                    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
                    const blob = new Blob([csvContent], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `missing-gradefee-report-${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                    toast.info(`CSV report downloaded: ${failedCount} students need GradeFee entries`)
                }
            } catch (reportError) {
                console.error('[BACKFILL] Failed to generate report:', reportError)
            }
        }
    }

    // Generate Report Handler
    const handleGenerateReport = async () => {
        console.log('[REPORT] Button clicked! Generating CSV report...')
        try {
            const result = await generateMissingGradeFeeReport()
            console.log('[REPORT] Result received:', result)
            if (result.success && result.missingCombinations) {
                console.log('[REPORT] Creating CSV download...')

                // Convert to CSV format
                const csvRows = []
                csvRows.push(['Campus', 'Grade', 'Academic Year', 'Students Affected', 'Reason', 'Action Required', 'Student Names'])

                for (const combo of result.missingCombinations) {
                    const studentNames = combo.students.map(s => `${s.name} (${s.admissionNumber})`).join('; ')
                    csvRows.push([
                        combo.campusName,
                        combo.grade,
                        combo.academicYear,
                        combo.studentCount.toString(),
                        `No GradeFee record configured`,
                        `Add GradeFee entry with annualFee_otp and annualFee_wotp`,
                        studentNames
                    ])
                }

                const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `missing-gradefee-report-${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
                console.log('[REPORT] Download triggered successfully')
                toast.success(`CSV report generated! ${result.totalAffected} students affected`)
            } else {
                console.error('[REPORT] Failed:', result.error)
                toast.error(result.error || 'Failed to generate report')
            }
        } catch (error: any) {
            console.error('[REPORT] Error:', error)
            toast.error(`Error generating report: ${error.message}`)
        }
    }

    // Live Mode Effect
    useEffect(() => {
        // Initialize from cookie on mount to avoid hydration mismatch
        const isLiveMode = document.cookie.includes('student_live_mode=true')
        if (isLiveMode) setIsLive(true)
    }, [])

    useEffect(() => {
        if (!isLive) return
        const interval = setInterval(() => {
            router.refresh()
            toast.success('Data refreshed', { duration: 1000, icon: <RefreshCcw size={12} /> })
        }, 10000)
        return () => clearInterval(interval)
    }, [isLive, router])

    const [studentForm, setStudentForm] = useState<any>({
        fullName: '',
        parentId: '',
        campusId: '',
        grade: '',
        section: '',
        rollNumber: '',
        baseFee: '',
        discountPercent: 0,
        admissionNumber: '',
        academicYear: '2025-2026',
        selectedFeeType: 'WOTP',
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
            admissionNumber: student.admissionNumber || '',
            academicYear: student.academicYear || '2025-2026',
            selectedFeeType: (student as any).selectedFeeType || 'WOTP',
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
                discountPercent: studentForm.discountPercent,
                admissionNumber: studentForm.admissionNumber,
                academicYear: studentForm.academicYear
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
                admissionNumber: studentForm.admissionNumber,
                academicYear: studentForm.academicYear,
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
                fullName: '', parentId: '', campusId: '', grade: '', section: '', rollNumber: '', baseFee: '', discountPercent: 0,
                admissionNumber: '', academicYear: '2025-2026',
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
        <div className="space-y-6 animate-fade-in relative min-h-screen pb-20">
            {/* Header with Title and Year Filter */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Student Database</h1>
            </div>

            <StudentTable
                students={students}
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                onAddStudent={() => {
                    setEditingStudent(null)
                    setStudentForm({
                        fullName: '', parentId: '', campusId: '', grade: '', section: '',
                        rollNumber: '', baseFee: '', discountPercent: 0,
                        admissionNumber: '', academicYear: '2025-2026',
                        isNewParent: false, newParentName: '', newParentMobile: ''
                    })
                    setShowStudentModal(true)
                }}
                onEdit={openEditModal}
                onBulkAdd={() => setShowBulkUploadModal(true)}
                onViewAmbassador={(code) => {
                    router.push(`/superadmin?view=users&search=${code}`)
                }}
                onRowClick={(student) => setSelectedStudentForDetail(student)}
                campuses={campuses}
                onBackfillFees={handleBackfillFees}
                isBackfilling={isBackfilling}
                onGenerateReport={handleGenerateReport}
                gradeFees={gradeFees}
            />
            {/* Detail Panel */}
            <AnimatePresence>
                <StudentDetailPanel
                    student={selectedStudentForDetail}
                    users={users}
                    campuses={campuses}
                    gradeFees={gradeFees}
                    onClose={() => setSelectedStudentForDetail(null)}
                    onEdit={(student) => {
                        setSelectedStudentForDetail(null)
                        openEditModal(student)
                    }}
                    onUpdate={async (id, data) => {
                        const result = await updateStudent(id, data)
                        if (result.success) {
                            router.refresh()
                            // Update local state to reflect changes immediately
                            setSelectedStudentForDetail(prev => prev ? { ...prev, ...data } : null)
                            return { success: true }
                        }
                        return result
                    }}
                    onViewParent={(parentId) => {
                        const parent = users.find(u => u.userId === parentId)
                        if (parent) {
                            router.push(`/superadmin?view=users&search=${parent.mobileNumber}`)
                        }
                    }}
                />
            </AnimatePresence>

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
                                        onChange={async (e) => {
                                            const newGrade = e.target.value
                                            setStudentForm((prev: any) => ({ ...prev, grade: newGrade }))

                                            // Auto-fetch fee
                                            if (studentForm.campusId && newGrade) {
                                                const feeType = studentForm.selectedFeeType || 'WOTP'
                                                const fee = await import('@/app/student-actions').then(m => m.getGradeFee(parseInt(studentForm.campusId), newGrade, studentForm.academicYear, feeType))
                                                if (fee !== null) {
                                                    setStudentForm((prev: any) => ({ ...prev, baseFee: fee }))
                                                }
                                            }
                                        }}
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
                                <div className="col-span-2">
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Admission Number</label>
                                    <input
                                        type="text"
                                        value={studentForm.admissionNumber}
                                        onChange={(e) => setStudentForm({ ...studentForm, admissionNumber: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="e.g. ADM-2025-001"
                                    />
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Academic Year</label>
                                        <select
                                            value={studentForm.academicYear}
                                            onChange={(e) => setStudentForm({ ...studentForm, academicYear: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        >
                                            <option value="2024-2025">2024-2025</option>
                                            <option value="2025-2026">2025-2026</option>
                                            <option value="2026-2027">2026-2027</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                                            Payment Plan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={studentForm.selectedFeeType || 'WOTP'}
                                            onChange={async (e) => {
                                                const newType = e.target.value
                                                setStudentForm((prev: any) => ({ ...prev, selectedFeeType: newType }))

                                                // Auto-fetch fee on plan change
                                                if (studentForm.campusId && studentForm.grade) {
                                                    const fee = await import('@/app/student-actions').then(m => m.getGradeFee(parseInt(studentForm.campusId), studentForm.grade, studentForm.academicYear, newType as any))
                                                    if (fee !== null) {
                                                        setStudentForm((prev: any) => ({ ...prev, baseFee: fee }))
                                                    }
                                                }
                                            }}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        >
                                            <option value="WOTP">Installment (WOTP)</option>
                                            <option value="OTP">One Time (OTP)</option>
                                        </select>
                                    </div>
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
