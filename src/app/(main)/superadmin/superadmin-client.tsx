'use client'

import { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Filter, TrendingUp, Users, Target, Building2, DollarSign, BarChart3, Settings, X, Upload, Trash2, Star, Calendar, Bell, Shield, Database, GanttChartSquare, AlertTriangle, BookOpen, Check, Pencil, MessageSquare, Download, ShieldCheck, RefreshCw, Trophy, UserPlus, List, Wallet, Edit, Trash } from 'lucide-react'
import { getSystemSettings, updateSystemSettings } from '@/app/settings-actions'
import { getLeadSettings, updateLeadSettings } from '@/app/lead-actions'
import { getSecuritySettings, updateSecuritySettings, getRetentionSettings, updateRetentionSettings } from '@/app/security-actions'
import { getNotificationSettings, updateNotificationSettings } from '@/app/notification-actions'
import { getCampuses, updateCampus, addCampus, deleteCampus } from '@/app/campus-actions'
import { getBenefitSlabs, updateBenefitSlab, addBenefitSlab, deleteBenefitSlab } from '@/app/benefit-actions'
import { addUser, addAdmin, removeUser, deleteAdmin, bulkAddUsers, updateUserStatus, updateAdminStatus, getSystemAnalytics, getUserGrowthTrend, getCampusComparison, getCampusDetails } from '@/app/superadmin-actions'
import { addStudent, updateStudent, bulkAddStudents } from '@/app/student-actions'
import { getRolePermissions, updateRolePermissions } from '@/app/permission-actions'
import { MarketingManager } from '@/components/MarketingManager'
import DashboardSettings from '@/components/DashboardSettings'
import CSVUploader from '@/components/CSVUploader'
import { CampusBarChart, ConversionFunnelChart, GrowthTrendChart, GenericPieChart } from '@/components/analytics/analytics-components'
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

// Modular Components (Dynamic for performance)
import { StatsCards } from '@/components/superadmin/StatsCards'
import { UserTable } from '@/components/superadmin/UserTable'
import { AdminTable } from '@/components/superadmin/AdminTable'
import { StudentTable } from '@/components/superadmin/StudentTable'
// import { CampusManagementTable } from '@/components/superadmin/CampusManagementTable'
import { CampusPerformanceTable } from '@/components/superadmin/CampusPerformanceTable'
import { ReportsPanel } from '@/components/superadmin/ReportsPanel'

const CampusManagementTable = dynamic(() => import('../../../components/superadmin/CampusManagementTable').then(m => m.CampusManagementTable), { ssr: false, loading: () => <div className="h-64 w-full animate-pulse bg-gray-100 rounded-lg" /> })
const PermissionsMatrix = dynamic(() => import('@/components/superadmin/PermissionsMatrix').then(m => m.PermissionsMatrix), { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-gray-100 rounded-lg" /> })
const BenefitSlabTable = dynamic(() => import('@/components/superadmin/BenefitSlabTable').then(m => m.BenefitSlabTable), { ssr: false })
const AuditTrailTable = dynamic(() => import('@/components/superadmin/AuditTrailTable').then(m => m.AuditTrailTable), { ssr: false })

import { User, Student, ReferralLead, RolePermissions, SystemAnalytics, CampusPerformance, Admin, Campus, SystemSettings, MarketingAsset, BulkStudentData, BulkUserData } from '@/types'

interface Props {
    analytics: SystemAnalytics
    campusComparison: CampusPerformance[]
    users: User[]
    admins: Admin[]
    students: Student[]
    currentUser: User | Admin
    initialView?: string
    marketingAssets?: MarketingAsset[]
    systemSettings?: SystemSettings
    growthTrend: { date: string; users: number }[]
    urgentTicketCount?: number
}

export default function SuperadminClient({ analytics, campusComparison = [], users = [], admins = [], students = [], initialView = 'analytics', marketingAssets = [],
    systemSettings,
    growthTrend = [],
    urgentTicketCount = 0
}: Props) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    // Campus Drill-down State
    const [selectedCampus, setSelectedCampus] = useState<string | null>(null)
    const [campusDetails, setCampusDetails] = useState<{ topAmbassadors: any[], recentLeads: any[] } | null>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)

    const handleCampusClick = async (campusName: string) => {
        setSelectedCampus(campusName)
        setDetailsLoading(true)
        setCampusDetails(null)
        try {
            const res = await getCampusDetails(campusName)
            if (res.success) {
                setCampusDetails({ topAmbassadors: res.topAmbassadors || [], recentLeads: res.recentLeads || [] })
            } else {
                toast.error('Failed to load campus details')
            }
        } catch (error) {
            toast.error('Error loading details')
        } finally {
            setDetailsLoading(false)
        }
    }

    // Analytics State
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all')
    const [analyticsData, setAnalyticsData] = useState(analytics)
    const [trendData, setTrendData] = useState(growthTrend)
    const [campusCompData, setCampusCompData] = useState(campusComparison)
    const [isRefreshing, startTransition] = useTransition()

    const handleTimeRangeChange = async (range: '7d' | '30d' | 'all') => {
        setTimeRange(range)
        startTransition(async () => {


            const [newAnalytics, newTrend, newComp] = await Promise.all([
                getSystemAnalytics(range),
                getUserGrowthTrend(range),
                getCampusComparison(range)
            ])
            setAnalyticsData(newAnalytics)
            setTrendData(newTrend)
            setCampusCompData(newComp)
        })
    }

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
    const [bulkUploadType, setBulkUploadType] = useState<'students' | 'users' | null>(null)

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

    // Settings View State
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'leads' | 'security' | 'notifications'>('general')
    const [isTableExpanded, setIsTableExpanded] = useState(false)

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
        if (selectedView === 'permissions' || selectedView === 'settings') { // Added settings to trigger load for PermissionsMatrix component
            const loadPermissions = async () => {
                setLoading(true)
                try {
                    const roles = ['Super Admin', 'Campus Head', 'Finance Admin', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent']
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

    // Urgent Ticket Alert
    useEffect(() => {
        if (urgentTicketCount > 0) {
            toast.error(`⚠️ ACTION REQUIRED: ${urgentTicketCount} tickets have escalated to Level 4 (Urgent).`, {
                duration: Infinity,
                action: {
                    label: 'View Tickets',
                    onClick: () => router.push('/tickets')
                }
            })
        }
    }, [urgentTicketCount, router])

    const handleToggleRegistration = async () => {
        setLoading(true)
        const newValue = !registrationEnabled
        const result = await updateSystemSettings({ allowNewRegistrations: newValue })
        if (result.success) {
            setRegistrationEnabled(newValue)
        } else {
            toast.error(result.error || 'Failed to update settings')
        }
        setLoading(false)
    }

    // Add User Handler
    const handleAddUser = async () => {
        if (!userForm.fullName || !userForm.mobileNumber) {
            toast.error('Please fill in all required fields')
            return
        }
        if (userForm.mobileNumber.length !== 10) {
            toast.error('Mobile number must be 10 digits')
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
            toast.error(result.error || 'Failed to add user')
        }
    }

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
            // router.refresh() // Rely on server action revalidate
        } else {
            toast.error(result.error || 'Failed to save student')
        }
    }

    // Add Admin Handler
    const handleAddAdmin = async () => {
        if (!adminForm.adminName || !adminForm.adminMobile || !adminForm.assignedCampus) {
            toast.error('Please fill in all required fields')
            return
        }
        if (adminForm.adminMobile.length !== 10) {
            toast.error('Mobile number must be 10 digits')
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
            toast.error(result.error || 'Failed to add admin')
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
            toast.error(result.error || 'Failed to delete user')
        }
    }

    // Toggle User Status Handler
    const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
        const result = await updateUserStatus(userId, newStatus as 'Active' | 'Inactive')
        if (result.success) {
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to update status')
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
            toast.error(result.error || 'Failed to delete admin')
        }
    }

    // Toggle Admin Status Handler
    const handleToggleAdminStatus = async (adminId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
        const result = await updateAdminStatus(adminId, newStatus as 'Active' | 'Inactive')
        if (result.success) {
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to update admin status')
        }
    }

    // Campus Management Handlers
    const handleSaveCampus = async () => {
        if (!campusForm.campusName || !campusForm.campusCode || !campusForm.location) {
            toast.error('Please fill in required fields')
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
            toast.error(result.error || 'Failed to save campus')
        }
    }

    const handleDeleteCampus = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete campus "${name}"?`)) return
        const result = await deleteCampus(id)
        if (result.success) {
            const fresh = await getCampuses()
            if (fresh.success && fresh.campuses) setCampuses(fresh.campuses)
        } else {
            toast.error(result.error || 'Failed to delete campus')
        }
    }

    // Benefit Slab Handlers
    const handleSaveSlab = async () => {
        if (!slabForm.tierName || slabForm.referralCount < 1) {
            toast.error('Invalid tier data')
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
            toast.error(result.error || 'Failed to save tier')
        }
    }

    // Settings Save Handlers
    const handleUpdateSystemSettings = async () => {
        if (!settingsState) return
        setLoading(true)
        const result = await updateSystemSettings({
            currentAcademicYear: settingsState.currentAcademicYear,
            defaultStudentFee: settingsState.defaultStudentFee,
            allowNewRegistrations: registrationEnabled,
            maintenanceMode: settingsState.maintenanceMode
        })
        setLoading(false)
        if (result) {
            toast.success('System settings updated successfully')
            setSettingsState(result)
        }
    }

    const handleUpdateNotificationSettings = async () => {
        if (!notificationSettings) return
        setLoading(true)
        const result = await updateNotificationSettings(notificationSettings)
        setLoading(false)
        if (result) {
            toast.success('Notification preferences updated')
            setNotificationSettings(result)
        }
    }

    const handleUpdateLeadSettings = async () => {
        if (!leadSettings) return
        setLoading(true)
        const result = await updateLeadSettings(leadSettings)
        setLoading(false)
        if (result) {
            toast.success('Lead management rules updated')
            setLeadSettings(result)
        }
    }

    const handleUpdateSecuritySettings = async () => {
        if (!securitySettings) return
        setLoading(true)
        const result = await updateSecuritySettings(securitySettings)
        setLoading(false)
        if (result) {
            toast.success('Security settings updated')
            setSecuritySettings(result)
        }
    }

    const handleUpdateRetentionSettings = async () => {
        if (!retentionSettings) return
        setLoading(true)
        const result = await updateRetentionSettings(retentionSettings)
        setLoading(false)
        if (result) {
            toast.success('Data retention policy updated')
            setRetentionSettings(result)
        }
    }

    // Bulk Upload Handler
    const handleBulkUpload = async (data: (BulkStudentData | BulkUserData)[]): Promise<{ success: boolean; added: number; failed: number; errors: string[] }> => {
        if (bulkUploadType === 'students') {
            const result = await bulkAddStudents(data as BulkStudentData[])
            if (result.success && result.added > 0) {
                router.refresh()
            }
            return {
                success: result.success,
                added: result.added,
                failed: result.failed,
                errors: result.errors
            }
        } else {
            // Users
            const result = await bulkAddUsers(data as BulkUserData[])
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
            toast.error(result.error || 'Failed to generate report')
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
        settlements: { title: 'Finance & Settlements', subtitle: 'Manage fees, payouts, and transactions' },
        marketing: { title: 'Promo Kit', subtitle: 'Access marketing resources and digital kits' },
        audit: { title: 'Audit Trail', subtitle: 'System-wide activity logs and transparency' },
        support: { title: 'Support Desk', subtitle: 'Manage queries and ambassador support tickets' },
        permissions: { title: 'Permissions Matrix', subtitle: 'Dynamic module allotment for administrative roles' }
    }

    return (
        <>
            <div className="space-y-4">
                {/* Dynamic Header - Premium Refinement */}
                {!['staff-dash', 'parent-dash'].includes(selectedView) && (
                    <div className="bg-white rounded-3xl premium-shadow border border-gray-100 mb-8" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '24px',
                        padding: '32px',
                        background: 'linear-gradient(to right, #ffffff, #f9fafb)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div className="p-3 bg-red-50 rounded-2xl shadow-inner">
                                <Building2 size={24} className="text-[#CC0000]" />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.04em', lineHeight: '1' }}>
                                    {pageConfig[selectedView].title}
                                </h1>
                                <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '8px', fontWeight: '600', letterSpacing: '0.01em' }}>
                                    {pageConfig[selectedView].subtitle}
                                </p>
                            </div>
                        </div>

                        {selectedView === 'analytics' && (
                            <div className="flex items-center gap-4">
                                <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
                                    {(['7d', '30d', 'all'] as const).map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => handleTimeRangeChange(r)}
                                            disabled={isRefreshing}
                                            className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${timeRange === r
                                                ? 'bg-white text-gray-900 shadow-md scale-105'
                                                : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            {r === '7d' ? '7D' : r === '30d' ? '30D' : 'ALL'}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleTimeRangeChange(timeRange)}
                                    className={`flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isRefreshing}
                                >
                                    <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin' : ''} text-[#CC0000]`} />
                                    <span className="text-sm font-black tracking-tight">{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Analytics Overview View */}
                {selectedView === 'analytics' && (
                    <>
                        <StatsCards analytics={analyticsData} />

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                            gap: '32px',
                            marginBottom: '32px'
                        }}>
                            <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', letterSpacing: '-0.03em' }}>Campus Enrollment Mix</h3>
                                    <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '600' }}>Yield distribution across achariya network</p>
                                </div>
                                <div style={{ height: '350px' }}>
                                    <CampusBarChart data={campusCompData} />
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', letterSpacing: '-0.03em' }}>Lead Distribution</h3>
                                    <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '600' }}>Market share per campus</p>
                                </div>
                                <div style={{ height: '350px' }}>
                                    <GenericPieChart data={campusCompData} dataKey="totalLeads" nameKey="campus" />
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', letterSpacing: '-0.03em' }}>Lead Structure</h3>
                                    <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '600' }}>User role breakdown</p>
                                </div>
                                <div style={{ height: '350px' }}>
                                    <GenericPieChart data={analyticsData.userRoleDistribution || []} dataKey="value" nameKey="name" />
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', letterSpacing: '-0.03em' }}>User Growth Trend</h3>
                                    <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '600' }}>Engagement velocity</p>
                                </div>
                                <div style={{ height: '350px' }}>
                                    <GrowthTrendChart data={trendData} />
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', letterSpacing: '-0.03em' }}>Lead Conversion Funnel</h3>
                                    <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '600' }}>Baseline conversion</p>
                                </div>
                                <div style={{ height: '350px' }}>
                                    <ConversionFunnelChart data={[
                                        { stage: 'Total Leads', count: analyticsData.totalLeads },
                                        { stage: 'Pending', count: analyticsData.totalLeads - analyticsData.totalConfirmed },
                                        { stage: 'Admissions', count: analyticsData.totalConfirmed }
                                    ]} />
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <CampusPerformanceTable
                                    comparison={campusCompData}
                                    isExpanded={isTableExpanded}
                                    onToggleExpand={() => setIsTableExpanded(!isTableExpanded)}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Campus Performance View */}
                {selectedView === 'campuses' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Summary Stats Row - Premium Redesign */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '16px',
                            marginBottom: '32px'
                        }}>
                            <div className="premium-shadow text-center relative overflow-hidden group" style={{
                                flex: '1 1 200px',
                                padding: '32px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, #FF1E1E 0%, #A30000 100%)'
                            }}>
                                <p className="text-3xl font-black text-white relative z-10" style={{ fontSize: '36px', letterSpacing: '-0.02em' }}>{campuses.length}</p>
                                <p className="text-[10px] font-black text-white/70 mt-2 uppercase tracking-[0.2em] relative z-10">Total Locations</p>
                            </div>
                            <div className="premium-shadow text-center relative overflow-hidden group" style={{
                                flex: '1 1 200px',
                                padding: '32px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, #3B82F6 0%, #172554 100%)'
                            }}>
                                <p className="text-3xl font-black text-white relative z-10" style={{ fontSize: '36px', letterSpacing: '-0.02em' }}>{analyticsData.totalLeads.toLocaleString()}</p>
                                <p className="text-[10px] font-black text-white/70 mt-2 uppercase tracking-[0.2em] relative z-10">Gross Pipeline</p>
                            </div>
                            <div className="premium-shadow text-center relative overflow-hidden group" style={{
                                flex: '1 1 200px',
                                padding: '32px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, #10B981 0%, #064E3B 100%)'
                            }}>
                                <p className="text-3xl font-black text-white relative z-10" style={{ fontSize: '36px', letterSpacing: '-0.02em' }}>{analyticsData.totalConfirmed.toLocaleString()}</p>
                                <p className="text-[10px] font-black text-white/70 mt-2 uppercase tracking-[0.2em] relative z-10">Total Admissions</p>
                            </div>
                            <div className="premium-shadow text-center relative overflow-hidden group" style={{
                                flex: '1 1 200px',
                                padding: '32px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, #F59E0B 0%, #78350F 100%)'
                            }}>
                                <p className="text-3xl font-black text-white relative z-10" style={{ fontSize: '36px', letterSpacing: '-0.02em' }}>{analyticsData.globalConversionRate}%</p>
                                <p className="text-[10px] font-black text-white/70 mt-2 uppercase tracking-[0.2em] relative z-10">System Yield</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Analytics Charts Grid */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-orange-500" />
                                    Lead Volume by Campus
                                </h3>
                                <div style={{ height: '350px' }}>
                                    <CampusBarChart data={campusCompData} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <Target size={18} className="text-blue-500" />
                                    Lead Distribution
                                </h3>
                                <div style={{ height: '350px' }}>
                                    <GenericPieChart data={campusCompData} dataKey="totalLeads" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <Users size={18} className="text-purple-500" />
                                    Lead Structure
                                </h3>
                                <div style={{ height: '350px' }}>
                                    <GenericPieChart data={analyticsData.userRoleDistribution || []} dataKey="value" />
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <CampusPerformanceTable
                                    comparison={campusCompData}
                                    onCampusClick={handleCampusClick}
                                    isExpanded={isTableExpanded}
                                    onToggleExpand={() => setIsTableExpanded(!isTableExpanded)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports View */}
                {selectedView === 'reports' && (
                    <ReportsPanel
                        users={users}
                        campuses={campuses}
                        admins={admins}
                        campusComparison={campusCompData}
                        onDownloadReport={handleDownloadReport}
                        generateLeadPipelineReport={generateLeadPipelineReport}
                    />
                )}

                {/* User Management View */}
                {selectedView === 'users' && (
                    <div className="space-y-6 animate-fade-in">
                        <UserTable
                            users={users}
                            searchTerm={searchQuery}
                            onSearchChange={setSearchQuery}
                            onAddUser={() => setShowAddUserModal(true)}
                            onBulkAdd={() => { setBulkUploadType('users'); setShowBulkUploadModal(true) }}
                            onDelete={(id, name) => handleDeleteUser(id, name)}
                            onToggleStatus={handleToggleUserStatus}
                        />
                    </div>
                )}

                {/* Admin Management View */}
                {selectedView === 'admins' && (
                    <div className="space-y-6 animate-fade-in">
                        <AdminTable
                            admins={admins}
                            searchTerm={searchQuery}
                            onSearchChange={setSearchQuery}
                            onAddAdmin={() => setShowAddAdminModal(true)}
                            onBulkAdd={() => { setBulkUploadType('users'); setShowBulkUploadModal(true) }} // Reuse or separate
                            onDelete={(id, name) => handleDeleteAdmin(id, name)}
                            onToggleStatus={handleToggleAdminStatus}
                        />
                    </div>
                )}

                {/* Student Management View */}
                {selectedView === 'students' && (
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
                            onEdit={(student: any) => {
                                setEditingStudent(student)
                                setStudentForm({
                                    fullName: student.fullName,
                                    parentId: student.parentId?.toString() || '',
                                    campusId: student.campusId?.toString() || '',
                                    grade: student.grade || '',
                                    section: student.section || '',
                                    rollNumber: student.rollNumber || '',
                                    baseFee: student.baseFee || 60000,
                                    discountPercent: student.discountPercent || 0,
                                    isNewParent: false,
                                    newParentName: '',
                                    newParentMobile: ''
                                })
                                setShowStudentModal(true)
                            }}
                            onBulkAdd={() => { setBulkUploadType('students'); setShowBulkUploadModal(true) }}
                        />
                    </div>
                )}

                {/* Promo Kit View */}
                {selectedView === 'marketing' && (
                    <div className="animate-fade-in">
                        <MarketingManager assets={marketingAssets || []} />
                    </div>
                )}

                {/* Audit Trail View */}
                {selectedView === 'audit' && (
                    <div className="animate-fade-in">
                        <AuditTrailTable logs={activityLogs} />
                    </div>
                )}

                {/* Revenue & Settlements View */}
                {
                    selectedView === 'settlements' && (
                        <div className="space-y-6">
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

                            <BenefitSlabTable
                                slabs={slabs}
                                onAddSlab={() => {
                                    setEditingSlab(null)
                                    setSlabForm({ tierName: '', referralCount: 1, yearFeeBenefitPercent: 10, longTermExtraPercent: 0, baseLongTermPercent: 0 })
                                    setShowBenefitModal(true)
                                }}
                                onEditSlab={(slab) => {
                                    setEditingSlab(slab)
                                    setSlabForm({
                                        tierName: slab.tierName,
                                        referralCount: slab.referralCount,
                                        yearFeeBenefitPercent: slab.yearFeeBenefitPercent,
                                        longTermExtraPercent: slab.longTermExtraPercent || 0,
                                        baseLongTermPercent: slab.baseLongTermPercent || 0
                                    })
                                    setShowBenefitModal(true)
                                }}
                                onDeleteSlab={deleteBenefitSlab}
                            />
                        </div>
                    )
                }

                {/* Support Desk View */}
                {selectedView === 'support' && (
                    <div className="space-y-6 animate-fade-in">
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
                    <div className="space-y-6 animate-fade-in">
                        <PermissionsMatrix
                            rolePermissionsMatrix={rolePermissionsMatrix}
                            isLoading={loading}
                            onChange={setRolePermissionsMatrix}
                            onSave={async () => {
                                setLoading(true)
                                try {
                                    const roles = Object.keys(rolePermissionsMatrix)
                                    const results = await Promise.all(roles.map(role =>
                                        updateRolePermissions(role, rolePermissionsMatrix[role])
                                    ))
                                    const failures = results.filter(r => !r.success)
                                    if (failures.length > 0) {
                                        toast.error(`Failed to save some permissions: ${failures.map(f => f.error).join(', ')}`)
                                    } else {
                                        toast.success('Permissions saved successfully! Changes will reflect on refresh.')
                                    }
                                } catch (err) {
                                    toast.error('Failed to save permissions')
                                } finally {
                                    setLoading(false)
                                }
                            }}
                        />
                    </div>
                )}

                {/* Dashboard Control Views */}
                {
                    (selectedView === 'staff-dash' || selectedView === 'parent-dash') && (
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
                                                staffReferralText: selectedView === 'staff-dash' ? settingsState?.staffReferralText : undefined,
                                                parentReferralText: selectedView === 'parent-dash' ? settingsState?.parentReferralText : undefined,
                                                staffWelcomeMessage: selectedView === 'staff-dash' ? settingsState?.staffWelcomeMessage : undefined,
                                                parentWelcomeMessage: selectedView === 'parent-dash' ? settingsState?.parentWelcomeMessage : undefined,
                                            })
                                            if (res.success) toast.success('Dashboard settings updated!')
                                            else toast.error('Failed to update: ' + res.error)
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
                                                    setSettingsState({ ...settingsState, [field]: e.target.value })
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
                                                    setSettingsState({ ...settingsState, [field]: e.target.value })
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
                    )
                }
            </div >
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

            {/* Smart CSV Uploader */}
            {
                bulkUploadType && (
                    <CSVUploader
                        type={bulkUploadType}
                        onUpload={handleBulkUpload}
                        onClose={() => {
                            setBulkUploadType(null)
                            router.refresh()
                        }}
                    />
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

            {/* Settings View */}
            {
                selectedView === 'settings' && settingsState && (
                    <div className="space-y-6">
                        {/* Settings Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100">
                            {[
                                { id: 'general', label: 'General', icon: Settings },
                                { id: 'leads', label: 'Lead Management', icon: Users },
                                { id: 'security', label: 'Security', icon: ShieldCheck },
                                { id: 'notifications', label: 'Notifications', icon: Bell }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSettingsTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeSettingsTab === tab.id
                                        ? 'shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    style={activeSettingsTab === tab.id ? { background: '#CC0000', color: 'white' } : {}}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* General Settings */}
                        {activeSettingsTab === 'general' && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Settings className="text-gray-400" size={20} />
                                    System Configuration
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                        <input
                                            type="text"
                                            value={settingsState.currentAcademicYear}
                                            onChange={(e) => setSettingsState({ ...settingsState, currentAcademicYear: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-gold/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Student Fee</label>
                                        <input
                                            type="number"
                                            value={settingsState.defaultStudentFee}
                                            onChange={(e) => setSettingsState({ ...settingsState, defaultStudentFee: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-gold/50"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-semibold text-gray-900">New Registrations</p>
                                            <p className="text-xs text-gray-500">Allow new ambassadors/users to sign up</p>
                                        </div>
                                        <div
                                            onClick={() => setRegistrationEnabled(!registrationEnabled)}
                                            className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${registrationEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${registrationEnabled ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-semibold text-gray-900">Maintenance Mode</p>
                                            <p className="text-xs text-gray-500">Lock access for non-admins</p>
                                        </div>
                                        <div
                                            onClick={() => setSettingsState({ ...settingsState, maintenanceMode: !settingsState.maintenanceMode })}
                                            className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${settingsState.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settingsState.maintenanceMode ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleUpdateSystemSettings}
                                        disabled={loading}
                                        className="px-6 py-2 text-white rounded-lg font-medium hover:bg-red-900 transition-colors"
                                        style={{ background: '#CC0000' }}
                                    >
                                        {loading ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Lead Settings */}
                        {activeSettingsTab === 'leads' && leadSettings && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Users className="text-gray-400" size={20} />
                                    Lead Management Rules
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <div>
                                            <p className="font-semibold text-gray-900">Auto-Assign Leads</p>
                                            <p className="text-xs text-gray-500">Automatically assign campus based on location/preference</p>
                                        </div>
                                        <div
                                            onClick={() => setLeadSettings({ ...leadSettings, autoAssignLeads: !leadSettings.autoAssignLeads })}
                                            className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${leadSettings.autoAssignLeads ? 'bg-blue-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${leadSettings.autoAssignLeads ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Stale Lead Days</label>
                                            <input
                                                type="number"
                                                value={leadSettings.leadStaleDays}
                                                onChange={(e) => setLeadSettings({ ...leadSettings, leadStaleDays: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Days before a lead is marked as stale</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Escalation</label>
                                            <input
                                                type="number"
                                                value={leadSettings.followupEscalationDays}
                                                onChange={(e) => setLeadSettings({ ...leadSettings, followupEscalationDays: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Days before notifying supervisors</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleUpdateLeadSettings}
                                        disabled={loading}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        {loading ? 'Saving...' : 'Save Rules'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeSettingsTab === 'security' && securitySettings && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-gray-400" size={20} />
                                    Security Policies
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (Minutes)</label>
                                            <input
                                                type="number"
                                                value={securitySettings.sessionTimeoutMinutes}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeoutMinutes: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
                                            <input
                                                type="number"
                                                value={securitySettings.maxLoginAttempts}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500/30"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleUpdateSecuritySettings}
                                        disabled={loading}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                    >
                                        {loading ? 'Saving...' : 'Save Policies'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Notification Settings */}
                        {activeSettingsTab === 'notifications' && notificationSettings && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Bell className="text-gray-400" size={20} />
                                    Notification Channels
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'emailNotifications', label: 'Email Notifications' },
                                        { key: 'smsNotifications', label: 'SMS Notifications' },
                                        { key: 'whatsappNotifications', label: 'WhatsApp Notifications' },
                                        { key: 'notifySuperAdminOnNewAdmins', label: 'Alert Super Admin on New Admin' },
                                        { key: 'notifyCampusHeadOnNewLeads', label: 'Alert Campus Head on New Leads' }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <span className="font-medium text-gray-700">{item.label}</span>
                                            <div
                                                onClick={() => setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key] })}
                                                className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${notificationSettings[item.key] ? 'bg-green-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notificationSettings[item.key] ? 'left-7' : 'left-1'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleUpdateNotificationSettings}
                                        disabled={loading}
                                        className="px-6 py-2 bg-primary-gold text-white rounded-lg font-medium hover:bg-yellow-500 transition-colors"
                                    >
                                        {loading ? 'Saving...' : 'Update Preferences'}
                                    </button>
                                </div>
                            </div>
                        )}
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
                )
            }
        </>
    )
}
