'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, TrendingUp, Users, Target, Building2, DollarSign, BarChart3, Settings, X, Upload, Trash2, Star, Calendar, Bell, Shield, Database, GanttChartSquare, AlertTriangle, BookOpen, Check, Pencil, MessageSquare, Download, ShieldCheck, RefreshCw, Trophy, UserPlus, List, Wallet } from 'lucide-react'
import { getSystemSettings, updateSystemSettings } from '@/app/settings-actions'
import { getLeadSettings, updateLeadSettings } from '@/app/lead-actions'
import { getSecuritySettings, updateSecuritySettings, getRetentionSettings, updateRetentionSettings } from '@/app/security-actions'
import { getNotificationSettings, updateNotificationSettings } from '@/app/notification-actions'
import { getCampuses, updateCampus, addCampus, deleteCampus } from '@/app/campus-actions'
import { getBenefitSlabs, updateBenefitSlab, addBenefitSlab, deleteBenefitSlab } from '@/app/benefit-actions'
import { addUser, addAdmin, removeUser, deleteAdmin, bulkAddUsers, updateUserStatus, updateAdminStatus } from '@/app/superadmin-actions'
import { addStudent, updateStudent, bulkAddStudents } from '@/app/student-actions'
import { getRolePermissions, updateRolePermissions } from '@/app/permission-actions'
import { MarketingManager } from '@/components/MarketingManager'
import DashboardSettings from '@/components/DashboardSettings'
import {
    generateReferralPerformanceReport,
    generatePendingLeadsReport,
    generateMonthlyTrendsReport,
    generateInactiveUsersReport,
    generateTopPerformersReport,
    generateCampusDistributionReport,
    generateBenefitTierReport,
    generateNewRegistrationsReport,
    generateStaffVsParentReport,
    generateLeadPipelineReport
} from '@/app/report-actions'

interface SystemAnalytics {
    totalAmbassadors: number
    totalLeads: number
    totalConfirmed: number
    globalConversionRate: number
    totalCampuses: number
    systemWideBenefits: number
    totalStudents: number
    staffCount: number
    parentCount: number
}

interface CampusComparison {
    campus: string
    totalLeads: number
    confirmed: number
    pending: number
    conversionRate: number
    ambassadors: number
}

interface UserRecord {
    userId: number
    fullName: string
    mobileNumber: string
    role: string
    assignedCampus: string | null
    campusId: number | null
    grade: string | null
    studentFee: number
    status: string
    referralCount: number
    createdAt: string
}

interface AdminRecord {
    adminId: number
    adminName: string
    adminMobile: string
    role: string
    assignedCampus: string | null
    status: string
    createdAt: string
}

interface StudentRecord {
    studentId: number
    fullName: string
    parentId: number
    parent: { fullName: string; mobileNumber: string }
    campusId: number
    campus: { campusName: string }
    grade: string
    section: string | null
    rollNumber: string | null
    academicYear: string
    status: string
    baseFee: number
    discountPercent: number
    createdAt: string
}

interface Props {
    analytics: SystemAnalytics
    campusComparison: CampusComparison[]
    users: UserRecord[]
    admins: AdminRecord[]
    students: StudentRecord[]
    currentUser: any
    initialView?: string
    marketingAssets?: any[]
    systemSettings?: any
}

export default function SuperadminClient({ analytics, campusComparison, users, admins, students, initialView = 'analytics', marketingAssets = [], systemSettings = {} }: Props) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    // Filter states
    const [filterRole, setFilterRole] = useState<string>('All')
    const [filterCampus, setFilterCampus] = useState<string>('All')
    const [filterStatus, setFilterStatus] = useState<string>('All')
    const [filterGrade, setFilterGrade] = useState<string>('All')

    // Admin filter states
    const [adminFilterRole, setAdminFilterRole] = useState<string>('All')
    const [adminFilterCampus, setAdminFilterCampus] = useState<string>('All')
    const [adminFilterStatus, setAdminFilterStatus] = useState<string>('All')

    // Modal states
    const [showAddUserModal, setShowAddUserModal] = useState(false)
    const [showAddAdminModal, setShowAddAdminModal] = useState(false)
    const [showStudentModal, setShowStudentModal] = useState(false)
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)

    // Form states
    const [userForm, setUserForm] = useState({ fullName: '', mobileNumber: '', role: 'Parent' as 'Parent' | 'Staff', assignedCampus: '' })
    const [adminForm, setAdminForm] = useState({ adminName: '', adminMobile: '', role: 'CampusHead' as 'CampusHead' | 'CampusAdmin', assignedCampus: '' })
    const [studentForm, setStudentForm] = useState({
        fullName: '',
        parentId: '',
        campusId: '',
        grade: '',
        section: '',
        rollNumber: '',
        baseFee: 60000,
        discountPercent: 0,
        isNewParent: false,
        newParentName: '',
        newParentMobile: ''
    })
    const [editingStudent, setEditingStudent] = useState<any>(null)

    // Bulk upload state
    const [bulkUploadText, setBulkUploadText] = useState('')
    const [bulkUploadResult, setBulkUploadResult] = useState<{ added: number; failed: number; errors: string[] } | null>(null)

    // Map URL view param to internal view state
    const mapViewParam = (view: string): 'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash' => {
        if (view === 'users') return 'users'
        if (view === 'admins') return 'admins'
        if (view === 'campuses') return 'campuses'
        if (view === 'settings') return 'settings'
        if (view === 'reports') return 'reports'
        if (view === 'students') return 'students'
        if (view === 'settlements') return 'settlements'
        if (view === 'marketing') return 'marketing'
        if (view === 'audit') return 'audit'
        if (view === 'support') return 'support'
        if (view === 'permissions') return 'permissions'
        if (view === 'staff-dash') return 'staff-dash'
        if (view === 'parent-dash') return 'parent-dash'
        return 'analytics'
    }

    const [selectedView, setSelectedView] = useState<'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash'>(mapViewParam(initialView))

    // Unified Status & Settings States
    const [settingsState, setSettingsState] = useState<any>(systemSettings || null)
    const [campuses, setCampuses] = useState<any[]>([])
    const [leadSettings, setLeadSettings] = useState<any>(null)
    const [securitySettings, setSecuritySettings] = useState<any>(null)
    const [retentionSettings, setRetentionSettings] = useState<any>(null)
    const [notificationSettings, setNotificationSettings] = useState<any>(null)
    const [registrationEnabled, setRegistrationEnabled] = useState(true)
    const [loading, setLoading] = useState(false)
    const [slabs, setSlabs] = useState<any[]>([])

    // Module Specific States
    const [settlements, setSettlements] = useState<any[]>([])
    const [resources, setResources] = useState<any[]>([])
    const [activityLogs, setActivityLogs] = useState<any[]>([])
    const [supportTickets, setSupportTickets] = useState<any[]>([])
    const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, any>>({})

    // New Campus Modal State
    const [showCampusModal, setShowCampusModal] = useState(false)
    const [editingCampus, setEditingCampus] = useState<any>(null)
    const [campusForm, setCampusForm] = useState({
        campusName: '',
        campusCode: '',
        location: '',
        grades: '9-12',
        maxCapacity: 500,
        gradeFees: [] as Array<{ grade: string; annualFee: number }>
    })

    // Benefit Slab Modal/Edit State
    const [showBenefitModal, setShowBenefitModal] = useState(false)
    const [editingSlab, setEditingSlab] = useState<any>(null)
    const [slabForm, setSlabForm] = useState({
        tierName: '',
        referralCount: 1,
        yearFeeBenefitPercent: 10,
        longTermExtraPercent: 0,
        baseLongTermPercent: 0
    })

    // Sync view with URL params when they change
    useEffect(() => {
        const viewParam = searchParams.get('view') || 'analytics'
        setSelectedView(mapViewParam(viewParam))
    }, [searchParams])

    // Load all settings on mount
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [sys, cmp, lead, sec, ret, notif, slb] = await Promise.all([
                    getSystemSettings(),
                    getCampuses(),
                    getLeadSettings(),
                    getSecuritySettings(),
                    getRetentionSettings(),
                    getNotificationSettings(),
                    getBenefitSlabs()
                ])

                setSettingsState(sys)
                setRegistrationEnabled(sys.allowNewRegistrations)
                if (cmp.success && cmp.campuses) setCampuses(cmp.campuses)
                if (slb.success && slb.slabs) setSlabs(slb.slabs)
                setLeadSettings(lead)
                setSecuritySettings(sec)
                setRetentionSettings(ret)
                setNotificationSettings(notif)
            } catch (error) {
                console.error('Failed to load settings:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // New effect to load permissions matrix
    useEffect(() => {
        if (selectedView === 'permissions') {
            async function loadPermissions() {
                setLoading(true)
                try {
                    const roles = ['Super Admin', 'CampusHead', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent']
                    const results = await Promise.all(roles.map(role => getRolePermissions(role)))
                    const matrix: Record<string, any> = {}
                    roles.forEach((role, i) => {
                        if (results[i].success) matrix[role] = results[i].permissions
                    })
                    setRolePermissionsMatrix(matrix)
                } catch (err) {
                    console.error('Failed to load permissions matrix:', err)
                } finally {
                    setLoading(false)
                }
            }
            loadPermissions()
        }
    }, [selectedView])

    const handleToggleRegistration = async () => {
        setLoading(true)
        const newValue = !registrationEnabled
        const result = await updateSystemSettings({ allowNewRegistrations: newValue })
        if (result.success) {
            setRegistrationEnabled(newValue)
        } else {
            alert(result.error || 'Failed to update settings')
        }
        setLoading(false)
    }

    // Add User Handler
    const handleAddUser = async () => {
        if (!userForm.fullName || !userForm.mobileNumber) {
            alert('Please fill in all required fields')
            return
        }
        if (userForm.mobileNumber.length !== 10) {
            alert('Mobile number must be 10 digits')
            return
        }
        setModalLoading(true)
        const result = await addUser({
            fullName: userForm.fullName,
            mobileNumber: userForm.mobileNumber,
            role: userForm.role,
            assignedCampus: userForm.assignedCampus || undefined
        })
        setModalLoading(false)
        if (result.success) {
            setShowAddUserModal(false)
            setUserForm({ fullName: '', mobileNumber: '', role: 'Parent', assignedCampus: '' })
            router.refresh()
        } else {
            alert(result.error || 'Failed to add user')
        }
    }

    // Open Edit Student Modal
    const openEditModal = (student: any) => {
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
            alert('Please fill in required fields (Name, Campus, Grade)')
            return
        }

        if (studentForm.isNewParent) {
            if (!studentForm.newParentName || !studentForm.newParentMobile) {
                alert('Please enter New Parent Name and Mobile Number')
                return
            }
            if (studentForm.newParentMobile.length !== 10) {
                alert('Parent Mobile Number must be 10 digits')
                return
            }
        } else if (!studentForm.parentId) {
            alert('Please select a Parent')
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
            // router.refresh() // Rely on server action revalidate
        } else {
            alert(result.error || 'Failed to save student')
        }
    }

    // Add Admin Handler
    const handleAddAdmin = async () => {
        if (!adminForm.adminName || !adminForm.adminMobile || !adminForm.assignedCampus) {
            alert('Please fill in all required fields')
            return
        }
        if (adminForm.adminMobile.length !== 10) {
            alert('Mobile number must be 10 digits')
            return
        }
        setModalLoading(true)
        const result = await addAdmin({
            adminName: adminForm.adminName,
            adminMobile: adminForm.adminMobile,
            role: adminForm.role,
            assignedCampus: adminForm.assignedCampus
        })
        setModalLoading(false)
        if (result.success) {
            setShowAddAdminModal(false)
            setAdminForm({ adminName: '', adminMobile: '', role: 'CampusHead', assignedCampus: '' })
            router.refresh()
        } else {
            alert(result.error || 'Failed to add admin')
        }
    }

    // Delete User Handler
    const handleDeleteUser = async (userId: number, userName: string) => {
        if (!confirm(`Are you sure you want to delete "${userName}"? This will also delete all their referrals.`)) {
            return
        }
        const result = await removeUser(userId)
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error || 'Failed to delete user')
        }
    }

    // Toggle User Status Handler
    const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
        const result = await updateUserStatus(userId, newStatus as 'Active' | 'Inactive')
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error || 'Failed to update status')
        }
    }

    // Delete Admin Handler
    const handleDeleteAdmin = async (adminId: number, adminName: string) => {
        if (!confirm(`Are you sure you want to delete admin "${adminName}"?`)) {
            return
        }
        const result = await deleteAdmin(adminId)
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error || 'Failed to delete admin')
        }
    }

    // Toggle Admin Status Handler
    const handleToggleAdminStatus = async (adminId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
        const result = await updateAdminStatus(adminId, newStatus as 'Active' | 'Inactive')
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error || 'Failed to update admin status')
        }
    }

    // Campus Management Handlers
    const handleSaveCampus = async () => {
        if (!campusForm.campusName || !campusForm.campusCode || !campusForm.location) {
            alert('Please fill in required fields')
            return
        }
        setModalLoading(true)
        let result
        if (editingCampus) {
            result = await updateCampus(editingCampus.id, campusForm)
        } else {
            result = await addCampus(campusForm)
        }
        setModalLoading(false)
        if (result.success) {
            setShowCampusModal(false)
            setEditingCampus(null)
            setCampusForm({ campusName: '', campusCode: '', location: '', grades: '9-12', maxCapacity: 500, gradeFees: [] })
            // Re-fetch campuses
            const fresh = await getCampuses()
            if (fresh.success && fresh.campuses) setCampuses(fresh.campuses)
        } else {
            alert(result.error || 'Failed to save campus')
        }
    }

    const handleDeleteCampus = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete campus "${name}"?`)) return
        const result = await deleteCampus(id)
        if (result.success) {
            const fresh = await getCampuses()
            if (fresh.success && fresh.campuses) setCampuses(fresh.campuses)
        } else {
            alert(result.error || 'Failed to delete campus')
        }
    }

    // Benefit Slab Handlers
    const handleSaveSlab = async () => {
        if (!slabForm.tierName || slabForm.referralCount < 1) {
            alert('Invalid tier data')
            return
        }
        setModalLoading(true)
        let result
        if (editingSlab) {
            result = await updateBenefitSlab(editingSlab.slabId, slabForm)
        } else {
            result = await addBenefitSlab(slabForm)
        }
        setModalLoading(true) // Should be false but wait for finish
        setModalLoading(false)
        if (result.success) {
            setShowBenefitModal(false)
            setEditingSlab(null)
            const fresh = await getBenefitSlabs()
            if (fresh.success && fresh.slabs) setSlabs(fresh.slabs)
        } else {
            alert(result.error || 'Failed to save tier')
        }
    }

    // Settings Save Handlers
    const handleUpdateSystemSettings = async () => {
        if (!systemSettings) return
        setLoading(true)
        const result = await updateSystemSettings({
            currentAcademicYear: systemSettings.currentAcademicYear,
            defaultStudentFee: systemSettings.defaultStudentFee,
            allowNewRegistrations: registrationEnabled,
            maintenanceMode: systemSettings.maintenanceMode
        })
        setLoading(false)
        if (result) {
            alert('System settings updated successfully')
            setSystemSettings(result)
        }
    }

    const handleUpdateNotificationSettings = async () => {
        if (!notificationSettings) return
        setLoading(true)
        const result = await updateNotificationSettings(notificationSettings)
        setLoading(false)
        if (result) {
            alert('Notification preferences updated')
            setNotificationSettings(result)
        }
    }

    const handleUpdateLeadSettings = async () => {
        if (!leadSettings) return
        setLoading(true)
        const result = await updateLeadSettings(leadSettings)
        setLoading(false)
        if (result) {
            alert('Lead management rules updated')
            setLeadSettings(result)
        }
    }

    const handleUpdateSecuritySettings = async () => {
        if (!securitySettings) return
        setLoading(true)
        const result = await updateSecuritySettings(securitySettings)
        setLoading(false)
        if (result) {
            alert('Security settings updated')
            setSecuritySettings(result)
        }
    }

    const handleUpdateRetentionSettings = async () => {
        if (!retentionSettings) return
        setLoading(true)
        const result = await updateRetentionSettings(retentionSettings)
        setLoading(false)
        if (result) {
            alert('Data retention policy updated')
            setRetentionSettings(result)
        }
    }

    // Bulk Upload Handler
    const handleBulkUpload = async () => {
        if (!bulkUploadText.trim()) {
            alert('Please enter data')
            return
        }
        setModalLoading(true)
        setBulkUploadResult(null)

        if (selectedView === 'students') {
            // Parse Student CSV: Name, ParentMobile, Campus, Grade, Section, RollNo
            const lines = bulkUploadText.trim().split('\n')
            const studentsToAdd = []

            for (const line of lines) {
                const parts = line.split(',').map(p => p.trim())
                if (parts.length >= 4) {
                    studentsToAdd.push({
                        fullName: parts[0],
                        parentMobile: parts[1],
                        campusName: parts[2],
                        grade: parts[3],
                        section: parts[4],
                        rollNumber: parts[5]
                    })
                }
            }

            if (studentsToAdd.length === 0) {
                alert('No valid student data found. Require: Name, Mobile, Campus, Grade')
                setModalLoading(false)
                return
            }

            const result = await bulkAddStudents(studentsToAdd)
            setModalLoading(false)

            if (result.success) {
                setBulkUploadResult({ added: result.added, failed: result.failed, errors: result.errors || [] })
                if (result.added > 0) router.refresh()
            } else {
                alert(result.errors?.[0] || 'Failed to bulk upload')
            }

        } else {
            // Parse User CSV (format: fullName,mobileNumber,role,campus)
            const lines = bulkUploadText.trim().split('\n')
            const usersToAdd: Array<{ fullName: string; mobileNumber: string; role: 'Parent' | 'Staff'; assignedCampus?: string }> = []

            for (const line of lines) {
                const parts = line.split(',').map(p => p.trim())
                if (parts.length >= 2) {
                    const role = parts[2]?.toLowerCase() === 'staff' ? 'Staff' : 'Parent'
                    usersToAdd.push({
                        fullName: parts[0],
                        mobileNumber: parts[1],
                        role,
                        assignedCampus: parts[3] || undefined
                    })
                }
            }

            if (usersToAdd.length === 0) {
                alert('No valid user data found')
                setModalLoading(false)
                return
            }

            const result = await bulkAddUsers(usersToAdd)
            setModalLoading(false)

            if (result.success) {
                setBulkUploadResult({ added: result.added, failed: result.failed, errors: result.errors || [] })
                if (result.added > 0) {
                    router.refresh()
                }
            } else {
                alert(result.error || 'Failed to bulk upload')
            }
        }
    }

    // Download Report Handler
    const handleDownloadReport = async (reportFunction: () => Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>) => {
        const result = await reportFunction()
        if (result.success && result.csv && result.filename) {
            const blob = new Blob([result.csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.filename
            a.click()
            URL.revokeObjectURL(url)
        } else {
            alert(result.error || 'Failed to generate report')
        }
    }

    // Dynamic page titles based on selected view
    const pageConfig: Record<'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash', { title: string, subtitle: string }> = {
        analytics: { title: 'Analytics Overview', subtitle: 'System-wide performance metrics and insights' },
        campuses: { title: 'Campus Performance', subtitle: 'Detailed metrics and comparison across all campuses' },
        users: { title: 'User Management', subtitle: 'Manage registered users and their permissions' },
        admins: { title: 'Admin Management', subtitle: 'Manage administrators and their roles' },
        students: { title: 'Student Management', subtitle: 'Manage system-wide student records and academic context' },
        reports: { title: 'Reports', subtitle: 'Download system data reports in CSV format' },
        'settings': { title: 'System Settings', subtitle: 'Global configuration and defaults' },
        'staff-dash': { title: 'Staff Dashboard Ctrl', subtitle: 'Configure staff perspective and assets' },
        'parent-dash': { title: 'Parent Dashboard Ctrl', subtitle: 'Configure parent perspective and assets' },
        settlements: { title: 'Revenue & Settlements', subtitle: 'Track payouts and ambassador earnings' },
        marketing: { title: 'Marketing Kit', subtitle: 'Access marketing resources and digital kits' },
        audit: { title: 'Audit Trail', subtitle: 'System-wide activity logs and transparency' },
        support: { title: 'Support Desk', subtitle: 'Manage queries and ambassador support tickets' },
        permissions: { title: 'Permissions Matrix', subtitle: 'Dynamic module allotment for administrative roles' }
    }

    return (
        <>
            <div className="space-y-4">
                {/* Dynamic Header - Compact (Hidden for Dashboard Ctrls which have their own headers) */}
                {!['staff-dash', 'parent-dash'].includes(selectedView) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'white',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                        border: '1px solid rgba(229, 231, 235, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {selectedView === 'analytics' && (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
                                    <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', zIndex: 2 }}></div>
                                    <div style={{ position: 'absolute', width: '100%', height: '100%', background: '#10B981', borderRadius: '50%', animation: 'ripple 2s infinite', opacity: 0.4 }}></div>
                                </div>
                            )}
                            <div>
                                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                                    {pageConfig[selectedView].title}
                                </h1>
                                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '1px', fontWeight: '500' }}>
                                    {pageConfig[selectedView].subtitle}
                                </p>
                            </div>
                        </div>

                        <style>{`
                        @keyframes ripple {
                            0% { transform: scale(0.8); opacity: 0.5; }
                            100% { transform: scale(2.5); opacity: 0; }
                        }
                    `}</style>

                        {selectedView === 'analytics' && (
                            <button
                                onClick={() => router.refresh()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    background: '#F9FAFB',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#FFFFFF';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#F9FAFB';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                        )}
                    </div>
                )}

                {/* Analytics Overview View */}
                {selectedView === 'analytics' && (
                    <>
                        {/* Compact KPI Cards - Responsive Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                            {/* Ambassadors Card */}
                            <div
                                onClick={() => window.location.href = '/superadmin?view=users'}
                                style={{
                                    background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <Users size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                                    <Users size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Ambassadors</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                                    <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.totalAmbassadors}</p>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Active</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                    +12% vs last month
                                </div>
                            </div>

                            {/* Leads Card */}
                            <div
                                onClick={() => window.location.href = '/superadmin?view=campuses'}
                                style={{
                                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <MessageSquare size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                                    <MessageSquare size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Total Leads</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                                    <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.totalLeads}</p>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Entries</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                    +5.2% vs last month
                                </div>
                            </div>

                            {/* Confirmed Card */}
                            <div
                                onClick={() => window.location.href = '/superadmin?view=campuses'}
                                style={{
                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <TrendingUp size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                                    <TrendingUp size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Confirmed</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                                    <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.totalConfirmed}</p>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Admitted</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                    +8.1% vs last month
                                </div>
                            </div>

                            {/* Conversion Rate Card */}
                            <div
                                onClick={() => window.location.href = '/superadmin?view=campuses'}
                                style={{
                                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <BarChart3 size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                                    <BarChart3 size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Conversion</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                                    <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.globalConversionRate}%</p>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Rate</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                    Trending Up ↑
                                </div>
                            </div>

                            {/* Campuses Card */}
                            <div
                                onClick={() => window.location.href = '/superadmin?view=campuses'}
                                style={{
                                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <Building2 size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                                    <Building2 size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Campuses</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                                    <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.totalCampuses}</p>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Locations</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                    Stable Growth
                                </div>
                            </div>

                            {/* Benefits Card */}
                            <div
                                onClick={() => window.location.href = '/superadmin?view=users'}
                                style={{
                                    background: 'linear-gradient(135deg, #EC4899, #BE185D)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 20px -5px rgba(236, 72, 153, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <DollarSign size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                                    <DollarSign size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Benefits</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                                    <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>₹{(analytics.systemWideBenefits / 100000).toFixed(1)}L</p>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Total</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                    +15.4% Revenue
                                </div>
                            </div>
                        </div>

                        {/* Top Performers Leaderboard */}
                        <div style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid rgba(229, 231, 235, 0.5)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ padding: '8px', background: '#FEF3C7', borderRadius: '10px' }}>
                                    <Trophy size={20} color="#D97706" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Top Performing Campuses</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {campusComparison.slice(0, 5).map((campus, index) => {
                                    const isTop3 = index < 3;
                                    const badgeColors = [
                                        { bg: 'linear-gradient(135deg, #FDE68A, #F59E0B)', text: '#92400E', shadow: 'rgba(245, 158, 11, 0.4)' }, // Gold
                                        { bg: 'linear-gradient(135deg, #E5E7EB, #9CA3AF)', text: '#374151', shadow: 'rgba(156, 163, 175, 0.4)' }, // Silver
                                        { bg: 'linear-gradient(135deg, #FFEDD5, #EA580C)', text: '#9A3412', shadow: 'rgba(234, 88, 12, 0.4)' }, // Bronze
                                    ];

                                    return (
                                        <div
                                            key={campus.campus}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                padding: '16px',
                                                background: '#F9FAFB',
                                                borderRadius: '16px',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                border: '1px solid transparent',
                                                cursor: 'default'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = '#FFFFFF';
                                                e.currentTarget.style.borderColor = '#E5E7EB';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.05)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = '#F9FAFB';
                                                e.currentTarget.style.borderColor = 'transparent';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '14px',
                                                        fontWeight: '800',
                                                        background: isTop3 ? badgeColors[index].bg : '#F3F4F6',
                                                        color: isTop3 ? badgeColors[index].text : '#6B7280',
                                                        boxShadow: isTop3 ? `0 4px 10px ${badgeColors[index].shadow}` : 'none'
                                                    }}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: '700', color: '#1F2937', fontSize: '15px' }}>{campus.campus}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>{campus.ambassadors} Ambassadors</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>{campus.totalLeads}</div>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', color: campus.conversionRate >= 80 ? '#10B981' : campus.conversionRate >= 50 ? '#F59E0B' : '#EF4444' }}>
                                                        {campus.conversionRate}% Conv.
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '10px', overflow: 'hidden', marginTop: '4px' }}>
                                                <div
                                                    style={{
                                                        width: `${campus.conversionRate}%`,
                                                        height: '100%',
                                                        background: campus.conversionRate >= 80 ? 'linear-gradient(90deg, #10B981, #34D399)' : campus.conversionRate >= 50 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #EF4444, #F87171)',
                                                        borderRadius: '10px',
                                                        transition: 'width 1s ease-out'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* User Type Distribution */}
                        <div style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid rgba(229, 231, 235, 0.5)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ padding: '8px', background: '#DBEAFE', borderRadius: '10px' }}>
                                    <Users size={20} color="#2563EB" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>User Ecosystem</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                {/* Parents Distribution */}
                                <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Parents</span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#1E40AF', padding: '2px 8px', background: '#DBEAFE', borderRadius: '6px' }}>
                                            {analytics.totalAmbassadors > 0 ? Math.round((analytics.parentCount / analytics.totalAmbassadors) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E40AF' }}>{analytics.parentCount}</div>
                                    <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden', marginTop: '12px' }}>
                                        <div style={{ width: `${analytics.totalAmbassadors > 0 ? (analytics.parentCount / analytics.totalAmbassadors) * 100 : 0}%`, height: '100%', background: '#3B82F6', borderRadius: '10px' }} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>Primary group for student referrals</p>
                                </div>

                                {/* Staff Distribution */}
                                <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Staff Members</span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#92400E', padding: '2px 8px', background: '#FEF3C7', borderRadius: '6px' }}>
                                            {analytics.totalAmbassadors > 0 ? Math.round((analytics.staffCount / analytics.totalAmbassadors) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706' }}>{analytics.staffCount}</div>
                                    <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden', marginTop: '12px' }}>
                                        <div style={{ width: `${analytics.totalAmbassadors > 0 ? (analytics.staffCount / analytics.totalAmbassadors) * 100 : 0}%`, height: '100%', background: '#F59E0B', borderRadius: '10px' }} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>Internal advocates and campus staff</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Campus Performance View */}
                {selectedView === 'campuses' && (
                    <div className="space-y-6">
                        {/* Page Header */}
                        {/* Summary Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#B91C1C', margin: 0 }}>{campusComparison.length}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Total Campuses</p>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B', margin: 0 }}>{analytics.totalLeads}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Total Leads</p>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#10B981', margin: 0 }}>{analytics.totalConfirmed}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Confirmed</p>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#8B5CF6', margin: 0 }}>{analytics.globalConversionRate}%</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Avg Conversion</p>
                            </div>
                        </div>

                        {/* Lead Distribution Chart */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Lead Distribution by Campus</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {campusComparison.map((campus) => {
                                    const maxLeads = Math.max(...campusComparison.map(c => c.totalLeads))
                                    const widthPercent = (campus.totalLeads / maxLeads) * 100

                                    return (
                                        <div key={campus.campus}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: '500', fontSize: '13px' }}>{campus.campus}</span>
                                                <span style={{ fontSize: '13px', color: '#6B7280' }}>{campus.totalLeads} leads</span>
                                            </div>
                                            <div style={{ width: '100%', background: '#E5E7EB', borderRadius: '6px', height: '8px' }}>
                                                <div
                                                    style={{
                                                        width: `${widthPercent}%`,
                                                        background: 'linear-gradient(90deg, #DC2626, #EF4444)',
                                                        height: '8px',
                                                        borderRadius: '6px'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Campus Performance Table */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Campus Performance Details</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#F9FAFB' }}>
                                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Campus</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Total Leads</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Confirmed</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Pending</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Conversion</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Ambassadors</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campusComparison.map((campus, index) => (
                                            <tr key={campus.campus} style={{ background: index % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '14px 24px', fontWeight: '600', color: '#111827' }}>{campus.campus}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#374151', fontWeight: '600' }}>{campus.totalLeads}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{campus.confirmed}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#D97706', fontWeight: '500' }}>{campus.pending}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                                    <span style={{ display: 'inline-block', padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderRadius: '9999px', background: campus.conversionRate >= 80 ? '#D1FAE5' : campus.conversionRate >= 50 ? '#FEF3C7' : '#FEE2E2', color: campus.conversionRate >= 80 ? '#065F46' : campus.conversionRate >= 50 ? '#92400E' : '#B91C1C' }}>
                                                        {campus.conversionRate}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#374151', fontWeight: '500' }}>{campus.ambassadors}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* User Management View */}
                {selectedView === 'users' && (
                    <div className="space-y-4">
                        {/* Action Buttons Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap-reverse' }}>
                            <div style={{ flex: '1 1 100%', order: 1 }} className="md:hidden"></div>
                            <div style={{ flex: 1 }} className="hidden md:block"></div>
                            <button
                                onClick={() => { setShowAddUserModal(true) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: 'linear-gradient(135deg, #CC0000, #EF4444)', color: 'white',
                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add User
                            </button>
                            <button
                                onClick={() => { setBulkUploadText(''); setBulkUploadResult(null); setShowBulkUploadModal(true) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: '#F3F4F6', color: '#374151',
                                    border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Bulk Upload
                            </button>
                            <button
                                onClick={() => alert('Select users from table to remove')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: 'white', color: '#DC2626',
                                    border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                            </button>
                        </div>

                        {/* Summary Stats & Search Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 calc(25% - 8px)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={18} style={{ color: '#DC2626' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Total Users</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 calc(25% - 8px)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={18} style={{ color: '#0284C7' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.filter(u => u.role === 'Staff').length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Staff Members</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 calc(25% - 8px)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Star size={18} style={{ color: '#D97706' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.filter(u => u.role === 'Parent').length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Parents</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 calc(25% - 8px)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendingUp size={18} style={{ color: '#059669' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.filter(u => u.status === 'Active').length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Active Users</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 100%', display: 'flex', alignItems: 'center', minWidth: '200px' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, mobile, or campus..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px 8px 32px',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                            <Filter size={16} style={{ color: '#6B7280' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Filters:</span>

                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Roles</option>
                                <option value="Parent">Parent</option>
                                <option value="Staff">Staff</option>
                            </select>

                            <select
                                value={filterCampus}
                                onChange={(e) => setFilterCampus(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Campuses</option>
                                <option value="ASM-VILLIANUR(9-12)">ASM-VILLIANUR(9-12)</option>
                                <option value="ASM-VILLIANUR(MONT-8)">ASM-VILLIANUR(MONT-8)</option>
                                <option value="ASM-VILLUPURAM">ASM-VILLUPURAM</option>
                                <option value="ASM-ALAPAKKAM">ASM-ALAPAKKAM</option>
                                <option value="ADYAR">ADYAR</option>
                                <option value="AKLAVYA-RP">AKLAVYA-RP</option>
                                <option value="KKNAGAR">KKNAGAR</option>
                                <option value="VALASARAVAKKAM">VALASARAVAKKAM</option>
                            </select>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>

                            <button
                                onClick={() => { setFilterRole('All'); setFilterCampus('All'); setFilterStatus('All'); }}
                                style={{
                                    marginLeft: 'auto',
                                    padding: '6px 12px',
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>

                        {/* Users Table */}
                        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderLeft: '4px solid #FEE2E2' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ width: '70px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                            <th style={{ width: '150px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</th>
                                            <th style={{ width: '120px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile</th>
                                            <th style={{ width: '80px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                                            <th style={{ width: '140px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus</th>
                                            <th style={{ width: '100px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grade</th>
                                            <th style={{ width: '100px', padding: '14px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year Fee</th>
                                            <th style={{ width: '80px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referrals</th>
                                            <th style={{ width: '80px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ width: '100px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toggle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users
                                            .filter((user) => {
                                                const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    user.mobileNumber.includes(searchQuery)
                                                const matchesRole = filterRole === 'All' || user.role === filterRole
                                                const matchesCampus = filterCampus === 'All' || user.assignedCampus === filterCampus
                                                const matchesStatus = filterStatus === 'All' || user.status === filterStatus
                                                return matchesSearch && matchesRole && matchesCampus && matchesStatus
                                            })
                                            .map((user) => (
                                                <tr key={user.userId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>#{user.userId}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{user.fullName}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{user.mobileNumber}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#F3E8FF', color: '#7C3AED' }}>{user.role}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{user.assignedCampus || campuses.find(c => c.id === user.campusId)?.campusName || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{user.grade || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', textAlign: 'right', fontWeight: '600' }}>₹{(user.studentFee || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', textAlign: 'center', fontWeight: '600' }}>{user.referralCount}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: user.status === 'Active' ? '#D1FAE5' : '#F3F4F6', color: user.status === 'Active' ? '#065F46' : '#6B7280' }}>{user.status}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleToggleUserStatus(user.userId, user.status)}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 14px',
                                                                background: user.status === 'Active' ? '#D1FAE5' : '#FEE2E2',
                                                                color: user.status === 'Active' ? '#065F46' : '#B91C1C',
                                                                border: `1px solid ${user.status === 'Active' ? '#A7F3D0' : '#FECACA'}`,
                                                                borderRadius: '20px', fontSize: '12px',
                                                                fontWeight: '600', cursor: 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title={`Click to ${user.status === 'Active' ? 'deactivate' : 'activate'}`}
                                                        >
                                                            <span style={{
                                                                width: '8px', height: '8px', borderRadius: '50%',
                                                                background: user.status === 'Active' ? '#10B981' : '#EF4444'
                                                            }}></span>
                                                            {user.status === 'Active' ? 'Active' : 'Inactive'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Management View */}
                {selectedView === 'admins' && (
                    <div className="space-y-4">
                        {/* Action Buttons Row - Flex Wrap */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setShowAddAdminModal(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: '#DC2626', color: 'white',
                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Admin
                            </button>
                            <button
                                onClick={() => { setAdminForm({ ...adminForm, role: 'CampusHead' }); setShowAddAdminModal(true) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: '#059669', color: 'white',
                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Campus Head
                            </button>
                            <button
                                onClick={() => alert('Bulk Upload feature coming soon!')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: '#F3F4F6', color: '#374151',
                                    border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Bulk Upload
                            </button>
                            <button
                                onClick={() => alert('Select admin from table to remove')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: 'white', color: '#DC2626',
                                    border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                            </button>
                        </div>

                        {/* Summary Stats Row - Compact */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Target size={18} style={{ color: '#D97706' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{admins.length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Total Admins</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={18} style={{ color: '#DC2626' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{admins.filter(a => a.role.includes('CampusHead')).length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Campus Heads</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={18} style={{ color: '#2563EB' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{new Set(admins.map(a => a.assignedCampus).filter(Boolean)).size}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Campuses Covered</p>
                                </div>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                            <Filter size={16} style={{ color: '#6B7280' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Filters:</span>

                            <select
                                value={adminFilterRole}
                                onChange={(e) => setAdminFilterRole(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Roles</option>
                                <option value="Super Admin">Super Admin</option>
                                <option value="CampusHead">Campus Head</option>
                                <option value="CampusAdmin">Campus Admin</option>
                                <option value="Admission Admin">Admission Admin</option>
                            </select>

                            <select
                                value={adminFilterCampus}
                                onChange={(e) => setAdminFilterCampus(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Campuses</option>
                                <option value="ASM-VILLIANUR(9-12)">ASM-VILLIANUR(9-12)</option>
                                <option value="ASM-VILLIANUR(MONT-8)">ASM-VILLIANUR(MONT-8)</option>
                                <option value="ASM-VILLUPURAM">ASM-VILLUPURAM</option>
                                <option value="ASM-ALAPAKKAM">ASM-ALAPAKKAM</option>
                                <option value="ADYAR">ADYAR</option>
                                <option value="AKLAVYA-RP">AKLAVYA-RP</option>
                                <option value="KKNAGAR">KKNAGAR</option>
                                <option value="VALASARAVAKKAM">VALASARAVAKKAM</option>
                            </select>

                            <select
                                value={adminFilterStatus}
                                onChange={(e) => setAdminFilterStatus(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>

                            <button
                                onClick={() => { setAdminFilterRole('All'); setAdminFilterCampus('All'); setAdminFilterStatus('All'); }}
                                style={{
                                    marginLeft: 'auto',
                                    padding: '6px 12px',
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>

                        {/* Admins Table */}
                        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ width: '80px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                            <th style={{ width: '180px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Name</th>
                                            <th style={{ width: '120px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile</th>
                                            <th style={{ width: '120px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                                            <th style={{ width: '140px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus</th>
                                            <th style={{ width: '90px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ width: '100px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toggle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {admins
                                            .filter((admin) => {
                                                const matchesRole = adminFilterRole === 'All' || admin.role === adminFilterRole
                                                const matchesCampus = adminFilterCampus === 'All' || admin.assignedCampus === adminFilterCampus
                                                const matchesStatus = adminFilterStatus === 'All' || (admin.status || 'Active') === adminFilterStatus
                                                return matchesRole && matchesCampus && matchesStatus
                                            })
                                            .map((admin) => (
                                                <tr key={admin.adminId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>#{admin.adminId}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{admin.adminName}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{admin.adminMobile}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            borderRadius: '9999px',
                                                            background: admin.role === 'Super Admin' ? '#FEE2E2' : admin.role.includes('CampusHead') ? '#DBEAFE' : '#F3F4F6',
                                                            color: admin.role === 'Super Admin' ? '#B91C1C' : admin.role.includes('CampusHead') ? '#1E40AF' : '#6B7280'
                                                        }}>
                                                            {admin.role}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{admin.assignedCampus || '-'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: (admin.status || 'Active') === 'Active' ? '#D1FAE5' : '#F3F4F6', color: (admin.status || 'Active') === 'Active' ? '#065F46' : '#6B7280' }}>
                                                            {admin.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleToggleAdminStatus(admin.adminId, admin.status || 'Active')}
                                                            disabled={admin.role === 'Super Admin'}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 14px',
                                                                background: (admin.status || 'Active') === 'Active' ? '#D1FAE5' : '#FEE2E2',
                                                                color: (admin.status || 'Active') === 'Active' ? '#065F46' : '#B91C1C',
                                                                border: `1px solid ${(admin.status || 'Active') === 'Active' ? '#A7F3D0' : '#FECACA'}`,
                                                                borderRadius: '20px', fontSize: '12px',
                                                                fontWeight: '600',
                                                                cursor: admin.role === 'Super Admin' ? 'not-allowed' : 'pointer',
                                                                opacity: admin.role === 'Super Admin' ? 0.5 : 1,
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title={admin.role === 'Super Admin' ? 'Cannot change Super Admin status' : `Click to ${(admin.status || 'Active') === 'Active' ? 'deactivate' : 'activate'}`}
                                                        >
                                                            <span style={{
                                                                width: '8px', height: '8px', borderRadius: '50%',
                                                                background: (admin.status || 'Active') === 'Active' ? '#10B981' : '#EF4444'
                                                            }}></span>
                                                            {(admin.status || 'Active') === 'Active' ? 'Active' : 'Inactive'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student Management View */}
                {selectedView === 'students' && (
                    <div className="space-y-4">
                        {/* Action Buttons Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap-reverse' }}>
                            <div style={{ flex: '1 1 100%', order: 1 }} className="md:hidden"></div>
                            <div style={{ flex: 1 }} className="hidden md:block"></div>
                            <button
                                onClick={() => { setEditingStudent(null); setShowStudentModal(true) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white',
                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Student
                            </button>
                            <button
                                onClick={() => { setBulkUploadText(''); setBulkUploadResult(null); setShowBulkUploadModal(true) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', background: '#F3F4F6', color: '#374151',
                                    border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Bulk Upload
                            </button>
                        </div>

                        {/* Summary Stats & Search Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 calc(50% - 5px)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={18} style={{ color: '#2563EB' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{students.length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Total Students</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 calc(50% - 5px)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={18} style={{ color: '#059669' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{students.filter(s => s.status === 'Active').length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Active Students</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flex: '1 1 100%', display: 'flex', alignItems: 'center', minWidth: '200px' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by student, parent, or roll number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px 8px 32px',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                            <Filter size={16} style={{ color: '#6B7280' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Filters:</span>

                            <select
                                value={filterCampus}
                                onChange={(e) => setFilterCampus(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Campuses</option>
                                <option value="ASM-VILLIANUR(9-12)">ASM-VILLIANUR(9-12)</option>
                                <option value="ASM-VILLIANUR(MONT-8)">ASM-VILLIANUR(MONT-8)</option>
                                <option value="ASM-VILLUPURAM">ASM-VILLUPURAM</option>
                                <option value="ASM-ALAPAKKAM">ASM-ALAPAKKAM</option>
                                <option value="ADYAR">ADYAR</option>
                                <option value="AKLAVYA-RP">AKLAVYA-RP</option>
                                <option value="KKNAGAR">KKNAGAR</option>
                                <option value="VALASARAVAKKAM">VALASARAVAKKAM</option>
                            </select>

                            <select
                                value={filterGrade}
                                onChange={(e) => setFilterGrade(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="All">All Grades</option>
                                <option value="Grade 12">Grade 12</option>
                                <option value="Grade 11">Grade 11</option>
                                <option value="Grade 10">Grade 10</option>
                                <option value="Grade 9">Grade 9</option>
                                <option value="Pre-KG">Pre-KG</option>
                                <option value="LKG">LKG</option>
                                <option value="UKG">UKG</option>
                            </select>

                            <button
                                onClick={() => { setFilterCampus('All'); setFilterGrade('All'); setSearchQuery(''); }}
                                style={{
                                    marginLeft: 'auto',
                                    padding: '6px 12px',
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>

                        {/* Students Table */}
                        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ width: '60px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                            <th style={{ width: '180px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Name</th>
                                            <th style={{ width: '150px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parent</th>
                                            <th style={{ width: '140px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus</th>
                                            <th style={{ width: '100px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grade</th>
                                            <th style={{ width: '90px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</th>
                                            <th style={{ width: '90px', padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll No</th>
                                            <th style={{ width: '80px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ width: '80px', padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {students
                                            .filter((student) => {
                                                const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    student.parent.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    (student.rollNumber && student.rollNumber.includes(searchQuery))
                                                const matchesCampus = filterCampus === 'All' || student.campus.campusName === filterCampus
                                                const matchesGrade = filterGrade === 'All' || student.grade === filterGrade
                                                return matchesSearch && matchesCampus && matchesGrade
                                            })
                                            .map((student) => (
                                                <tr key={student.studentId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>#{student.studentId}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>
                                                                {student.fullName[0]}
                                                            </div>
                                                            {student.fullName}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                                                        <p style={{ margin: 0, fontWeight: '500' }}>{student.parent.fullName}</p>
                                                        <p style={{ margin: 0, fontSize: '11px', color: '#6B7280' }}>{student.parent.mobileNumber}</p>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.campus.campusName}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.grade}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.section || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.rollNumber || '-'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: student.status === 'Active' ? '#D1FAE5' : '#F3F4F6', color: student.status === 'Active' ? '#065F46' : '#6B7280' }}>{student.status}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => openEditModal(student)}
                                                            style={{ padding: '6px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: '#4B5563' }}
                                                            title="Edit Student"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                                {students.length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                                        <p>No students found. Confirm leads to add students.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings View */}
                {selectedView === 'settings' && (
                    <div className="space-y-5">
                        {/* Registration Settings Card */}
                        <div style={{ background: 'white', padding: '28px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl" style={{ color: '#111827' }}>Registration Settings</h3>
                                    <p className="text-sm text-gray-500 mt-1">Control new user signup access</p>
                                </div>
                            </div>

                            {/* Registration Toggle - Redesigned */}
                            <div style={{
                                padding: '24px',
                                borderRadius: '12px',
                                border: '2px solid',
                                borderColor: registrationEnabled ? '#10B981' : '#EF4444',
                                background: registrationEnabled ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.1))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.1))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '24px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            background: registrationEnabled ? '#10B981' : '#EF4444',
                                            boxShadow: registrationEnabled ? '0 0 0 3px rgba(16, 185, 129, 0.2)' : '0 0 0 3px rgba(239, 68, 68, 0.2)'
                                        }}></div>
                                        <h4 className="font-bold text-lg" style={{ color: '#111827' }}>Allow New User Registrations</h4>
                                    </div>
                                    <p className="text-sm" style={{ color: '#6B7280', marginBottom: '12px' }}>
                                        Enable or disable new user signup on the login page
                                    </p>
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        background: registrationEnabled ? '#D1FAE5' : '#FEE2E2',
                                        display: 'inline-block'
                                    }}>
                                        <span className="text-sm font-bold" style={{ color: registrationEnabled ? '#065F46' : '#991B1B' }}>
                                            {registrationEnabled ? '✓ Currently Enabled' : '✗ Currently Disabled'}
                                        </span>
                                    </div>
                                </div>

                                {/* Big Toggle Switch */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <button
                                        onClick={handleToggleRegistration}
                                        disabled={loading}
                                        style={{
                                            position: 'relative',
                                            width: '80px',
                                            height: '40px',
                                            borderRadius: '20px',
                                            background: registrationEnabled ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                                            border: 'none',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: registrationEnabled ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(239, 68, 68, 0.4)',
                                            opacity: loading ? 0.6 : 1
                                        }}
                                    >
                                        <span style={{
                                            position: 'absolute',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'white',
                                            top: '4px',
                                            left: registrationEnabled ? '44px' : '4px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px'
                                        }}>
                                            {registrationEnabled ? '✓' : '✗'}
                                        </span>
                                    </button>
                                    <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                                        Click to {registrationEnabled ? 'Disable' : 'Enable'}
                                    </span>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                borderRadius: '10px',
                                background: '#F9FAFB',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div className="flex items-start gap-3">
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: '#3B82F6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}>i</div>
                                    <p className="text-sm" style={{ color: '#374151', lineHeight: '1.6' }}>
                                        <strong>Note:</strong> When registration is disabled, only existing users will be able to login. New mobile numbers will see an error message and cannot create accounts.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Role Permissions Card */}
                        <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">Role Permissions</h3>
                                    <p className="text-sm text-gray-500 mt-1">Configure module access for each admin role</p>
                                </div>
                                <button
                                    onClick={() => alert('Permission editing feature coming soon! For now, permissions are view-only.')}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Settings size={16} />
                                    Edit Permissions
                                </button>
                            </div>

                            {/* Permission Matrix Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full" style={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Module</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Super Admin</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Campus Head</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Admission Admin</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Campus Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Analytics Overview</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#D1FAE5', color: '#065F46' }}>Full Access</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Campus Only</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#DBEAFE', color: '#1E40AF' }}>View Only</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Campus Only</span></td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>User Management</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#D1FAE5', color: '#065F46' }}>Full CRUD</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Campus CRUD</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#DBEAFE', color: '#1E40AF' }}>View Only</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Campus CRUD</span></td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Admin Management</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#D1FAE5', color: '#065F46' }}>Full CRUD</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#DBEAFE', color: '#1E40AF' }}>View Only</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#F3F4F6', color: '#6B7280' }}>No Access</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#F3F4F6', color: '#6B7280' }}>No Access</span></td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Campus Performance</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#D1FAE5', color: '#065F46' }}>All Campuses</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Assigned Only</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#DBEAFE', color: '#1E40AF' }}>View Only</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Assigned Only</span></td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Reports</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#D1FAE5', color: '#065F46' }}>All Reports</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Campus Reports</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#DBEAFE', color: '#1E40AF' }}>Lead Reports</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#FEF3C7', color: '#92400E' }}>Campus Reports</span></td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Settings</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#D1FAE5', color: '#065F46' }}>Full Access</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#F3F4F6', color: '#6B7280' }}>No Access</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#F3F4F6', color: '#6B7280' }}>No Access</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: '#F3F4F6', color: '#6B7280' }}>No Access</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Legend */}
                            <div className="mt-6 p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                <h4 className="font-semibold text-sm mb-3">Permission Levels:</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></span>
                                        <span><strong>Full Access/CRUD:</strong> Create, Read, Update, Delete</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }}></span>
                                        <span><strong>Campus Only:</strong> Limited to assigned campus</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6' }}></span>
                                        <span><strong>View Only:</strong> Read-only access</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#9CA3AF' }}></span>
                                        <span><strong>No Access:</strong> Cannot view module</span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Note */}
                            <div className="mt-4 p-4 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3B82F6' }}>
                                <p className="text-sm" style={{ color: '#1E40AF' }}>
                                    <strong>ℹ️ Note:</strong> These permissions are enforced both in the UI and server-side for security. Campus-scoped roles only see data from their assigned campus.
                                </p>
                            </div>
                        </div>

                        {/* Campus Management Card */}
                        <div style={{ background: 'white', padding: '28px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl" style={{ color: '#111827' }}>Campus Management</h3>
                                    <p className="text-sm text-gray-500 mt-1">Manage campus locations and settings</p>
                                </div>
                                <button
                                    onClick={() => alert('Add Campus feature coming soon!')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Campus
                                </button>
                            </div>

                            {/* Campus Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full" style={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Campus Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Code</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Grades</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Capacity</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campuses.map((campus) => (
                                            <tr key={campus.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{campus.campusName}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#4B5563' }}>{campus.campusCode}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#4B5563' }}>{campus.grades}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#4B5563' }}>{campus.currentEnrollment}/{campus.maxCapacity}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', background: campus.isActive ? '#D1FAE5' : '#FEE2F2', color: campus.isActive ? '#065F46' : '#991B1B' }}>
                                                        {campus.isActive ? 'Active' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCampus(campus)
                                                                setCampusForm({
                                                                    campusName: campus.campusName,
                                                                    campusCode: campus.campusCode,
                                                                    location: campus.location,
                                                                    grades: campus.grades,
                                                                    maxCapacity: campus.maxCapacity,
                                                                    gradeFees: campus.gradeFees || []
                                                                })
                                                                setShowCampusModal(true)
                                                            }}
                                                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', color: '#3B82F6', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCampus(campus.id, campus.campusName)}
                                                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', color: '#EF4444', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {campuses.length === 0 && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                        <Building2 size={48} style={{ color: '#D1D5DB' }} />
                                                        <p style={{ fontSize: '14px', fontWeight: '500' }}>No campuses configured yet</p>
                                                        <p style={{ fontSize: '13px' }}>Click "Add Campus" to create your first campus</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Info Box */}
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                borderRadius: '10px',
                                background: '#F9FAFB',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div className="flex items-start gap-3">
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: '#3B82F6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}>i</div>
                                    <p className="text-sm" style={{ color: '#374151', lineHeight: '1.6' }}>
                                        <strong>Tip:</strong> Add all your campus locations here. You can assign Campus Heads to specific campuses and track enrollment capacity.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Benefit Tier Configuration Card */}
                        <div style={{ background: 'white', padding: '28px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl" style={{ color: '#111827' }}>Benefit Tier Configuration</h3>
                                    <p className="text-sm text-gray-500 mt-1">Configure reward percentages based on referral performance</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingSlab(null)
                                        setSlabForm({ tierName: '', referralCount: 1, yearFeeBenefitPercent: 10, longTermExtraPercent: 0, baseLongTermPercent: 0 })
                                        setShowBenefitModal(true)
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Star size={16} fill="white" />
                                    Add New Tier
                                </button>
                            </div>

                            {/* Benefit Tiers Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full" style={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Tier Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Min Referrals</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Year Fee Benefit</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Long Term Bonus</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slabs.map((slab) => (
                                            <tr key={slab.slabId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                                                    <div className="flex items-center gap-2">
                                                        <Star size={14} fill="#F59E0B" color="#F59E0B" />
                                                        {slab.tierName}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#4B5563' }}>{slab.referralCount} Referrals</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', background: '#FEF3C7', color: '#92400E' }}>{slab.yearFeeBenefitPercent}%</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', background: '#DBEAFE', color: '#1E40AF' }}>+{slab.longTermExtraPercent}%</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingSlab(slab)
                                                            setSlabForm({
                                                                tierName: slab.tierName,
                                                                referralCount: slab.referralCount,
                                                                yearFeeBenefitPercent: slab.yearFeeBenefitPercent,
                                                                longTermExtraPercent: slab.longTermExtraPercent,
                                                                baseLongTermPercent: slab.baseLongTermPercent
                                                            })
                                                            setShowBenefitModal(true)
                                                        }}
                                                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', color: '#3B82F6', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Info Box */}
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                borderRadius: '10px',
                                background: '#FFFBEB',
                                border: '1px solid #FEF3C7'
                            }}>
                                <div className="flex items-start gap-3">
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: '#F59E0B',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}>!</div>
                                    <p className="text-sm" style={{ color: '#92400E', lineHeight: '1.6' }}>
                                        <strong>Rules:</strong> Year Fee Benefit applies to the current academic year. Long Term Bonus is added to the base 15% long-term benefit for "5 Star" level ambassadors.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Academic Year Settings Card */}
                        <div style={{ background: 'white', padding: '28px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl" style={{ color: '#111827' }}>Academic Year Settings</h3>
                                    <p className="text-sm text-gray-500 mt-1">Configure current cycle and fee structure</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Academic Year Select */}
                                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Calendar size={20} style={{ color: '#2563EB' }} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Current Academic Year</h4>
                                            <p className="text-xs text-gray-500">Affects benefit eligibility</p>
                                        </div>
                                    </div>
                                    <select
                                        value={systemSettings?.currentAcademicYear || '2025-2026'}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, currentAcademicYear: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '14px' }}
                                    >
                                        <option value="2024-2025">2024-2025</option>
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2026-2027">2026-2027</option>
                                    </select>
                                </div>

                                {/* Default Fee Setting */}
                                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <DollarSign size={20} style={{ color: '#059669' }} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Default Student Fee</h4>
                                            <p className="text-xs text-gray-500">Base fee for benefit calc</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                                        <input
                                            type="number"
                                            value={systemSettings?.defaultStudentFee || 60000}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, defaultStudentFee: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '10px 10px 10px 30px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleUpdateSystemSettings}
                                    disabled={loading}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'linear-gradient(135deg, #111827, #374151)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Save System Settings'}
                                </button>
                            </div>

                            {/* Warning Box */}
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                borderRadius: '10px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0'
                            }}>
                                <div className="flex items-start gap-3">
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: '#64748B',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}>?</div>
                                    <p className="text-sm" style={{ color: '#475569', lineHeight: '1.6' }}>
                                        Changing the <strong>Academic Year</strong> will reset the "Active Year" check for all ambassadors. Ambassadors must be active in the selected year to receive benefits.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification Preferences Card */}
                        <div style={{ background: 'white', padding: '28px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl" style={{ color: '#111827' }}>Notification Preferences</h3>
                                    <p className="text-sm text-gray-500 mt-1">Manage system alerts and communication channels</p>
                                </div>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Bell size={24} style={{ color: '#3B82F6' }} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Channel Toggles */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold">Email Alerts</span>
                                            <div
                                                onClick={() => setNotificationSettings({ ...notificationSettings, emailNotifications: !notificationSettings?.emailNotifications })}
                                                style={{ width: '40px', height: '22px', background: notificationSettings?.emailNotifications ? '#3B82F6' : '#D1D5DB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', left: notificationSettings?.emailNotifications ? '20px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">Monthly reports & activity</p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold">SMS Alerts</span>
                                            <div
                                                onClick={() => setNotificationSettings({ ...notificationSettings, smsNotifications: !notificationSettings?.smsNotifications })}
                                                style={{ width: '40px', height: '22px', background: notificationSettings?.smsNotifications ? '#3B82F6' : '#D1D5DB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', left: notificationSettings?.smsNotifications ? '20px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">Critical system notices</p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold">WhatsApp</span>
                                            <div
                                                onClick={() => setNotificationSettings({ ...notificationSettings, whatsappNotifications: !notificationSettings?.whatsappNotifications })}
                                                style={{ width: '40px', height: '22px', background: notificationSettings?.whatsappNotifications ? '#22C55E' : '#D1D5DB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', left: notificationSettings?.whatsappNotifications ? '20px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">Lead updates & reminders</p>
                                    </div>
                                </div>

                                {/* Automation Settings */}
                                <div style={{ padding: '24px', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <TrendingUp size={16} style={{ color: '#3B82F6' }} />
                                        Automation & Reminders
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Lead Follow-up Reminders</p>
                                                    <p className="text-xs text-gray-500">Auto-remind ambassadors to follow up with leads</p>
                                                </div>
                                                <div
                                                    onClick={() => setNotificationSettings({ ...notificationSettings, leadFollowupReminders: !notificationSettings?.leadFollowupReminders })}
                                                    style={{ width: '40px', height: '22px', background: notificationSettings?.leadFollowupReminders ? '#3B82F6' : '#D1D5DB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', left: notificationSettings?.leadFollowupReminders ? '20px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                                <div>
                                                    <p className="text-sm font-medium">Reminder Frequency</p>
                                                    <p className="text-xs text-gray-500">Days between follow-up reminders</p>
                                                </div>
                                                <select
                                                    value={notificationSettings?.reminderFrequencyDays || 3}
                                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderFrequencyDays: parseInt(e.target.value) })}
                                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                                                >
                                                    <option value={2}>Every 2 Days</option>
                                                    <option value={3}>Every 3 Days</option>
                                                    <option value={5}>Every 5 Days</option>
                                                    <option value={7}>Every 7 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports View */}
                {selectedView === 'reports' && (
                    <div className="space-y-6">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            {/* Users Report */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #EF4444, #B91C1C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Users size={22} color="white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">All Users Report</h3>
                                        <p className="text-xs text-gray-500">{users.length} total users</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-5 leading-relaxed">Export all registered ambassadors, parents, and staff with full details.</p>
                                <button
                                    onClick={() => {
                                        const headers = ['User ID', 'Full Name', 'Mobile', 'Role', 'Campus', 'Referrals', 'Status', 'Created']
                                        const rows = users.map(u => [u.userId, u.fullName, u.mobileNumber, u.role, u.assignedCampus || '-', u.referralCount, u.status, new Date(u.createdAt).toLocaleDateString()])
                                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
                                        const blob = new Blob([csv], { type: 'text/csv' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = 'users_report.csv'
                                        a.click()
                                    }}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #EF4444, #B91C1C)', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> Download CSV
                                </button>
                            </div>

                            {/* Campus Performance Report */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={22} color="white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Campus Analytics</h3>
                                        <p className="text-xs text-gray-500">{campuses.length} campuses</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-5 leading-relaxed">Detailed metrics for each campus including conversion rates and enrollments.</p>
                                <button
                                    onClick={() => {
                                        const headers = ['Campus', 'Total Leads', 'Confirmed', 'Pending', 'Conversion Rate', 'Ambassadors']
                                        const rows = campusComparison.map(c => [c.campus, c.totalLeads, c.confirmed, c.pending, c.conversionRate + '%', c.ambassadors])
                                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
                                        const blob = new Blob([csv], { type: 'text/csv' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = 'campus_performance.csv'
                                        a.click()
                                    }}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> Download CSV
                                </button>
                            </div>

                            {/* Admin Management Report */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={22} color="white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Admin Directory</h3>
                                        <p className="text-xs text-gray-500">{admins.length} administrators</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-5 leading-relaxed">Full list of campus heads and admission admins with assigned locations.</p>
                                <button
                                    onClick={() => {
                                        const headers = ['Admin ID', 'Name', 'Mobile', 'Role', 'Assigned Campus', 'Status']
                                        const rows = admins.map(a => [a.adminId, a.adminName, a.adminMobile, a.role, a.assignedCampus || '-', a.status])
                                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
                                        const blob = new Blob([csv], { type: 'text/csv' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = 'admins_report.csv'
                                        a.click()
                                    }}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> Download CSV
                                </button>
                            </div>

                            {/* Lead Pipeline Report */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TrendingUp size={22} color="white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Full Pipeline</h3>
                                        <p className="text-xs text-gray-500">All lifecycle stages</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-5 leading-relaxed">Export the entire lead lifecycle from initial referral to final admission.</p>
                                <button
                                    onClick={async () => {
                                        setLoading(true)
                                        const res = await generateLeadPipelineReport()
                                        setLoading(false)
                                        if (res.success && res.csv) {
                                            const blob = new Blob([res.csv], { type: 'text/csv' })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = res.filename || 'lead_pipeline.csv'
                                            a.click()
                                        }
                                    }}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> Download CSV
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Revenue & Settlements View */}
                {selectedView === 'settlements' && (
                    <div className="space-y-4">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Total Payouts</p>
                                <p style={{ fontSize: '24px', fontWeight: '800', color: '#111827' }}>₹{settlements.reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}</p>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Pending</p>
                                <p style={{ fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>₹{settlements.filter(s => s.status === 'Pending').reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontWeight: '700' }}>Recent Settlements</h3>
                                <button style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Export for Bank</button>
                            </div>
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                                <DollarSign size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                <p>No settlement records found. Process benefits to see them here.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Marketing Kit View */}
                {selectedView === 'marketing' && (
                    <MarketingManager assets={marketingAssets} />
                )}

                {/* Audit Trail View */}
                {selectedView === 'audit' && (
                    <div className="space-y-4">
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#F9FAFB' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Timestamp</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Admin</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Action</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                                            <Database size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                            <p>Activity logs will appear as admins perform actions.</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Staff Dashboard Control */}
                {selectedView === 'staff-dash' && (
                    <DashboardSettings
                        type="staff"
                        initialSettings={{
                            welcomeMessage: (settingsState || {}).staffWelcomeMessage,
                            referralText: (settingsState || {}).staffReferralText
                        }}
                    />
                )}

                {/* Parent Dashboard Control */}
                {selectedView === 'parent-dash' && (
                    <DashboardSettings
                        type="parent"
                        initialSettings={{
                            welcomeMessage: (settingsState || {}).parentWelcomeMessage,
                            referralText: (settingsState || {}).parentReferralText
                        }}
                    />
                )}

                {/* Support Desk View */}
                {selectedView === 'support' && (
                    <div className="space-y-4">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            {['Open', 'In-Progress', 'Resolved'].map(status => (
                                <div key={status} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                    <p style={{ fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>{status} Tickets</p>
                                    <p style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px' }}>0</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                                <MessageSquare size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                <p>No active support cases. Ambassadors are happy!</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Permissions Matrix View */}
                {selectedView === 'permissions' && (
                    <div className="space-y-6">
                        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontWeight: '800', color: '#111827' }}>Access Control Matrix</h3>
                                    <p style={{ fontSize: '12px', color: '#6B7280' }}>Manage which roles can access specific dashboard modules and their data scope.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={async () => {
                                            setLoading(true)
                                            try {
                                                const roles = Object.keys(rolePermissionsMatrix)
                                                const results = await Promise.all(roles.map(role => updateRolePermissions(role, rolePermissionsMatrix[role])))

                                                const failures = results.filter(r => !r.success)
                                                if (failures.length > 0) {
                                                    alert(`Failed to save some permissions: ${failures.map(f => f.error).join(', ')}`)
                                                } else {
                                                    alert('Permissions saved successfully! Changes will reflect on refresh.')
                                                }
                                            } catch (err) {
                                                alert('Failed to save permissions')
                                            } finally {
                                                setLoading(false)
                                            }
                                        }}
                                        disabled={loading}
                                        style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #111827, #374151)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        {loading ? 'Saving...' : 'Save All Changes'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', background: 'white', width: '250px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' }}>Module / Capability</span>
                                            </th>
                                            {['Super Admin', 'CampusHead', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent'].map(role => (
                                                <th key={role} style={{ padding: '16px 24px', textAlign: 'center', background: 'white' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{role}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ background: '#F9FAFB' }}>
                                            <td colSpan={7} style={{ padding: '12px 24px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Admin Dashboard Modules</span>
                                            </td>
                                        </tr>
                                        {[
                                            { key: 'analytics', label: 'Analytics Overview', icon: BarChart3 },
                                            { key: 'userManagement', label: 'User Management', icon: Users },
                                            { key: 'studentManagement', label: 'Student Management', icon: BookOpen },
                                            { key: 'adminManagement', label: 'Admin Management', icon: ShieldCheck },
                                            { key: 'campusPerformance', label: 'Campus Performance', icon: Building2 },
                                            { key: 'reports', label: 'Reports & Exports', icon: Download },
                                            { key: 'settlements', label: 'Revenue & Settlements', icon: DollarSign },
                                            { key: 'marketingKit', label: 'Marketing Kit', icon: Database },
                                            { key: 'auditLog', label: 'Audit Trail', icon: GanttChartSquare },
                                            { key: 'supportDesk', label: 'Support Desk', icon: MessageSquare },
                                            { key: 'settings', label: 'System Settings', icon: Settings },
                                        ].map((module, idx) => (
                                            <tr key={module.key} style={{ background: idx % 2 === 0 ? 'white' : '#F9FAFB', borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', color: '#6B7280' }}>
                                                            <module.icon size={16} />
                                                        </div>
                                                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{module.label}</span>
                                                    </div>
                                                </td>
                                                {['Super Admin', 'CampusHead', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent'].map(role => {
                                                    const perm = rolePermissionsMatrix[role]?.[module.key]
                                                    if (!perm) return <td key={role} style={{ textAlign: 'center' }}>-</td>

                                                    return (
                                                        <td key={role} style={{ padding: '16px 24px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                                <div
                                                                    onClick={() => {
                                                                        const newMatrix = { ...rolePermissionsMatrix }
                                                                        newMatrix[role][module.key].access = !perm.access
                                                                        setRolePermissionsMatrix({ ...newMatrix })
                                                                    }}
                                                                    style={{ width: '40px', height: '22px', background: perm.access ? '#10B981' : '#D1D5DB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                >
                                                                    <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', left: perm.access ? '20px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                                                </div>

                                                                {perm.access && (
                                                                    <select
                                                                        value={perm.scope}
                                                                        onChange={(e) => {
                                                                            const newMatrix = { ...rolePermissionsMatrix }
                                                                            newMatrix[role][module.key].scope = e.target.value
                                                                            setRolePermissionsMatrix({ ...newMatrix })
                                                                        }}
                                                                        style={{ padding: '2px 4px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #D1D5DB', background: 'white', textTransform: 'uppercase' }}
                                                                    >
                                                                        <option value="all">Global</option>
                                                                        <option value="campus">Campus</option>
                                                                        <option value="view-only">View</option>
                                                                    </select>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}

                                        <tr style={{ background: '#F9FAFB' }}>
                                            <td colSpan={7} style={{ padding: '12px 24px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Ambassador Portal Modules</span>
                                            </td>
                                        </tr>
                                        {[
                                            { key: 'referralSubmission', label: 'Referral Submission', icon: UserPlus },
                                            { key: 'referralTracking', label: 'Referral Tracking', icon: List },
                                            { key: 'savingsCalculator', label: 'Savings Calculator', icon: Wallet },
                                            { key: 'rulesAccess', label: 'Rules & Guidelines', icon: BookOpen },
                                        ].map((module, idx) => (
                                            <tr key={module.key} style={{ background: idx % 2 === 0 ? 'white' : '#F9FAFB', borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', color: '#6B7280' }}>
                                                            <module.icon size={16} />
                                                        </div>
                                                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{module.label}</span>
                                                    </div>
                                                </td>
                                                {['Super Admin', 'CampusHead', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent'].map(role => {
                                                    const perm = rolePermissionsMatrix[role]?.[module.key]
                                                    if (!perm) return <td key={role} style={{ textAlign: 'center' }}>-</td>

                                                    return (
                                                        <td key={role} style={{ padding: '16px 24px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                                <div
                                                                    onClick={() => {
                                                                        const newMatrix = { ...rolePermissionsMatrix }
                                                                        newMatrix[role][module.key].access = !perm.access
                                                                        setRolePermissionsMatrix({ ...newMatrix })
                                                                    }}
                                                                    style={{ width: '40px', height: '22px', background: perm.access ? '#10B981' : '#D1D5DB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                >
                                                                    <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', left: perm.access ? '20px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                                                </div>

                                                                {perm.access && (
                                                                    <select
                                                                        value={perm.scope}
                                                                        onChange={(e) => {
                                                                            const newMatrix = { ...rolePermissionsMatrix }
                                                                            newMatrix[role][module.key].scope = e.target.value
                                                                            setRolePermissionsMatrix({ ...newMatrix })
                                                                        }}
                                                                        style={{ padding: '2px 4px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #D1D5DB', background: 'white', textTransform: 'uppercase' }}
                                                                    >
                                                                        <option value="all">Global</option>
                                                                        <option value="campus">Campus</option>
                                                                        <option value="self">Self Only</option>
                                                                        <option value="view-only">View</option>
                                                                    </select>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard Control Views */}
                {(selectedView === 'staff-dash' || selectedView === 'parent-dash') && (
                    <div className="space-y-6 animate-fade-in">
                        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 4px 25px rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(to right, #ffffff, #f9fafb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                                        {selectedView === 'staff-dash' ? 'Staff Experience Control' : 'Parent Experience Control'}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#6B7280' }}>
                                        Customize what {selectedView === 'staff-dash' ? 'staff members' : 'parents'} see on their 5-Star Ambassador dashboard.
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        setLoading(true)
                                        const res = await updateSystemSettings({
                                            staffReferralText: selectedView === 'staff-dash' ? systemSettings.staffReferralText : undefined,
                                            parentReferralText: selectedView === 'parent-dash' ? systemSettings.parentReferralText : undefined,
                                            staffWelcomeMessage: selectedView === 'staff-dash' ? systemSettings.staffWelcomeMessage : undefined,
                                            parentWelcomeMessage: selectedView === 'parent-dash' ? systemSettings.parentWelcomeMessage : undefined,
                                        })
                                        if (res.success) alert('Dashboard settings updated!')
                                        else alert('Failed to update: ' + res.error)
                                        setLoading(false)
                                    }}
                                    style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #CC0000, #EF4444)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                                >
                                    {loading ? 'Saving...' : 'Save All Changes'}
                                </button>
                            </div>

                            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                {/* Configuration Panel */}
                                <div className="space-y-6">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#4B5563', marginBottom: '8px', textTransform: 'uppercase' }}>Dashboard Welcome Title</label>
                                        <input
                                            type="text"
                                            value={selectedView === 'staff-dash' ? (systemSettings?.staffWelcomeMessage || '') : (systemSettings?.parentWelcomeMessage || '')}
                                            onChange={(e) => {
                                                const field = selectedView === 'staff-dash' ? 'staffWelcomeMessage' : 'parentWelcomeMessage'
                                                setSystemSettings({ ...systemSettings, [field]: e.target.value })
                                            }}
                                            placeholder="e.g. Welcome to the Staff Ambassador Dashboard"
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '14px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#4B5563', marginBottom: '8px', textTransform: 'uppercase' }}>Social Share (WhatsApp) Text</label>
                                        <textarea
                                            rows={5}
                                            value={selectedView === 'staff-dash' ? (systemSettings?.staffReferralText || '') : (systemSettings?.parentReferralText || '')}
                                            onChange={(e) => {
                                                const field = selectedView === 'staff-dash' ? 'staffReferralText' : 'parentReferralText'
                                                setSystemSettings({ ...systemSettings, [field]: e.target.value })
                                            }}
                                            placeholder="The message that will be pre-filled when they click Share..."
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '14px', resize: 'vertical' }}
                                        />
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Use <code>{'{referralLink}'}</code> as a placeholder for the user's specific link.</p>
                                    </div>

                                    <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Shield size={18} color="#CC0000" />
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B' }}>Real-time Sync</p>
                                                <p style={{ fontSize: '12px', color: '#B91C1C', opacity: 0.8 }}>Changes saved here will immediately reflect for all {selectedView === 'staff-dash' ? 'staff members' : 'parents'}.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Panel */}
                                <div style={{ background: '#F9FAFB', borderRadius: '16px', border: '1px solid #F3F4F6', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></div>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }}></div>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', marginLeft: 'auto' }}>Preview Mode</span>
                                    </div>
                                    <div style={{ padding: '24px', opacity: 0.9 }}>
                                        <h1 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>{selectedView === 'staff-dash' ? systemSettings?.staffWelcomeMessage : systemSettings?.parentWelcomeMessage}</h1>

                                        <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                <div style={{ padding: '6px', background: '#FEE2E2', borderRadius: '6px' }}><Star size={14} color="#CC0000" /></div>
                                                <span style={{ fontSize: '12px', fontWeight: '700' }}>Quick Actions</span>
                                            </div>
                                            <div style={{ padding: '12px', background: '#CC0000', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: '700' }}>
                                                Share on WhatsApp
                                            </div>
                                            <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '10px', textAlign: 'center' }}>
                                                Preview of the pre-filled text:<br />
                                                <span style={{ fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
                                                    "{(selectedView === 'staff-dash' ? systemSettings?.staffReferralText : systemSettings?.parentReferralText)?.replace('{referralLink}', 'https://achariya.in/ref-demo')}"
                                                </span>
                                            </p>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                                <p style={{ fontSize: '20px', fontWeight: '800' }}>42</p>
                                                <p style={{ fontSize: '10px', color: '#6B7280' }}>Confirmed Referrals</p>
                                            </div>
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                                <p style={{ fontSize: '20px', fontWeight: '800' }}>₹12k</p>
                                                <p style={{ fontSize: '10px', color: '#6B7280' }}>Est. Savings</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Add User Modal */}
            {
                showAddUserModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Add New User</h3>
                                <button onClick={() => setShowAddUserModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                                    <input
                                        type="text"
                                        value={userForm.fullName}
                                        onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                                    <input
                                        type="tel"
                                        value={userForm.mobileNumber}
                                        onChange={(e) => setUserForm({ ...userForm, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="10 digit mobile number"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Role *</label>
                                    <select
                                        value={userForm.role}
                                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'Parent' | 'Staff' })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="Parent">Parent</option>
                                        <option value="Staff">Staff</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Assigned Campus</label>
                                    <input
                                        type="text"
                                        value={userForm.assignedCampus}
                                        onChange={(e) => setUserForm({ ...userForm, assignedCampus: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Campus name (optional)"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setShowAddUserModal(false)}
                                        style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddUser}
                                        disabled={modalLoading}
                                        style={{ flex: 1, padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        {modalLoading ? 'Adding...' : 'Add User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Admin Modal */}
            {
                showAddAdminModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Add New Admin</h3>
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
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Role *</label>
                                    <select
                                        value={adminForm.role}
                                        onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as 'CampusHead' | 'CampusAdmin' })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="CampusHead">Campus Head</option>
                                        <option value="CampusAdmin">Campus Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Assigned Campus *</label>
                                    <input
                                        type="text"
                                        value={adminForm.assignedCampus}
                                        onChange={(e) => setAdminForm({ ...adminForm, assignedCampus: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Campus name"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setShowAddAdminModal(false)}
                                        style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddAdmin}
                                        disabled={modalLoading}
                                        style={{ flex: 1, padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        {modalLoading ? 'Adding...' : 'Add Admin'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Upload Modal */}
            {
                showBulkUploadModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{selectedView === 'students' ? 'Bulk Upload Students' : 'Bulk Upload Users'}</h3>
                                <button onClick={() => setShowBulkUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '16px', padding: '12px', background: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                                <p style={{ fontSize: '12px', color: '#0369A1', margin: 0, fontWeight: '500' }}>
                                    {selectedView === 'students' ? (
                                        <>
                                            📋 Format: One student per line<br />
                                            <span style={{ fontFamily: 'monospace' }}>StudentName, ParentMobile, Campus, Grade, [Section], [RollNo]</span><br />
                                            <span style={{ color: '#6B7280' }}>Example: Rahul, 9876543210, ASM-VILLUPURAM, Grade 10, A, 101</span>
                                        </>
                                    ) : (
                                        <>
                                            📋 Format: One user per line<br />
                                            <span style={{ fontFamily: 'monospace' }}>FullName, MobileNumber, Role, Campus</span><br />
                                            <span style={{ color: '#6B7280' }}>Example: John Doe, 9876543211, Parent, Chennai</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <textarea
                                    value={bulkUploadText}
                                    onChange={(e) => setBulkUploadText(e.target.value)}
                                    placeholder={selectedView === 'students'
                                        ? "Paste student data here...\nRahul, 9876543210, ASM-VILLUPURAM, Grade 10, A, 101\nPriya, 9876543211, ADYAR, Grade 5"
                                        : "Paste user data here...\nJane Smith, 9876543211, Parent, Chennai\nMike Johnson, 9876543212, Staff, Bangalore"}
                                    style={{
                                        width: '100%',
                                        minHeight: '150px',
                                        padding: '12px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontFamily: 'monospace',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {bulkUploadResult && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: bulkUploadResult.added > 0 ? '#D1FAE5' : '#FEE2E2', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: bulkUploadResult.added > 0 ? '#065F46' : '#B91C1C' }}>
                                        ✓ Added: {bulkUploadResult.added} | ✗ Failed: {bulkUploadResult.failed}
                                    </p>
                                    {bulkUploadResult.errors.length > 0 && (
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#B91C1C' }}>
                                            {bulkUploadResult.errors.slice(0, 5).map((err, i) => (
                                                <div key={i}>• {err}</div>
                                            ))}
                                            {bulkUploadResult.errors.length > 5 && <div>...and {bulkUploadResult.errors.length - 5} more</div>}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowBulkUploadModal(false)}
                                    style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={modalLoading}
                                    style={{ flex: 1, padding: '10px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <Upload size={16} />
                                    {modalLoading ? 'Uploading...' : 'Upload Users'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

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
                            </div>

                            <div style={{ height: '1px', background: '#E5E7EB', margin: '20px 0' }}></div>

                            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Grade-wise Annual Fees</h3>
                                <div className="space-y-3">
                                    {[
                                        "Pre-KG", "LKG", "UKG",
                                        "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
                                        "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
                                        "Grade 11", "Grade 12"
                                    ].map((grade) => {
                                        const currentFee = campusForm.gradeFees.find(gf => gf.grade === grade)?.annualFee || 60000
                                        return (
                                            <div key={grade} className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                                <span className="text-xs font-bold text-gray-700">{grade}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-xs font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={currentFee}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0
                                                            const exist = campusForm.gradeFees.find(gf => gf.grade === grade)
                                                            let newFees
                                                            if (exist) {
                                                                newFees = campusForm.gradeFees.map(gf => gf.grade === grade ? { ...gf, annualFee: val } : gf)
                                                            } else {
                                                                newFees = [...campusForm.gradeFees, { grade, annualFee: val }]
                                                            }
                                                            setCampusForm({ ...campusForm, gradeFees: newFees })
                                                        }}
                                                        style={{ width: '100px', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', textAlign: 'right', fontWeight: 'bold' }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowCampusModal(false)}
                                    style={{ flex: 1, padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCampus}
                                    disabled={modalLoading}
                                    style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #2563EB, #1E40AF)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    {modalLoading ? 'Saving...' : editingCampus ? 'Update Campus' : 'Add Campus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

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
                                            {users.filter(u => u.role === 'Parent').map((u, i) => (
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
                                            <option key={`${c.campusId}-${i}`} value={c.campusId}>{c.campusName}</option>
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
                                        {['Pre-KG', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
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

            {/* Benefit Tier Modal */}
            {
                showBenefitModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                                    {editingSlab ? 'Edit Benefit Tier' : 'Add Benefit Tier'}
                                </h2>
                                <button onClick={() => setShowBenefitModal(false)} style={{ color: '#9CA3AF', cursor: 'pointer', background: 'none', border: 'none' }}><X size={24} /></button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Tier Name</label>
                                    <input
                                        type="text"
                                        value={slabForm.tierName}
                                        onChange={(e) => setSlabForm({ ...slabForm, tierName: e.target.value })}
                                        placeholder="e.g. Platinum (5 Stars)"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Min Referrals</label>
                                        <input
                                            type="number"
                                            value={slabForm.referralCount}
                                            onChange={(e) => setSlabForm({ ...slabForm, referralCount: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Year Fee Benefit %</label>
                                        <input
                                            type="number"
                                            value={slabForm.yearFeeBenefitPercent}
                                            onChange={(e) => setSlabForm({ ...slabForm, yearFeeBenefitPercent: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Base LT Bonus %</label>
                                        <input
                                            type="number"
                                            value={slabForm.baseLongTermPercent}
                                            onChange={(e) => setSlabForm({ ...slabForm, baseLongTermPercent: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Extra LT Bonus %</label>
                                        <input
                                            type="number"
                                            value={slabForm.longTermExtraPercent}
                                            onChange={(e) => setSlabForm({ ...slabForm, longTermExtraPercent: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBenefitModal(false)}
                                    style={{ flex: 1, padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSlab}
                                    disabled={modalLoading}
                                    style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    {modalLoading ? 'Saving...' : editingSlab ? 'Update Tier' : 'Add Tier'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </>
    )
}
