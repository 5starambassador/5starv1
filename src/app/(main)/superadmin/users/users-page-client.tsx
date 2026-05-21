'use client'

import { useState, useEffect, useCallback } from 'react'
import debounce from 'lodash/debounce'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { User, Campus, BulkUserData } from '@/types'
import { UserTable } from '@/components/superadmin/UserTable'
import { addUser, updateUser, removeUser, updateUserStatus, bulkAddUsers, purgeUserPermanently } from '@/app/superadmin-actions'
import { AcademicYearFilter } from '@/components/AcademicYearFilter'
import dynamic from 'next/dynamic'

// Dynamic imports for bundle optimization
const ResetPasswordModal = dynamic(() => import('@/components/superadmin/ResetPasswordModal').then(m => m.ResetPasswordModal), { ssr: false })
const CSVUploader = dynamic(() => import('@/components/CSVUploader').then(m => m.default), { ssr: false })
const ConfirmDialog = dynamic(() => import('@/components/ui/ConfirmDialog').then(m => m.ConfirmDialog), { ssr: false })

interface UsersPageClientProps {
    users: User[]
    pagination?: {
        page: number
        pageSize: number
        totalCount: number
        totalPages: number
    } | null
    campuses: Campus[]
    currentUserRole?: string
}

export default function UsersPageClient({ users, pagination, campuses, currentUserRole }: UsersPageClientProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddUserModal, setShowAddUserModal] = useState(false)
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, userId: number | null, userName: string }>({
        isOpen: false,
        userId: null,
        userName: ''
    })
    const [purgeConfirmation, setPurgeConfirmation] = useState<{ isOpen: boolean, userId: number | null, userName: string }>({
        isOpen: false,
        userId: null,
        userName: ''
    })

    const searchParams = useSearchParams()

    const debouncedSearch = useCallback(
        debounce((query: string) => {
            const params = new URLSearchParams(window.location.search)
            if (query) params.set('search', query)
            else params.delete('search')
            params.set('page', '1')
            router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
        }, 500),
        [router]
    )

    const handleSearchChange = (query: string) => {
        setSearchQuery(query)
        debouncedSearch(query)
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', page.toString())
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    // Reset Password State
    const [resetTarget, setResetTarget] = useState<{ id: number, name: string, type: 'user' | 'admin' } | null>(null)
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [roleFilter, setRoleFilter] = useState<string[]>([])
    const [sourceFilter, setSourceFilter] = useState<string[]>([])
    const [campusFilter, setCampusFilter] = useState<string[]>([])
    const [referralsFilter, setReferralsFilter] = useState<string[]>([])
    const [userView, setUserView] = useState<'active' | 'archive'>('active')

    // Initial state from URL & Sync on navigation
    useEffect(() => {
        const urlSearch = searchParams.get('search')
        if (urlSearch !== null) setSearchQuery(urlSearch)

        const urlStatus = searchParams.get('status')
        if (urlStatus) {
            const statusArray = urlStatus.split(',').filter(Boolean)
            setStatusFilter(statusArray)
            if (statusArray.includes('Deleted')) {
                setUserView('archive')
            } else {
                setUserView('active')
            }
        } else {
            setStatusFilter([])
            setUserView('active')
        }

        const urlRole = searchParams.get('role')
        if (urlRole) setRoleFilter(urlRole.split(',').filter(Boolean))
        else setRoleFilter([])

        const urlSource = searchParams.get('source')
        if (urlSource) setSourceFilter(urlSource.split(',').filter(Boolean))
        else setSourceFilter([])

        const urlCampus = searchParams.get('campus')
        if (urlCampus) setCampusFilter(urlCampus.split(',').filter(Boolean))
        else setCampusFilter([])

        const urlReferrals = searchParams.get('referrals')
        if (urlReferrals) setReferralsFilter(urlReferrals.split(',').filter(Boolean))
        else setReferralsFilter([])
    }, [searchParams])

    const handleStatusFilterChange = (status: string[] | ((prev: string[]) => string[])) => {
        const newStatus = typeof status === 'function' ? status(statusFilter) : status
        setStatusFilter(newStatus)
        const params = new URLSearchParams(window.location.search)
        if (newStatus.length > 0) params.set('status', newStatus.join(','))
        else params.delete('status')
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleRoleFilterChange = (role: string[] | ((prev: string[]) => string[])) => {
        const newRole = typeof role === 'function' ? role(roleFilter) : role
        setRoleFilter(newRole)
        const params = new URLSearchParams(window.location.search)
        if (newRole.length > 0) params.set('role', newRole.join(','))
        else params.delete('role')
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleSourceFilterChange = (source: string[] | ((prev: string[]) => string[])) => {
        const newSource = typeof source === 'function' ? source(sourceFilter) : source
        setSourceFilter(newSource)
        const params = new URLSearchParams(window.location.search)
        if (newSource.length > 0) params.set('source', newSource.join(','))
        else params.delete('source')
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleCampusFilterChange = (campus: string[] | ((prev: string[]) => string[])) => {
        const newCampus = typeof campus === 'function' ? campus(campusFilter) : campus
        setCampusFilter(newCampus)
        const params = new URLSearchParams(window.location.search)
        if (newCampus.length > 0) params.set('campus', newCampus.join(','))
        else params.delete('campus')
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleReferralsFilterChange = (refs: string[] | ((prev: string[]) => string[])) => {
        const newRefs = typeof refs === 'function' ? refs(referralsFilter) : refs
        setReferralsFilter(newRefs)
        const params = new URLSearchParams(window.location.search)
        if (newRefs.length > 0) params.set('referrals', newRefs.join(','))
        else params.delete('referrals')
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleClearAllFilters = () => {
        setRoleFilter([])
        setSourceFilter([])
        setCampusFilter([])
        setReferralsFilter([])
        setStatusFilter([])
        const params = new URLSearchParams(window.location.search)
        params.delete('role')
        params.delete('source')
        params.delete('campus')
        params.delete('referrals')
        params.delete('status')
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const handleUserViewToggle = (view: 'active' | 'archive') => {
        setUserView(view)
        const params = new URLSearchParams(window.location.search)
        if (view === 'archive') {
            params.set('status', 'Deleted')
            setStatusFilter(['Deleted'])
        } else {
            params.delete('status')
            setStatusFilter([])
        }
        params.set('page', '1')
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    }

    const [userForm, setUserForm] = useState({
        fullName: '',
        mobileNumber: '',
        role: 'Parent' as 'Parent' | 'Staff' | 'Alumni' | 'Others',
        empId: '',
        childEprNo: '',
        grade: '',
        email: '',
        address: '',
        aadharNo: '',
        status: 'Pending' as any,
        benefitStatus: 'Pending' as any,
        accountNumber: '',
        bankName: '',
        ifscCode: '',
        bankAccountDetails: '',
        isFiveStarMember: false,
        yearFeeBenefitPercent: 0,
        longTermBenefitPercent: 0,
        childName: '',
        childInAchariya: false,
        childCampusId: undefined as number | undefined,
        assignedCampus: ''
    })

    const openEditUserModal = (user: User) => {
        setEditingUser(user)
        setUserForm({
            fullName: user.fullName,
            mobileNumber: user.mobileNumber,
            role: user.role as any,
            assignedCampus: user.assignedCampus || '',
            empId: user.empId || '',
            childEprNo: user.childEprNo || '',
            grade: user.grade || '',
            email: user.email || '',
            address: user.address || '',
            aadharNo: user.aadharNo || '',
            status: user.status as any,
            benefitStatus: user.benefitStatus as any,
            accountNumber: user.accountNumber || '',
            bankName: user.bankName || '',
            ifscCode: user.ifscCode || '',
            bankAccountDetails: user.bankAccountDetails || '',
            isFiveStarMember: user.isFiveStarMember || false,
            yearFeeBenefitPercent: user.yearFeeBenefitPercent || 0,
            longTermBenefitPercent: user.longTermBenefitPercent || 0,
            childName: user.childName || '',
            childInAchariya: user.childInAchariya || false,
            childCampusId: user.childCampusId || undefined
        })
        setShowAddUserModal(true)
    }

    const openResetModal = (id: number, name: string, type: 'user' | 'admin') => {
        setResetTarget({ id, name, type })
        setShowResetPasswordModal(true)
    }

    const handleSaveUser = async () => {
        if (!userForm.fullName || !userForm.mobileNumber) {
            toast.error('Name and Mobile are required')
            return
        }
        if (userForm.role === 'Staff' && !userForm.empId) {
            toast.error('Employee ID is required for Staff')
            return
        }

        setModalLoading(true)
        let result
        if (editingUser) {
            result = await updateUser(editingUser.userId, userForm)
        } else {
            result = await addUser(userForm)
        }

        setModalLoading(false)
        if (result.success) {
            setShowAddUserModal(false)
            setEditingUser(null)
            setUserForm({
                fullName: '', mobileNumber: '', role: 'Parent', assignedCampus: '', empId: '', childEprNo: '', grade: '',
                email: '', address: '', aadharNo: '', status: 'Pending' as any, benefitStatus: 'Pending' as any,
                accountNumber: '', bankName: '', ifscCode: '', bankAccountDetails: '',
                isFiveStarMember: false, yearFeeBenefitPercent: 0, longTermBenefitPercent: 0,
                childName: '', childInAchariya: false, childCampusId: undefined
            })
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to save user')
        }
    }

    const handleDeleteUser = (id: number, name: string) => {
        setDeleteConfirmation({ isOpen: true, userId: id, userName: name })
    }

    const confirmDeleteUser = async () => {
        if (!deleteConfirmation.userId) return

        const result = await removeUser(deleteConfirmation.userId)
        if (result.success) {
            setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })
            router.refresh()
            toast.success('User archived and number recycled')
        } else {
            toast.error(result.error || 'Failed to delete user')
            setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })
        }
    }

    const handlePurgeUser = (id: number, name: string) => {
        setPurgeConfirmation({ isOpen: true, userId: id, userName: name })
    }

    const confirmPurgeUser = async () => {
        if (!purgeConfirmation.userId) return

        setModalLoading(true)
        const result = await purgeUserPermanently(purgeConfirmation.userId)
        setModalLoading(false)

        if (result.success) {
            setPurgeConfirmation({ isOpen: false, userId: null, userName: '' })
            router.refresh()
            toast.success('User purged permanently')
        } else {
            toast.error(result.error || 'Failed to purge user')
            setPurgeConfirmation({ isOpen: false, userId: null, userName: '' })
        }
    }

    const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
        const result = await updateUserStatus(userId, newStatus as 'Active' | 'Inactive')
        if (result.success) {
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to update status')
        }
    }

    const handleBulkUpload = async (data: BulkUserData[]): Promise<{ success: boolean; added: number; failed: number; errors: string[] }> => {
        const result = await bulkAddUsers(data)
        if (result.success && result.added > 0) {
            router.refresh()
        }
        return {
            success: result.success,
            added: result.added,
            failed: result.failed,
            errors: result.errors || []
        }
    }

    // Data is already filtered by the server based on search/status/pagination
    const filteredUsers = users

    return (
        <div className="space-y-6 animate-fade-in min-h-screen pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter">User Operations</h1>
                <AcademicYearFilter />
            </div>

            {/* View Toggle */}
            <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-white/20 w-fit shadow-sm">
                <button
                    onClick={() => handleUserViewToggle('active')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${userView === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-indigo-600'}`}
                    suppressHydrationWarning
                >
                    Active Users
                </button>
                <button
                    onClick={() => handleUserViewToggle('archive')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${userView === 'archive' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-red-600'}`}
                    suppressHydrationWarning
                >
                    Archived (Recycled)
                </button>
            </div>

            <UserTable
                users={filteredUsers}
                pagination={pagination}
                campuses={campuses}
                searchTerm={searchQuery}
                onSearchChange={handleSearchChange}
                onPageChange={handlePageChange}
                statusFilterValue={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                roleFilterValue={roleFilter}
                onRoleFilterChange={handleRoleFilterChange}
                sourceFilterValue={sourceFilter}
                onSourceFilterChange={handleSourceFilterChange}
                campusFilterValue={campusFilter}
                onCampusFilterChange={handleCampusFilterChange}
                referralsFilterValue={referralsFilter}
                onReferralsFilterChange={handleReferralsFilterChange}
                onClearAllFilters={handleClearAllFilters}
                onAddUser={() => {
                    setEditingUser(null);
                    setUserForm({
                        fullName: '', mobileNumber: '', role: 'Parent', assignedCampus: '', empId: '', childEprNo: '', grade: '',
                        email: '', address: '', aadharNo: '', status: 'Pending' as any, benefitStatus: 'Pending' as any,
                        accountNumber: '', bankName: '', ifscCode: '', bankAccountDetails: '',
                        isFiveStarMember: false, yearFeeBenefitPercent: 0, longTermBenefitPercent: 0,
                        childName: '', childInAchariya: false, childCampusId: undefined
                    });
                    setShowAddUserModal(true)
                }}
                onBulkAdd={() => setShowBulkUploadModal(true)}
                onDelete={(id, name) => handleDeleteUser(id, name)}
                onToggleStatus={handleToggleUserStatus}
                onViewReferrals={(code) => {
                    // Navigate to referrals view with filter
                    router.push(`/superadmin/referrals?search=${code}`)
                }}
                onResetPassword={openResetModal}
                onEdit={openEditUserModal}
                onPurge={handlePurgeUser}
            />

            {/* Add User Modal */}
            {
                showAddUserModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                            {/* Header - Fixed */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid #F3F4F6', background: 'white', flexShrink: 0 }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#111827' }}>{editingUser ? 'Update Ambassador' : 'Add New Ambassador'}</h3>
                                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Complete all details to ensure correct benefit calculation.</p>
                                </div>
                                <button onClick={() => { setShowAddUserModal(false); setEditingUser(null) }} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#6B7280', transition: 'all 0.2s' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* Section 1: Identity & Credentials */}
                                <section>
                                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', borderLeft: '4px solid #EF4444', paddingLeft: '12px' }}>Identity & Credentials</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                                            <input
                                                type="text"
                                                value={userForm.fullName}
                                                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', transition: 'border-color 0.2s' }}
                                                placeholder="Legal Name"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>Mobile Number *</label>
                                            <input
                                                type="tel"
                                                value={userForm.mobileNumber}
                                                onChange={(e) => setUserForm({ ...userForm, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px' }}
                                                placeholder="10-digit number"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>User Role *</label>
                                            <select
                                                value={userForm.role}
                                                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', background: 'white' }}
                                            >
                                                <option value="Parent">Parent Ambassador</option>
                                                <option value="Staff">Staff Ambassador</option>
                                                <option value="Alumni">Alumni Ambassador</option>
                                                <option value="Others">General Ambassador</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>Account Status</label>
                                            <select
                                                value={userForm.status}
                                                onChange={(e) => setUserForm({ ...userForm, status: e.target.value as any })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', background: 'white' }}
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Suspended">Suspended</option>
                                                <option value="Pending">Pending Approval</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Role-Specific Details */}
                                <section style={{ background: '#F9FAFB', padding: '24px', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', background: '#3B82F6', borderRadius: '2px' }}></div>
                                        {userForm.role} Details
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                                        {userForm.role === 'Staff' && (
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '6px' }}>Employee ID *</label>
                                                <input
                                                    type="text"
                                                    value={userForm.empId}
                                                    onChange={(e) => setUserForm({ ...userForm, empId: e.target.value })}
                                                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', background: 'white' }}
                                                    placeholder="EMPXXXX"
                                                />
                                            </div>
                                        )}
                                        
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '6px' }}>{userForm.role === 'Staff' ? 'Working Campus' : 'Assigned Campus'}</label>
                                            <select
                                                value={userForm.assignedCampus}
                                                onChange={(e) => {
                                                    const campName = e.target.value;
                                                    const updates: any = { assignedCampus: campName };
                                                    if (userForm.role === 'Parent') {
                                                        const camp = campuses.find(c => c.campusName === campName);
                                                        if (camp) updates.childCampusId = camp.id;
                                                    }
                                                    setUserForm({ ...userForm, ...updates });
                                                }}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', background: 'white' }}
                                            >
                                                <option value="">Select Campus</option>
                                                {campuses.map(c => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
                                            </select>
                                        </div>

                                        {(userForm.role === 'Staff' || userForm.role === 'Parent') && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', gridColumn: '1 / -1', marginTop: '4px', background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                                                <input
                                                    type="checkbox"
                                                    id="childInAchariya"
                                                    checked={userForm.childInAchariya}
                                                    onChange={(e) => setUserForm({ ...userForm, childInAchariya: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3B82F6' }}
                                                />
                                                <label htmlFor="childInAchariya" style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937', cursor: 'pointer' }}>My Child is studying in Achariya</label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sub-Section: Student Information */}
                                    {userForm.childInAchariya && (
                                        <div style={{ marginTop: '24px', padding: '20px', background: 'white', borderRadius: '16px', border: '1.5px solid #EBF5FF', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: '-10px', left: '20px', background: '#3B82F6', color: 'white', fontSize: '10px', fontWeight: '900', padding: '2px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>Student Information</div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '8px' }}>
                                                <div>
                                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '6px' }}>Child's Name</label>
                                                    <input
                                                        type="text"
                                                        value={userForm.childName}
                                                        onChange={(e) => setUserForm({ ...userForm, childName: e.target.value })}
                                                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px' }}
                                                        placeholder="Student Full Name"
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '6px' }}>Student ERP No</label>
                                                    <input
                                                        type="text"
                                                        value={userForm.childEprNo}
                                                        onChange={(e) => setUserForm({ ...userForm, childEprNo: e.target.value })}
                                                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px' }}
                                                        placeholder="STUXXXX"
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '6px' }}>Grade</label>
                                                    <input
                                                        type="text"
                                                        value={userForm.grade}
                                                        onChange={(e) => setUserForm({ ...userForm, grade: e.target.value })}
                                                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px' }}
                                                        placeholder="Class/Grade"
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '6px' }}>{userForm.role === 'Staff' ? 'Student Campus' : 'Child Campus'}</label>
                                                    {userForm.role === 'Staff' ? (
                                                        <select
                                                            value={userForm.childCampusId || ''}
                                                            onChange={(e) => setUserForm({ ...userForm, childCampusId: parseInt(e.target.value) || undefined })}
                                                            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', background: 'white' }}
                                                        >
                                                            <option value="">Select Student Campus</option>
                                                            {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                                                        </select>
                                                    ) : (
                                                        <div style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #F3F4F6', borderRadius: '12px', fontSize: '14px', background: '#F9FAFB', color: '#6B7280' }}>
                                                            {userForm.assignedCampus || 'Select Assigned Campus above'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Section 3: Professional & Contact */}
                                <section>
                                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', borderLeft: '4px solid #4B5563', paddingLeft: '12px' }}>Personal Information</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>Email Address</label>
                                            <input
                                                type="email"
                                                value={userForm.email}
                                                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px' }}
                                                placeholder="example@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>Aadhar Number</label>
                                            <input
                                                type="text"
                                                value={userForm.aadharNo}
                                                onChange={(e) => setUserForm({ ...userForm, aadharNo: e.target.value })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px' }}
                                                placeholder="12-digit Aadhar"
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>Residential Address</label>
                                            <textarea
                                                value={userForm.address}
                                                onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
                                                placeholder="Full postal address"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Section 4: Financial & Benefits */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
                                    {/* Bank Details */}
                                    <section style={{ background: '#F0F9FF', padding: '20px', borderRadius: '16px', border: '1px solid #E0F2FE' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Bank Information</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369A1', display: 'block', marginBottom: '4px' }}>Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={userForm.bankName}
                                                    onChange={(e) => setUserForm({ ...userForm, bankName: e.target.value })}
                                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #BAE6FD', borderRadius: '10px', fontSize: '13px' }}
                                                    placeholder="State Bank of India"
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369A1', display: 'block', marginBottom: '4px' }}>Account Number</label>
                                                    <input
                                                        type="text"
                                                        value={userForm.accountNumber}
                                                        onChange={(e) => setUserForm({ ...userForm, accountNumber: e.target.value })}
                                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #BAE6FD', borderRadius: '10px', fontSize: '13px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369A1', display: 'block', marginBottom: '4px' }}>IFSC Code</label>
                                                    <input
                                                        type="text"
                                                        value={userForm.ifscCode}
                                                        onChange={(e) => setUserForm({ ...userForm, ifscCode: e.target.value.toUpperCase() })}
                                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #BAE6FD', borderRadius: '10px', fontSize: '13px' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369A1', display: 'block', marginBottom: '4px' }}>Bank Details & Remarks</label>
                                                <input
                                                    type="text"
                                                    value={userForm.bankAccountDetails}
                                                    onChange={(e) => setUserForm({ ...userForm, bankAccountDetails: e.target.value })}
                                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #BAE6FD', borderRadius: '10px', fontSize: '13px' }}
                                                    placeholder="Branch or any other details"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Benefits Control */}
                                    <section style={{ background: '#FFF7ED', padding: '20px', borderRadius: '16px', border: '1px solid #FFEDD5' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Benefits & Incentives</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#9A3412', display: 'block', marginBottom: '4px' }}>Year Fee Benefit %</label>
                                                    <input
                                                        type="number"
                                                        value={userForm.yearFeeBenefitPercent}
                                                        onChange={(e) => setUserForm({ ...userForm, yearFeeBenefitPercent: parseFloat(e.target.value) || 0 })}
                                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #FED7AA', borderRadius: '10px', fontSize: '13px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#9A3412', display: 'block', marginBottom: '4px' }}>Loyalty Benefit %</label>
                                                    <input
                                                        type="number"
                                                        value={userForm.longTermBenefitPercent}
                                                        onChange={(e) => setUserForm({ ...userForm, longTermBenefitPercent: parseFloat(e.target.value) || 0 })}
                                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #FED7AA', borderRadius: '10px', fontSize: '13px' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#9A3412', display: 'block', marginBottom: '4px' }}>Benefit Status</label>
                                                <select
                                                    value={userForm.benefitStatus}
                                                    onChange={(e) => setUserForm({ ...userForm, benefitStatus: e.target.value as any })}
                                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #FED7AA', borderRadius: '10px', fontSize: '13px', background: 'white' }}
                                                >
                                                    <option value="Active">Active (Incentives Enabled)</option>
                                                    <option value="Pending">Pending Verification</option>
                                                    <option value="Suspended">On Hold</option>
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '1px dashed #FED7AA' }}>
                                                <input
                                                    type="checkbox"
                                                    id="isFiveStar"
                                                    checked={userForm.isFiveStarMember}
                                                    onChange={(e) => setUserForm({ ...userForm, isFiveStarMember: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="isFiveStar" style={{ fontSize: '14px', fontWeight: '700', color: '#C2410C', cursor: 'pointer' }}>Premium 5-Star Member</label>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Footer - Fixed */}
                            <div style={{ display: 'flex', gap: '16px', padding: '24px 32px', borderTop: '1px solid #F3F4F6', background: 'white', flexShrink: 0 }}>
                                <button
                                    onClick={() => { setShowAddUserModal(false); setEditingUser(null) }}
                                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1.5px solid #E5E7EB', background: 'white', fontWeight: '800', color: '#6B7280', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#F9FAFB'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={modalLoading}
                                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#111827', color: 'white', fontWeight: '800', cursor: modalLoading ? 'not-allowed' : 'pointer', opacity: modalLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {modalLoading ? 'Saving Info...' : editingUser ? 'Update Ambassador' : 'Register Ambassador'}
                                </button>
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

            {/* Data Import Modal */}
            {showBulkUploadModal && (
                <CSVUploader
                    onClose={() => setShowBulkUploadModal(false)}
                    type="users"
                    onUpload={handleBulkUpload as any}
                    userRole={currentUserRole}
                />
            )}

            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmation.isOpen}
                title="Delete User?"
                description={
                    <p>
                        Are you sure you want to delete <strong>{deleteConfirmation.userName}</strong>?
                        <br />
                        This will remove their access and all associated data.
                    </p>
                }
                confirmText="Yes, Delete User"
                variant="danger"
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
            />

            {/* Purge Confirm Dialog */}
            <ConfirmDialog
                isOpen={purgeConfirmation.isOpen}
                title="PURGE USER PERMANENTLY?"
                description={
                    <div className="space-y-4 text-red-600 font-medium">
                        <p>
                            DANGER: You are about to permanently purge <strong>{purgeConfirmation.userName}</strong>.
                        </p>
                        <p className="bg-red-50 p-3 rounded-lg text-xs">
                            This action will erase ALL their financial history, Lead data, and account records forever. This CANNOT be undone.
                        </p>
                    </div>
                }
                confirmText="Yes, Purge Permanently"
                variant="danger"
                onConfirm={confirmPurgeUser}
                onCancel={() => setPurgeConfirmation({ isOpen: false, userId: null, userName: '' })}
                isLoading={modalLoading}
            />
        </div>
    )
}
