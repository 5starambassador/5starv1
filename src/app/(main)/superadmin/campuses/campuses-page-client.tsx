'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Plus, Trash } from 'lucide-react'
import { Campus } from '@/types'
import { CampusManagementTable } from '@/components/superadmin/CampusManagementTable'
import { getCampuses, addCampus, updateCampus, deleteCampus, deleteCampuses, toggleCampusStatus } from '@/app/campus-actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'

export default function CampusesPageClient({
    campuses: initialCampusesData = [],
    campusComparison = [],
    mode = 'management'
}: {
    campuses?: Campus[],
    campusComparison?: any[],
    mode?: 'management' | 'performance'
}) {
    const router = useRouter()
    const [campuses, setCampuses] = useState<Campus[]>(initialCampusesData)

    // Merge performance data
    const enrichedCampuses = campuses.map(campus => {
        const perf = campusComparison.find(c => c.campus === campus.campusName)
        return {
            ...campus,
            totalLeads: perf?.totalLeads || 0,
            confirmed: perf?.confirmed || 0,
            conversionRate: perf?.conversionRate || 0
        }
    })
    const [loading, setLoading] = useState(true)
    const [showCampusModal, setShowCampusModal] = useState(false)
    const [editingCampus, setEditingCampus] = useState<any>(null)
    const [campusForm, setCampusForm] = useState({
        campusName: '',
        campusCode: '',
        location: '',
        grades: '',
        maxCapacity: 500,
        contactEmail: '',
        contactPhone: '',
        gradeFees: [] as Array<{ grade: string; annualFee: number }>
    })
    const [customGradeInput, setCustomGradeInput] = useState('')

    // Delete State
    const [deleteState, setDeleteState] = useState<{
        isOpen: boolean
        type: 'single' | 'bulk'
        ids: number[]
        force: boolean
        errorMessage?: string
    }>({
        isOpen: false,
        type: 'single',
        ids: [],
        force: false
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const [statusConfirm, setStatusConfirm] = useState<{
        isOpen: boolean
        id: number | null
        currentStatus: boolean
        campusName: string
    }>({
        isOpen: false,
        id: null,
        currentStatus: false,
        campusName: ''
    })

    const loadCampuses = async () => {
        setLoading(true)
        try {
            const res = await getCampuses()
            if (res.success && res.campuses) {
                setCampuses(res.campuses)
            } else {
                toast.error('Failed to load campuses')
            }
        } catch (e) {
            toast.error('Error loading campuses')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (initialCampusesData.length > 0) {
            setCampuses(initialCampusesData)
        } else {
            loadCampuses()
        }
    }, [initialCampusesData])

    const handleSaveCampus = async () => {
        if (!campusForm.campusName || !campusForm.campusCode || !campusForm.grades) {
            toast.error('Please fill required fields (Name, Code, Grades)')
            return
        }

        const payload: any = { ...campusForm }

        let res
        if (editingCampus) {
            res = await updateCampus(editingCampus.id, payload)
        } else {
            res = await addCampus(payload)
        }
        if (res.success) {
            toast.success(editingCampus ? 'Campus updated' : 'Campus added')
            setShowCampusModal(false)
            loadCampuses()
            router.refresh()
        } else {
            toast.error(res.error || 'Failed to save campus')
        }
    }

    const handleDeleteCampus = (id: number) => {
        setDeleteState({ isOpen: true, type: 'single', ids: [id], force: false })
    }

    const handleBulkDelete = (ids: number[]) => {
        setDeleteState({ isOpen: true, type: 'bulk', ids, force: false })
    }

    const handleToggleStatus = async (id: number, currentStatus: boolean) => {
        // Confirmation for deactivation
        const c = campuses.find(campus => campus.id === id)
        if (currentStatus === true) {
            setStatusConfirm({
                isOpen: true,
                id,
                currentStatus,
                campusName: c?.campusName || 'this campus'
            })
            return
        }

        await executeToggleStatus(id, currentStatus)
    }

    const executeToggleStatus = async (id: number, currentStatus: boolean) => {
        const newStatus = !currentStatus
        // Optimistic update
        setCampuses(prev => prev.map(c => c.id === id ? { ...c, isActive: newStatus } : c))

        const res = await toggleCampusStatus(id, newStatus)
        if (res.success) {
            toast.success(`Campus ${newStatus ? 'activated' : 'deactivated'}`)
            router.refresh()
        } else {
            toast.error(res.error || 'Failed to update status')
            // Revert on failure
            setCampuses(prev => prev.map(c => c.id === id ? { ...c, isActive: currentStatus } : c))
        }
    }

    const executeDelete = async () => {
        setIsDeleting(true)
        const { type, ids, force } = deleteState

        try {
            let result
            if (type === 'single') {
                result = await deleteCampus(ids[0], force)
            } else {
                result = await deleteCampuses(ids, force)
            }

            if (result.success) {
                toast.success(force ? 'Campus(es) FORCE DELETED successfully' : 'Campus(es) deleted successfully')
                setDeleteState({ isOpen: false, type: 'single', ids: [], force: false })
                loadCampuses()
                router.refresh()
            } else {
                if (result.requiresForce && !force) {
                    // Switch to force delete mode
                    setDeleteState(prev => ({
                        ...prev,
                        force: true,
                        errorMessage: result.error
                    }))
                } else {
                    toast.error(result.error || 'Failed to delete campus')
                    setDeleteState({ isOpen: false, type: 'single', ids: [], force: false })
                }
            }
        } catch (error) {
            toast.error('An error occurred during deletion')
            setDeleteState({ isOpen: false, type: 'single', ids: [], force: false })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in min-h-screen pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Campus Control</h1>
            </div>

            <CampusManagementTable
                mode={mode}
                campuses={enrichedCampuses}
                onAdd={() => {
                    setEditingCampus(null)
                    setCampusForm({
                        campusName: '',
                        campusCode: '',
                        location: '',
                        grades: '',
                        maxCapacity: 500,
                        contactEmail: '',
                        contactPhone: '',
                        gradeFees: []
                    })
                    setShowCampusModal(true)
                }}
                onEdit={(campus: any) => {
                    setEditingCampus(campus)
                    setCampusForm({
                        campusName: campus.campusName,
                        campusCode: campus.campusCode,
                        location: campus.location,
                        grades: campus.grades || '9-12',
                        maxCapacity: campus.maxCapacity || 500,
                        contactEmail: campus.contactEmail || '',
                        contactPhone: campus.contactPhone || '',
                        gradeFees: campus.gradeFees || []
                    })
                    setShowCampusModal(true)
                }}
                onDelete={handleDeleteCampus}
                onBulkDelete={handleBulkDelete}
                onToggleStatus={handleToggleStatus}
            />

            {/* Campus Modal */}
            {
                showCampusModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                                    {editingCampus ? 'Edit Campus' : 'Add New Campus'}
                                </h2>
                                <button onClick={() => setShowCampusModal(false)} style={{ color: '#9CA3AF', cursor: 'pointer', background: 'none', border: 'none' }}><X size={24} /></button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Campus Name</label>
                                    <input
                                        type="text"
                                        value={campusForm.campusName}
                                        onChange={(e) => setCampusForm({ ...campusForm, campusName: e.target.value })}
                                        placeholder="e.g. ASM-PUDUCHERRY"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Campus Code</label>
                                        <input
                                            type="text"
                                            value={campusForm.campusCode}
                                            onChange={(e) => setCampusForm({ ...campusForm, campusCode: e.target.value })}
                                            placeholder="PUDU-01"
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Location</label>
                                        <input
                                            type="text"
                                            value={campusForm.location}
                                            onChange={(e) => setCampusForm({ ...campusForm, location: e.target.value })}
                                            placeholder="Puducherry"
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Contact Email</label>
                                        <input
                                            type="email"
                                            value={campusForm.contactEmail}
                                            onChange={(e) => setCampusForm({ ...campusForm, contactEmail: e.target.value })}
                                            placeholder="campus@achariya.org"
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Contact Phone</label>
                                        <input
                                            type="text"
                                            value={campusForm.contactPhone}
                                            onChange={(e) => setCampusForm({ ...campusForm, contactPhone: e.target.value })}
                                            placeholder="+91..."
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: '#E5E7EB', margin: '20px 0' }}></div>

                            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>School Grades</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        "Pre-Mont", "Pre Mont FD", "Pre Mont HD", "Pre Mont TD",
                                        "Mont-1", "Mont-2",
                                        "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
                                        "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
                                        "Grade 11", "Grade 12"
                                    ].map((grade) => {
                                        const currentGrades = campusForm.grades ? campusForm.grades.split(',').map(g => g.trim()) : []
                                        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
                                        const isSelected = currentGrades.some(g => norm(g) === norm(grade))

                                        return (
                                            <label key={grade} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-200 transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        let newGrades = [...currentGrades]

                                                        if (e.target.checked) {
                                                            if (!isSelected) newGrades.push(grade)
                                                        } else {
                                                            newGrades = newGrades.filter(g => norm(g) !== norm(grade))
                                                        }

                                                        // Define standard order
                                                        const standardOrder = [
                                                            "Pre-Mont", "Pre Mont FD", "Pre Mont HD", "Pre Mont TD",
                                                            "Mont-1", "Mont-2",
                                                            "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
                                                            "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
                                                            "Grade 11", "Grade 12"
                                                        ]

                                                        // Sort based on standard order
                                                        newGrades.sort((a, b) => {
                                                            const idxA = standardOrder.findIndex(s => norm(s) === norm(a))
                                                            const idxB = standardOrder.findIndex(s => norm(s) === norm(b))
                                                            // If not found in standard (custom grade?), put at end
                                                            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
                                                        })

                                                        // Deduplicate just in case
                                                        newGrades = [...new Set(newGrades)]

                                                        setCampusForm({ ...campusForm, grades: newGrades.join(', ') })
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                                                />
                                                <span className="text-xs font-medium text-gray-700">{grade}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                                {/* Custom Courses / College Grades Section */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-6 mb-2">
                                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>College Courses / Custom Tags</h3>
                                    <p className="text-[11px] text-gray-500 mb-4">
                                        Manage specific courses (e.g., B.Tech, MBA) for college campuses.
                                    </p>

                                    {/* Display Active Tags */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {(() => {
                                            const currentGrades = campusForm.grades ? campusForm.grades.split(',').map(g => g.trim()).filter(Boolean) : []
                                            const standardGrades = [
                                                "Pre-Mont", "Pre Mont FD", "Pre Mont HD", "Pre Mont TD",
                                                "Mont-1", "Mont-2",
                                                "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
                                                "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
                                                "Grade 11", "Grade 12"
                                            ]
                                            const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

                                            // Get only non-standard grades
                                            const customTags = currentGrades.filter(g => !standardGrades.some(s => norm(s) === norm(g)))

                                            if (customTags.length === 0) return <p className="text-xs text-gray-400 italic">No custom courses added.</p>

                                            return customTags.map((tag, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                                                    {tag}
                                                    <button
                                                        onClick={() => {
                                                            const newGrades = currentGrades.filter(g => g !== tag)
                                                            setCampusForm({ ...campusForm, grades: newGrades.join(', ') })
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))
                                        })()}
                                    </div>

                                    {/* Add New Tag Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customGradeInput}
                                            onChange={(e) => setCustomGradeInput(e.target.value)}
                                            placeholder="Enter course name (e.g. B.Tech)"
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    if (customGradeInput.trim()) {
                                                        const newTag = customGradeInput.trim()
                                                        const currentGrades = campusForm.grades ? campusForm.grades.split(',').map(g => g.trim()).filter(Boolean) : []
                                                        if (!currentGrades.includes(newTag)) {
                                                            setCampusForm({ ...campusForm, grades: [...currentGrades, newTag].join(', ') })
                                                        }
                                                        setCustomGradeInput('')
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (customGradeInput.trim()) {
                                                    const newTag = customGradeInput.trim()
                                                    const currentGrades = campusForm.grades ? campusForm.grades.split(',').map(g => g.trim()).filter(Boolean) : []
                                                    if (!currentGrades.includes(newTag)) {
                                                        setCampusForm({ ...campusForm, grades: [...currentGrades, newTag].join(', ') })
                                                    }
                                                    setCustomGradeInput('')
                                                }
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setShowCampusModal(false)}
                                    className="px-4 py-2 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCampus}
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                                >
                                    {editingCampus ? 'Update Campus' : 'Create Campus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteState.isOpen}
                title={deleteState.force ? 'FORCE DELETE WARNING' : 'Delete Campus(es)?'}
                description={
                    deleteState.force ? (
                        <div className="space-y-2">
                            <p className="text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                                {deleteState.errorMessage}
                            </p>
                            <p className="font-semibold">
                                Do you want to FORCE DELETE?
                                <br />
                                This will permanently delete ALL associated students and data.
                                <br />
                                <span className="text-red-600 uppercase">This action cannot be undone.</span>
                            </p>
                        </div>
                    ) : (
                        <p>
                            Are you sure you want to delete <strong>{deleteState.ids.length}</strong> campus(es)?
                            <br />
                            This action cannot be undone.
                        </p>
                    )
                }
                confirmText={deleteState.force ? 'YES, FORCE DELETE' : 'Yes, Delete'}
                variant="danger"
                onConfirm={executeDelete}
                onCancel={() => setDeleteState({ isOpen: false, type: 'single', ids: [], force: false })}
                isLoading={isDeleting}
            />

            {/* Status Toggle Confirm */}
            <ConfirmDialog
                isOpen={statusConfirm.isOpen}
                title="Deactivate Campus?"
                description={`Are you sure you want to DEACTIVATE ${statusConfirm.campusName}? This will prevent logins and new admissions.`}
                confirmText="Yes, Deactivate"
                variant="warning"
                onConfirm={() => {
                    if (statusConfirm.id !== null) executeToggleStatus(statusConfirm.id, statusConfirm.currentStatus)
                    setStatusConfirm(prev => ({ ...prev, isOpen: false }))
                }}
                onCancel={() => setStatusConfirm(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    )
}
