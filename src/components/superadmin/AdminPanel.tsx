'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Admin, Campus } from '@/types'
import { AdminTable } from '@/components/superadmin/AdminTable'
import { ResetPasswordModal } from '@/components/superadmin/ResetPasswordModal'
import { addAdmin, deleteAdmin, updateAdminStatus, updateAdmin } from '@/app/superadmin-actions'
import { mapAdminRole } from '@/lib/enum-utils'
import { Modal } from '@/components/ui/Modal'
import { ShieldCheck, Plus, Save, Loader2, Smartphone, Building2, User, Key, Edit, X } from 'lucide-react'

interface AdminPanelProps {
    admins: Admin[]
    campuses: Campus[]
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function AdminPanel({ admins, campuses }: AdminPanelProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddAdminModal, setShowAddAdminModal] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, adminId: number | null, adminName: string }>({
        isOpen: false,
        adminId: null,
        adminName: ''
    })

    // Reset Password State
    const [resetTarget, setResetTarget] = useState<{ id: number, name: string, type: 'user' | 'admin' } | null>(null)
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)

    const [adminForm, setAdminForm] = useState({
        adminName: '',
        adminMobile: '',
        password: '',
        role: 'Campus Admin' as 'Campus Head' | 'Campus Admin' | 'Admission Admin' | 'Finance Admin' | 'Super Admin',
        assignedCampus: ''
    })

    const handleOpenAddModal = () => {
        setEditingAdmin(null)
        setAdminForm({ adminName: '', adminMobile: '', password: '', role: 'Campus Admin', assignedCampus: '' })
        setShowAddAdminModal(true)
    }

    const handleOpenEditModal = (admin: Admin) => {
        setEditingAdmin(admin)
        setAdminForm({
            adminName: admin.adminName,
            adminMobile: admin.adminMobile,
            password: '', // Don't show password on edit
            role: mapAdminRole(admin.role as any) as any,
            assignedCampus: admin.assignedCampus || ''
        })
        setShowAddAdminModal(true)
    }

    const handleSaveAdmin = async () => {
        if (!adminForm.adminName || !adminForm.adminMobile || !adminForm.role) {
            toast.error('Please fill in required fields')
            return
        }
        if ((adminForm.role === 'Campus Head' || adminForm.role === 'Campus Admin') && !adminForm.assignedCampus) {
            toast.error('Assigned Campus is required for this role')
            return
        }

        setModalLoading(true)
        let result
        if (editingAdmin) {
            result = await updateAdmin(editingAdmin.adminId, adminForm)
        } else {
            result = await addAdmin(adminForm)
        }
        setModalLoading(false)

        if (result.success) {
            setShowAddAdminModal(false)
            setAdminForm({ adminName: '', adminMobile: '', password: '', role: 'Campus Admin', assignedCampus: '' })
            setEditingAdmin(null)
            router.refresh()
            toast.success(editingAdmin ? 'Admin updated successfully' : 'Admin added successfully')
        } else {
            toast.error(result.error || 'Failed to save admin')
        }
    }

    const handleDeleteAdmin = (id: number, name: string) => {
        setDeleteConfirmation({ isOpen: true, adminId: id, adminName: name })
    }

    const confirmDeleteAdmin = async () => {
        if (!deleteConfirmation.adminId) return

        setModalLoading(true)
        const result = await deleteAdmin(deleteConfirmation.adminId)
        setModalLoading(false)

        if (result.success) {
            setDeleteConfirmation({ isOpen: false, adminId: null, adminName: '' })
            router.refresh()
            toast.success('Admin deleted successfully')
        } else {
            toast.error(result.error || 'Failed to delete admin')
            setDeleteConfirmation({ isOpen: false, adminId: null, adminName: '' })
        }
    }

    const handleToggleAdminStatus = async (adminId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
        const result = await updateAdminStatus(adminId, newStatus as 'Active' | 'Inactive')
        if (result.success) {
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to update admin status')
        }
    }

    const openResetModal = (id: number, name: string, type: 'user' | 'admin') => {
        setResetTarget({ id, name, type })
        setShowResetPasswordModal(true)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <AdminTable
                admins={admins}
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                onAddAdmin={handleOpenAddModal}
                onDelete={(id, name) => handleDeleteAdmin(id, name)}
                onToggleStatus={handleToggleAdminStatus}
                onResetPassword={openResetModal}
                onEdit={handleOpenEditModal}
                onBulkAdd={() => { }} // Add placeholder for missing prop
            />

            {/* Standardized Add/Edit Admin Modal */}
            <Modal
                isOpen={showAddAdminModal}
                onClose={() => setShowAddAdminModal(false)}
                variant="danger"
                title={editingAdmin ? 'Refine Credentials' : 'Onboard Executive'}
                subtitle="High-Level Access Provisioning"
                icon={editingAdmin ? <Edit size={20} /> : <ShieldCheck size={20} />}
                footer={
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowAddAdminModal(false)}
                            className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 transition-all"
                        >
                            Abort
                        </button>
                        <button
                            onClick={handleSaveAdmin}
                            disabled={modalLoading}
                            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {editingAdmin ? 'Update Core' : 'Ignite Access'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Designation</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-200 transition-all"
                                placeholder="Executive Name"
                                value={adminForm.adminName}
                                onChange={(e) => setAdminForm({ ...adminForm, adminName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Secure Contact</label>
                        <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-200 transition-all"
                                placeholder="10-Digit Mobile"
                                value={adminForm.adminMobile}
                                onChange={(e) => setAdminForm({ ...adminForm, adminMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            />
                        </div>
                    </div>

                    {!editingAdmin && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Initial Keyphrase</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input
                                    type="password"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-200 transition-all"
                                    placeholder="Leave blank for Mobile default"
                                    value={adminForm.password}
                                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">System Role</label>
                            <select
                                value={adminForm.role}
                                onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as any })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-200 transition-all uppercase tracking-tight"
                            >
                                <option value="Campus Head">Campus Head</option>
                                <option value="Campus Admin">Campus Admin</option>
                                <option value="Admission Admin">Admission Admin</option>
                                <option value="Finance Admin">Finance Admin</option>
                                <option value="Super Admin">Super Admin</option>
                            </select>
                        </div>

                        {(adminForm.role === 'Campus Head' || adminForm.role === 'Campus Admin') && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assigned Node</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                    <select
                                        value={adminForm.assignedCampus}
                                        onChange={(e) => setAdminForm({ ...adminForm, assignedCampus: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-200 transition-all uppercase tracking-tight"
                                    >
                                        <option value="">Select Campus</option>
                                        {campuses.map(c => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase tracking-wide">
                            <ShieldCheck size={12} className="inline mr-1 -mt-0.5" />
                            Warning: Administrative roles grant access to sensitive student data and financial records. Ensure the individual is authorized.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Reset Password Modal */}
            <ResetPasswordModal
                isOpen={showResetPasswordModal}
                onClose={() => {
                    setShowResetPasswordModal(false)
                    setResetTarget(null)
                }}
                target={resetTarget}
            />

            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmation.isOpen}
                title="Delete Administrator?"
                description={
                    <p>
                        Are you sure you want to permanently delete <strong>{deleteConfirmation.adminName}</strong>?
                        <br />
                        This action cannot be undone and will revoke their access immediately.
                    </p>
                }
                confirmText="Yes, Delete Admin"
                variant="danger"
                onConfirm={confirmDeleteAdmin}
                onCancel={() => setDeleteConfirmation({ isOpen: false, adminId: null, adminName: '' })}
                isLoading={modalLoading}
            />
        </div>
    )
}
