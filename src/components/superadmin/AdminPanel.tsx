'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Admin, Campus } from '@/types'
import { AdminTable } from '@/components/superadmin/AdminTable'
import { ResetPasswordModal } from '@/components/superadmin/ResetPasswordModal'
import { addAdmin, deleteAdmin, updateAdminStatus, updateAdmin } from '@/app/superadmin-actions'
import { mapAdminRole } from '@/lib/enum-utils'

interface AdminPanelProps {
    admins: Admin[]
    campuses: Campus[]
}

export function AdminPanel({ admins, campuses }: AdminPanelProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddAdminModal, setShowAddAdminModal] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)

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

    const handleDeleteAdmin = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete admin "${name}"?`)) {
            return
        }
        const result = await deleteAdmin(id)
        if (result.success) {
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to delete admin')
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

            {/* Add/Edit Admin Modal */}
            {
                showAddAdminModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{editingAdmin ? 'Edit Administrator' : 'Add New Admin'}</h3>
                                <button onClick={() => setShowAddAdminModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Admin Name *</label>
                                    <input
                                        type="text"
                                        value={adminForm.adminName}
                                        onChange={(e) => setAdminForm({ ...adminForm, adminName: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Enter admin name"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                                    <input
                                        type="tel"
                                        value={adminForm.adminMobile}
                                        onChange={(e) => setAdminForm({ ...adminForm, adminMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="10 digit mobile number"
                                    />
                                </div>
                                {!editingAdmin && (
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Password (Optional)</label>
                                        <input
                                            type="password"
                                            value={adminForm.password}
                                            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                            placeholder="Defaults to Mobile Number"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Role *</label>
                                    <select
                                        value={adminForm.role}
                                        onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as any })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="Campus Head">Campus Head</option>
                                        <option value="Campus Admin">Campus Admin</option>
                                        <option value="Admission Admin">Admission Admin</option>
                                        <option value="Finance Admin">Finance Admin</option>
                                        <option value="Super Admin">Super Admin</option>
                                    </select>
                                </div>
                                {(adminForm.role === 'Campus Head' || adminForm.role === 'Campus Admin') && (
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Assigned Campus *</label>
                                        <select
                                            value={adminForm.assignedCampus}
                                            onChange={(e) => setAdminForm({ ...adminForm, assignedCampus: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        >
                                            <option value="">Select Campus</option>
                                            {campuses.map(c => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setShowAddAdminModal(false)}
                                        style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveAdmin}
                                        disabled={modalLoading}
                                        style={{ flex: 1, padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        {modalLoading ? 'Saving...' : (editingAdmin ? 'Update Administrator' : 'Add Admin')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reset Password Modal */}
            <ResetPasswordModal
                isOpen={showResetPasswordModal}
                onClose={() => {
                    setShowResetPasswordModal(false)
                    setResetTarget(null)
                }}
                target={resetTarget}
            />
        </div>
    )
}
