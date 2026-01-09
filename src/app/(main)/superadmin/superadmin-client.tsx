'use client'

import { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Filter, TrendingUp, Users, Target, Building2, IndianRupee, BarChart3, Settings, X, Upload, Trash2, Star, Calendar, Bell, Shield, Database, GanttChartSquare, AlertTriangle, BookOpen, Check, Pencil, MessageSquare, Download, ShieldCheck, RefreshCw, Trophy, UserPlus, List, Wallet, Edit, Trash, Phone, ArrowRight, Clock, CheckCircle, Plus, Zap } from 'lucide-react'
import {
    getSystemSettings,
    updateSystemSettings,
    getAcademicYears,
    addAcademicYear
} from '@/app/settings-actions'
import { getLeadSettings, updateLeadSettings } from '@/app/lead-actions'
import { getSecuritySettings, updateSecuritySettings, getRetentionSettings, updateRetentionSettings } from '@/app/security-actions'
import { getNotificationSettings, updateNotificationSettings } from '@/app/notification-actions'
import { getCampuses, updateCampus, addCampus, deleteCampus, deleteCampuses } from '@/app/campus-actions'
import { getBenefitSlabs, updateBenefitSlab, addBenefitSlab, deleteBenefitSlab } from '@/app/benefit-actions'
import { addUser, updateUser, addAdmin, removeUser, deleteAdmin, bulkAddUsers, updateUserStatus, updateAdminStatus, getSystemAnalytics, getUserGrowthTrend, getCampusComparison, getCampusDetails, triggerWeeklyKPIReport, adminResetPassword } from '@/app/superadmin-actions'
import { getDeletionRequests } from '@/app/deletion-actions'
import { addStudent, updateStudent, bulkAddStudents, convertLeadToStudent } from '@/app/student-actions'
import { getRolePermissions, updateRolePermissions } from '@/app/permission-actions'
import { getAllReferrals, confirmReferral } from '@/app/admin-actions'
import { ReferralTable } from '../admin/referral-table'
import { PremiumHeader } from '@/components/premium/PremiumHeader'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { MarketingManager } from '@/components/MarketingManager'
import CSVUploader from '@/components/CSVUploader'
import { CampusBarChart, ConversionFunnelChart, GrowthTrendChart, GenericPieChart, CampusEfficiencyChart } from '@/components/analytics/analytics-components'
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

const FeeManagementTable = dynamic(() => import('@/components/superadmin/FeeManagementTable').then(m => m.FeeManagementTable), { ssr: false })
const EngagementPanel = dynamic(() => import('@/components/superadmin/EngagementPanel').then(m => m.EngagementPanel), { ssr: false })
const AuditLogPanel = dynamic(() => import('@/components/superadmin/AuditLogPanel').then(m => m.AuditLogPanel), { ssr: false })
const LiveTicker = dynamic(() => import('@/components/superadmin/LiveTicker').then(m => m.LiveTicker), { ssr: false })
const LeaderboardWidget = dynamic(() => import('@/components/superadmin/LeaderboardWidget').then(m => m.LeaderboardWidget), { ssr: false })
const SettingsPanel = dynamic(() => import('@/components/superadmin/SettingsPanel').then(m => m.SettingsPanel), { ssr: false })
const RetentionHeatmap = dynamic(() => import('@/components/analytics/RetentionHeatmap').then(m => m.RetentionHeatmap), { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-gray-100 rounded-3xl" /> })

import { User, Student, ReferralLead, RolePermissions, SystemAnalytics, CampusPerformance, Admin, Campus, SystemSettings, MarketingAsset, BulkStudentData, BulkUserData, Role } from '@/types'

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
    currentUser,
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
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
    const [resetTarget, setResetTarget] = useState<{ id: number, name: string, type: 'user' | 'admin' } | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [modalLoading, setModalLoading] = useState(false)

    // Form states
    const [userForm, setUserForm] = useState({
        fullName: '',
        mobileNumber: '',
        role: 'Parent' as Role,
        assignedCampus: '',
        empId: '',
        childEprNo: '',
        isFiveStarMember: false,
        yearFeeBenefitPercent: 0,
        longTermBenefitPercent: 0
    })
    const [adminForm, setAdminForm] = useState({ adminName: '', adminMobile: '', role: 'CampusHead' as 'CampusHead' | 'CampusAdmin' | 'Admission Admin' | 'Finance Admin' | 'Super Admin', assignedCampus: '', password: '' })
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

    // Academic Year State
    const [academicYears, setAcademicYears] = useState<any[]>([])
    const [showAddYearModal, setShowAddYearModal] = useState(false)
    const [newYearData, setNewYearData] = useState({ year: '', startDate: '', endDate: '' })

    // Load AY on mount
    useEffect(() => {
        getAcademicYears().then(res => {
            if (res.success && res.data) setAcademicYears(res.data)
        })
    }, [])

    const handleAddAcademicYear = async () => {
        if (!newYearData.year || !newYearData.startDate || !newYearData.endDate) return toast.error('Fill all fields')
        setModalLoading(true)
        try {
            const res = await addAcademicYear({
                year: newYearData.year,
                startDate: new Date(newYearData.startDate),
                endDate: new Date(newYearData.endDate)
            })
            if (res.success) {
                toast.success('Academic Year Added')
                setShowAddYearModal(false)
                setNewYearData({ year: '', startDate: '', endDate: '' })
                // Refresh list
                const list = await getAcademicYears()
                if (list.success && list.data) setAcademicYears(list.data)
            } else {
                toast.error('Failed to add year')
            }
        } finally {
            setModalLoading(false)
        }
    }
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [editingUser, setEditingUser] = useState<any>(null)

    // Bulk upload state
    const [bulkUploadType, setBulkUploadType] = useState<'students' | 'users' | null>(null)

    // Referral Management State
    const [referrals, setReferrals] = useState<any[]>([])
    const [referralCodeFilter, setReferralCodeFilter] = useState<string | null>(null)

    const loadReferrals = async () => {
        setLoading(true)
        try {
            const res = await getAllReferrals()
            if (res.success && res.referrals) setReferrals(res.referrals)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmReferral = async (leadId: number) => {
        const res = await confirmReferral(leadId)
        if (res.success) {
            toast.success('Referral confirmed!')
            loadReferrals()
            router.refresh()
        } else {
            toast.error(res.error || 'Failed to confirm')
        }
    }

    // Map URL view param to internal view state
    const mapViewParam = (view: string): 'home' | 'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash' | 'referrals' | 'fees' | 'engagement' => {
        const validViews = ['home', 'analytics', 'users', 'admins', 'campuses', 'settings', 'reports', 'students', 'settlements', 'marketing', 'audit', 'support', 'permissions', 'staff-dash', 'parent-dash', 'referrals', 'fees', 'engagement']
        return (validViews.includes(view) ? view : 'home') as any
    }

    const [selectedView, setSelectedView] = useState<'home' | 'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash' | 'referrals' | 'fees' | 'engagement'>(mapViewParam(initialView))

    // Unified Status & Settings States
    const [campuses, setCampuses] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [slabs, setSlabs] = useState<any[]>([])

    // Missing States Restored
    const [settingsState, setSettingsState] = useState<SystemSettings | null>(systemSettings || null)
    const [notificationSettings, setNotificationSettings] = useState<any>(null)
    const [registrationEnabled, setRegistrationEnabled] = useState(true)

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
        grades: '',
        maxCapacity: 500,
        gradeFees: [] as Array<{ grade: string; annualFee: number }>
    })
    const [customGradeInput, setCustomGradeInput] = useState('')

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
    const [activeCampusTab, setActiveCampusTab] = useState<'metrics' | 'management'>('metrics')

    // Sync view with URL params when they change
    useEffect(() => {
        const viewParam = searchParams.get('view') || 'home'
        setSelectedView(mapViewParam(viewParam))
    }, [searchParams])

    useEffect(() => {
        if (selectedView === 'referrals') loadReferrals()
    }, [selectedView])

    // Load all settings on mount
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [cmp, slb, sys, notif] = await Promise.all([
                    getCampuses(),
                    getBenefitSlabs(),
                    getSystemSettings(),
                    getNotificationSettings()
                ])

                if (cmp.success && cmp.campuses) setCampuses(cmp.campuses)
                if (slb.success && slb.slabs) setSlabs(slb.slabs)
                if (sys) {
                    setSettingsState(sys)
                    setRegistrationEnabled(sys.allowNewRegistrations)
                }
                if (notif) setNotificationSettings(notif)
            } catch (error) {
                console.error('Failed to load initial data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // New effect to load permissions matrix
    useEffect(() => {
        if (selectedView === 'permissions') {
            const loadPermissions = async () => {
                setLoading(true)
                try {
                    const roles = ['Super Admin', 'Campus Head', 'Finance Admin', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent', 'Alumni']
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

    // Add/Update User Handler
    const handleSaveUser = async () => {
        if (!userForm.fullName || !userForm.mobileNumber) {
            toast.error('Please fill in all required fields')
            return
        }
        if (userForm.mobileNumber.length !== 10) {
            toast.error('Mobile number must be 10 digits')
            return
        }
        setModalLoading(true)

        let result
        if (editingUser) {
            result = await updateUser(editingUser.userId, {
                fullName: userForm.fullName,
                mobileNumber: userForm.mobileNumber,
                role: userForm.role as any,
                assignedCampus: userForm.assignedCampus || undefined,
                empId: userForm.empId || undefined,
                childEprNo: userForm.childEprNo || undefined,
                isFiveStarMember: userForm.isFiveStarMember,
                yearFeeBenefitPercent: Number(userForm.yearFeeBenefitPercent),
                longTermBenefitPercent: Number(userForm.longTermBenefitPercent)
            })
        } else {
            result = await addUser({
                fullName: userForm.fullName,
                mobileNumber: userForm.mobileNumber,
                role: userForm.role as any,
                assignedCampus: userForm.assignedCampus || undefined
            })
        }

        setModalLoading(false)
        if (result.success) {
            setShowAddUserModal(false)
            setEditingUser(null)
            setUserForm({
                fullName: '',
                mobileNumber: '',
                role: 'Parent',
                assignedCampus: '',
                empId: '',
                childEprNo: '',
                isFiveStarMember: false,
                yearFeeBenefitPercent: 0,
                longTermBenefitPercent: 0
            })
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to save user')
        }
    }

    const openEditUserModal = (user: User) => {
        setEditingUser(user)
        setUserForm({
            fullName: user.fullName || '',
            mobileNumber: user.mobileNumber || '',
            role: (user.role as any) || 'Parent',
            assignedCampus: user.assignedCampus || '',
            empId: user.empId || '',
            childEprNo: user.childEprNo || '',
            isFiveStarMember: user.isFiveStarMember || false,
            yearFeeBenefitPercent: user.yearFeeBenefitPercent || 0,
            longTermBenefitPercent: user.longTermBenefitPercent || 0
        })
        setShowAddUserModal(true)
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
        const isCampusRole = ['CampusHead', 'CampusAdmin'].includes(adminForm.role)

        if (!adminForm.adminName || !adminForm.adminMobile) {
            toast.error('Please fill in Name and Mobile Number')
            return
        }

        if (isCampusRole && !adminForm.assignedCampus) {
            toast.error('Please select an Assigned Campus')
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
            assignedCampus: adminForm.assignedCampus,
            password: adminForm.password
        })
        setModalLoading(false)
        if (result.success) {
            setShowAddAdminModal(false)
            setAdminForm({ adminName: '', adminMobile: '', role: 'CampusHead', assignedCampus: '', password: '' })
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

    // Reset Password Handlers (Admin-Side)
    const openResetModal = (id: number, name: string, type: 'user' | 'admin') => {
        setResetTarget({ id, name, type })
        setNewPassword('')
        setShowResetPasswordModal(true)
    }

    const handleExecuteReset = async () => {
        if (!resetTarget || !newPassword) return
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setModalLoading(true)
        try {
            const res = await adminResetPassword(resetTarget.id, resetTarget.type, newPassword)
            if (res.success) {
                toast.success(`Password reset successfully for ${resetTarget.name}`)
                setShowResetPasswordModal(false)
                setResetTarget(null)
                setNewPassword('')
            } else {
                toast.error(res.error || 'Failed to reset password')
            }
        } catch (e) {
            toast.error('An error occurred during password reset')
        } finally {
            setModalLoading(false)
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
            setCampusForm({ campusName: '', campusCode: '', location: '', grades: '', maxCapacity: 500, gradeFees: [] })
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
            allowNewRegistrations: registrationEnabled,
            maintenanceMode: settingsState.maintenanceMode
        })
        setLoading(false)
        if (result) {
            toast.success('System settings updated successfully')
            setSettingsState(result.data || null)
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

    // Report Handlers
    const handleWeeklyReport = async () => {
        const tid = toast.loading('Generating and sending weekly report...')
        try {
            const res = await triggerWeeklyKPIReport()
            if (res.success) {
                toast.success('Weekly KPI report sent successfully!', { id: tid })
            } else {
                toast.error(res.error || 'Failed to send report', { id: tid })
            }
        } catch (error) {
            toast.error('An error occurred during report generation', { id: tid })
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
            const result = await bulkAddUsers(data as any[])
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
    const pageConfig: Record<'home' | 'analytics' | 'users' | 'admins' | 'campuses' | 'settings' | 'reports' | 'students' | 'settlements' | 'marketing' | 'audit' | 'support' | 'permissions' | 'staff-dash' | 'parent-dash' | 'referrals' | 'fees' | 'engagement', { title: string, subtitle: string }> = {
        home: { title: 'Dashboard', subtitle: 'Quick overview and actions' },
        analytics: { title: 'Analytics Overview', subtitle: 'System-wide performance metrics and insights' },
        campuses: { title: 'Campus Performance', subtitle: 'Detailed metrics and comparison across all campuses' },
        users: { title: 'User Management', subtitle: 'Manage registered users and their permissions' },
        admins: { title: 'Admin Management', subtitle: 'Manage administrators and their roles' },
        students: { title: 'Student Management', subtitle: 'Manage system-wide student records and academic context' },
        reports: { title: 'Reports', subtitle: 'Download system data reports in CSV format' },
        engagement: { title: 'Engagement Center', subtitle: 'Manage campaigns and ambassador retention' },
        'settings': { title: 'System Settings', subtitle: 'Global configuration and defaults' },
        'staff-dash': { title: 'Staff Dashboard Ctrl', subtitle: 'Configure staff perspective and assets' },
        'parent-dash': { title: 'Parent Dashboard Ctrl', subtitle: 'Configure parent perspective and assets' },
        settlements: { title: 'Finance & Settlements', subtitle: 'Manage fees, payouts, and transactions' },
        marketing: { title: 'Promo Kit', subtitle: 'Access marketing resources and digital kits' },
        audit: { title: 'Audit Trail', subtitle: 'System-wide activity logs and transparency' },
        support: { title: 'Support Desk', subtitle: 'Manage queries and ambassador support tickets' },
        permissions: { title: 'Permissions Matrix', subtitle: 'Dynamic module allotment for administrative roles' },

        'referrals': { title: 'Global Referral Management', subtitle: 'Track and convert ambassador leads into students across all campuses' },
        'fees': { title: 'Fee Management', subtitle: 'Manage academic year fee structures across campuses' }
    }

    return (
        <>
            <div className="space-y-4">
                {/* Dynamic Header - Premium Library Component */}
                {!['staff-dash', 'parent-dash'].includes(selectedView) && (
                    <PremiumHeader
                        title={pageConfig[selectedView].title}
                        subtitle={pageConfig[selectedView].subtitle}
                        icon={Building2}
                        iconColor="text-[#CC0000]"
                        iconBgColor="bg-red-50"
                        gradientFrom="from-red-600"
                        gradientTo="to-red-600"
                    >
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
                    </PremiumHeader>
                )}

                {/* Home View - Action Focused */}
                {selectedView === 'home' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                            <LiveTicker />
                        </div>
                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white">
                                <p className="text-red-100 text-xs font-medium">Total Ambassadors</p>
                                <p className="text-3xl font-extrabold mt-1">{analyticsData.totalAmbassadors}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                                <p className="text-blue-100 text-xs font-medium">Total Leads</p>
                                <p className="text-3xl font-extrabold mt-1">{analyticsData.totalLeads}</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                                <p className="text-green-100 text-xs font-medium">Confirmed</p>
                                <p className="text-3xl font-extrabold mt-1">{analyticsData.totalConfirmed}</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
                                <p className="text-amber-100 text-xs font-medium">Conversion Rate</p>
                                <p className="text-3xl font-extrabold mt-1">{(analyticsData.globalConversionRate || 0).toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button
                                    onClick={() => router.push('/superadmin?view=users')}
                                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <Users size={24} className="text-red-600" />
                                    <span className="text-xs font-bold text-gray-700">Manage Users</span>
                                </button>
                                <button
                                    onClick={() => router.push('/superadmin?view=students')}
                                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <BookOpen size={24} className="text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">Students</span>
                                </button>
                                <button
                                    onClick={() => router.push('/superadmin?view=reports')}
                                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <Download size={24} className="text-green-600" />
                                    <span className="text-xs font-bold text-gray-700">Reports</span>
                                </button>
                                <button
                                    onClick={() => router.push('/superadmin?view=analytics')}
                                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <BarChart3 size={24} className="text-purple-600" />
                                    <span className="text-xs font-bold text-gray-700">Full Analytics</span>
                                </button>
                                <button
                                    onClick={() => router.push('/superadmin?view=engagement')}
                                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <Zap size={24} className="text-amber-500" />
                                    <span className="text-xs font-bold text-gray-700">Engagement</span>
                                </button>
                            </div>
                        </div>

                        {/* Recent Activity / Campus Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-900 mb-4">Top Campuses</h3>
                                <div className="space-y-3">
                                    {campusCompData.slice(0, 5).map((campus, idx) => (
                                        <div key={campus.campus} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                                <span className="text-sm font-medium text-gray-800">{campus.campus}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600">{campus.confirmed} confirmed</p>
                                                <p className="text-xs text-gray-500">{campus.totalLeads} leads</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <LeaderboardWidget users={users} />
                        </div>
                    </div>
                )}

                {/* Analytics Overview View */}
                {selectedView === 'analytics' && (
                    <>
                        <StatsCards analytics={analyticsData} growthTrend={trendData} />

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
                                <RetentionHeatmap />
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

                {/* Campus View */}
                {selectedView === 'campuses' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Tab Switcher */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex items-center">
                                <button
                                    onClick={() => setActiveCampusTab('metrics')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeCampusTab === 'metrics' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Analytics & Performance
                                </button>
                                <button
                                    onClick={() => setActiveCampusTab('management')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeCampusTab === 'management' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Campus Management
                                </button>
                            </div>
                        </div>

                        {activeCampusTab === 'metrics' ? (
                            <>
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
                                            <GenericPieChart data={campusCompData} dataKey="totalLeads" nameKey="campus" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                            <TrendingUp size={18} className="text-emerald-500" />
                                            Lead Conversion Funnel
                                        </h3>
                                        <div style={{ height: '350px' }}>
                                            <ConversionFunnelChart data={analytics?.conversionFunnel || []} />
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                            <CheckCircle size={18} className="text-emerald-600" />
                                            Campus Conversion Efficiency (%)
                                        </h3>
                                        <div style={{ height: '350px' }}>
                                            <CampusEfficiencyChart data={campusComparison || []} />
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                            <Users size={18} className="text-purple-500" />
                                            Lead Structure
                                        </h3>
                                        <div style={{ height: '350px' }}>
                                            <GenericPieChart data={analytics?.userRoleDistribution || []} dataKey="value" nameKey="name" />
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
                            </>
                        ) : (
                            <CampusManagementTable
                                campuses={campuses}
                                onAdd={() => {
                                    setEditingCampus(null)
                                    setCampusForm({
                                        campusName: '',
                                        campusCode: '',
                                        location: '',
                                        grades: '',
                                        maxCapacity: 500,
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
                                        gradeFees: campus.gradeFees || []
                                    })
                                    setShowCampusModal(true)
                                }}
                                onDelete={async (id: number) => {
                                    const result = await deleteCampus(id)
                                    if (result.success) {
                                        toast.success('Campus deleted successfully')
                                    } else {
                                        if (result.requiresForce) {
                                            if (confirm(`${result.error}\n\nDo you want to FORCE DELETE? This will permanently delete all associated students and data.`)) {
                                                const forceResult = await deleteCampus(id, true)
                                                if (forceResult.success) {
                                                    toast.success('Campus force deleted successfully')
                                                } else {
                                                    toast.error(forceResult.error || 'Failed to force delete campus')
                                                }
                                            }
                                        } else {
                                            toast.error(result.error || 'Failed to delete campus')
                                        }
                                    }
                                }}
                                onBulkDelete={async (ids) => {
                                    if (!confirm(`Are you sure you want to delete ${ids.length} campuses? This action cannot be undone.`)) return
                                    const result = await deleteCampuses(ids)
                                    if (result.success) {
                                        toast.success('Campuses deleted successfully')
                                    } else {
                                        if (result.requiresForce) {
                                            if (confirm(`${result.error}\n\nDo you want to FORCE DELETE these campuses? This will permanently delete ALL students associated with them.`)) {
                                                const forceResult = await deleteCampuses(ids, true)
                                                if (forceResult.success) {
                                                    toast.success('Campuses force deleted successfully')
                                                } else {
                                                    toast.error(forceResult.error || 'Failed to force delete campuses')
                                                }
                                            }
                                        } else {
                                            toast.error(result.error || 'Failed to delete campuses')
                                        }
                                    }
                                }}
                            />
                        )}
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
                        onWeeklyReport={handleWeeklyReport}
                    />
                )}

                {/* Fee Management View */}
                {selectedView === 'fees' && <FeeManagementTable academicYears={academicYears} />}
                {selectedView === 'engagement' && <EngagementPanel />}

                {/* User Management View */}
                {selectedView === 'users' && (
                    <div className="space-y-6 animate-fade-in">
                        <UserTable
                            users={users}
                            searchTerm={searchQuery}
                            onSearchChange={setSearchQuery}
                            onAddUser={() => { setEditingUser(null); setUserForm({ fullName: '', mobileNumber: '', role: 'Parent', assignedCampus: '', empId: '', childEprNo: '', isFiveStarMember: false, yearFeeBenefitPercent: 0, longTermBenefitPercent: 0 }); setShowAddUserModal(true) }}
                            onBulkAdd={() => { setBulkUploadType('users'); setShowBulkUploadModal(true) }}
                            onDelete={(id, name) => handleDeleteUser(id, name)}
                            onToggleStatus={handleToggleUserStatus}
                            onViewReferrals={(code) => {
                                setReferralCodeFilter(code)
                                setSelectedView('referrals')
                                router.push('/superadmin?view=referrals')
                            }}
                            onResetPassword={openResetModal}
                            onEdit={openEditUserModal}
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
                            onResetPassword={openResetModal}
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
                            onViewAmbassador={(code) => {
                                setSelectedView('users')
                                setSearchQuery(code)
                                router.push('/superadmin?view=users')
                            }}
                        />
                    </div>
                )}

                {/* Referral Management View */}
                {selectedView === 'referrals' && (
                    <div className="space-y-6 animate-fade-in">
                        <ReferralTable
                            referrals={referralCodeFilter ? referrals.filter(r => r.user?.referralCode === referralCodeFilter) : referrals}
                            confirmReferral={handleConfirmReferral}
                            convertLeadToStudent={convertLeadToStudent}
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
                {/* Audit Trail View */}
                {selectedView === 'audit' && (
                    <div className="animate-fade-in">
                        <AuditLogPanel />
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

                {/* Deletion Requests Hub */}


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
                                                    setSettingsState(prev => prev ? ({ ...prev, [field]: e.target.value }) : null)
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
                                                    setSettingsState(prev => prev ? ({ ...prev, [field]: e.target.value }) : null)
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
            {/* Campus Drill-down Modal */}
            {selectedCampus && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    <Building2 size={24} className="text-red-600" />
                                    {selectedCampus} Details
                                </h3>
                                <p className="text-sm font-medium text-gray-400 mt-1">Institutional performance at a glance.</p>
                            </div>
                            <button
                                onClick={() => setSelectedCampus(null)}
                                className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-600 transition-all shadow-sm bg-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-8 max-h-[calc(90vh-100px)] custom-scrollbar">
                            {detailsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
                                    <p className="text-gray-400 font-bold text-sm">Loading campus intelligence...</p>
                                </div>
                            ) : campusDetails ? (
                                <div className="space-y-8">
                                    {/* Top Ambassadors */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Trophy size={14} className="text-yellow-500" />
                                            Top Ambassadors
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {campusDetails.topAmbassadors.length > 0 ? (
                                                campusDetails.topAmbassadors.map((amb, i) => (
                                                    <div key={amb.userId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-red-100 transition-all">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-black text-red-600 shadow-sm">
                                                            #{i + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-gray-900 truncate">{amb.fullName}</p>
                                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">{amb.confirmedCount} ADMISSIONS</p>
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                                    <p className="text-xs text-gray-400 font-bold">No ambassadors ranked yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent Leads */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Clock size={14} className="text-blue-500" />
                                            Recent Activity
                                        </h4>
                                        <div className="space-y-3">
                                            {campusDetails.recentLeads.length > 0 ? (
                                                campusDetails.recentLeads.map((lead) => (
                                                    <div key={lead.leadId} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 rounded-xl ${lead.leadStatus === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                {lead.leadStatus === 'Confirmed' ? <Check size={18} /> : <BarChart3 size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-900">{lead.parentName}</p>
                                                                <p className="text-[10px] text-gray-500 font-medium">Referral for {lead.studentName || 'Unknown Student'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${lead.leadStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {lead.leadStatus}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                                    <p className="text-xs text-gray-400 font-bold">No recent referral activity.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-gray-400 font-bold">Failed to load campus intelligence.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedCampus(null)}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-100 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {
                showAddUserModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{editingUser ? 'Edit Ambassador' : 'Add New User'}</h3>
                                <button onClick={() => { setShowAddUserModal(false); setEditingUser(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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
                                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="Parent">Parent</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Alumni">Alumni</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Assigned Campus</label>
                                    <select
                                        value={userForm.assignedCampus}
                                        onChange={(e) => setUserForm({ ...userForm, assignedCampus: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="">Select Campus (Optional)</option>
                                        {campuses.map(c => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
                                    </select>
                                </div>
                                {userForm.role === 'Staff' && (
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Employee ID *</label>
                                        <input
                                            type="text"
                                            value={userForm.empId}
                                            onChange={(e) => setUserForm({ ...userForm, empId: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                            placeholder="Enter Staff Employee ID"
                                        />
                                    </div>
                                )}
                                {userForm.role === 'Parent' && (
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Child ERP No</label>
                                        <input
                                            type="text"
                                            value={userForm.childEprNo}
                                            onChange={(e) => setUserForm({ ...userForm, childEprNo: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                            placeholder="Achariya Child ERP No"
                                        />
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={userForm.isFiveStarMember}
                                        onChange={(e) => setUserForm({ ...userForm, isFiveStarMember: e.target.checked })}
                                        id="isFiveStar"
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="isFiveStar" style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>5-Star Member Status</label>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Year Fee Benefit %</label>
                                        <input
                                            type="number"
                                            value={userForm.yearFeeBenefitPercent}
                                            onChange={(e) => setUserForm({ ...userForm, yearFeeBenefitPercent: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Long Term Benefit %</label>
                                        <input
                                            type="number"
                                            value={userForm.longTermBenefitPercent}
                                            onChange={(e) => setUserForm({ ...userForm, longTermBenefitPercent: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => { setShowAddUserModal(false); setEditingUser(null) }}
                                        style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveUser}
                                        disabled={modalLoading}
                                        style={{ flex: 1, padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        {modalLoading ? 'Saving...' : (editingUser ? 'Update Details' : 'Add User')}
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
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Password (Optional)</label>
                                    <input
                                        type="password"
                                        value={adminForm.password}
                                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                        placeholder="Defaults to Mobile Number"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Role *</label>
                                    <select
                                        value={adminForm.role}
                                        onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as any })}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="CampusHead">Campus Head</option>
                                        <option value="CampusAdmin">Campus Admin</option>
                                        <option value="Admission Admin">Admission Admin</option>
                                        <option value="Finance Admin">Finance Admin</option>
                                        <option value="Super Admin">Super Admin</option>
                                    </select>
                                </div>
                                {(adminForm.role === 'CampusHead' || adminForm.role === 'CampusAdmin') && (
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

            {/* Reset Password Modal */}
            {showResetPasswordModal && resetTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Reset Password</h3>
                            <button onClick={() => setShowResetPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                            Set a new password for <strong>{resetTarget.name}</strong> ({resetTarget.type}).
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>New Password *</label>
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    placeholder="Enter new password"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Min 6 characters required.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <button
                                    onClick={() => setShowResetPasswordModal(false)}
                                    style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteReset}
                                    disabled={modalLoading}
                                    style={{ flex: 1, padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    {modalLoading ? 'Resetting...' : 'Confirm Reset'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart CSV Uploader */}
            {
                bulkUploadType && (
                    <CSVUploader
                        type={bulkUploadType}
                        onUpload={handleBulkUpload}
                        userRole={currentUser?.role}
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
                                                        className="hover:text-red-500 transition-colors ml-1"
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
                                            placeholder="Enter course name (e.g. B.Sc, MBA)"
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    if (customGradeInput.trim()) {
                                                        const currentGrades = campusForm.grades ? campusForm.grades.split(',').map(g => g.trim()).filter(Boolean) : []
                                                        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
                                                        const inputNorm = norm(customGradeInput.trim())

                                                        if (!currentGrades.some(g => norm(g) === inputNorm)) {
                                                            const newGrades = [...currentGrades, customGradeInput.trim()]
                                                            setCampusForm({ ...campusForm, grades: newGrades.join(', ') })
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
                                                    const currentGrades = campusForm.grades ? campusForm.grades.split(',').map(g => g.trim()).filter(Boolean) : []
                                                    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
                                                    const inputNorm = norm(customGradeInput.trim())

                                                    if (!currentGrades.some(g => norm(g) === inputNorm)) {
                                                        const newGrades = [...currentGrades, customGradeInput.trim()]
                                                        setCampusForm({ ...campusForm, grades: newGrades.join(', ') })
                                                    }
                                                    setCustomGradeInput('')
                                                }
                                            }}
                                            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">* Fees are now managed in the Fee Management section.</p>
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
            {selectedView === 'settings' && (
                <SettingsPanel />
            )}

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
                                        {['Pre-Mont', 'Mont-1', 'Mont-2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
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

            {/* Add Academic Year Modal */}
            {
                showAddYearModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Add Academic Year</h3>
                                <button onClick={() => setShowAddYearModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Year Name</label>
                                    <input
                                        placeholder="e.g. 2026-2027"
                                        className="w-full border p-2 rounded-lg text-sm font-bold mt-1"
                                        value={newYearData.year}
                                        onChange={e => setNewYearData({ ...newYearData, year: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full border p-2 rounded-lg text-sm mt-1"
                                            value={newYearData.startDate}
                                            onChange={e => setNewYearData({ ...newYearData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full border p-2 rounded-lg text-sm mt-1"
                                            value={newYearData.endDate}
                                            onChange={e => setNewYearData({ ...newYearData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button onClick={() => setShowAddYearModal(false)} className="flex-1 py-2 text-gray-500 text-sm font-bold border rounded-lg">Cancel</button>
                                <button onClick={handleAddAcademicYear} disabled={modalLoading} className="flex-1 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700">
                                    {modalLoading ? 'Adding...' : 'Add Year'}
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
