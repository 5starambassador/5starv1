export type Role = 'Super Admin' | 'Admission Admin' | 'Campus Head' | 'Campus Admin' | 'Staff' | 'Parent' | 'Finance Admin' | 'Alumni'

export interface ModulePermission {
    access: boolean
    scope: 'all' | 'campus' | 'view-only' | 'none' | 'self'
    canCreate?: boolean
    canEdit?: boolean
    canDelete?: boolean
}

export interface RolePermissions {
    analytics: ModulePermission
    userManagement: ModulePermission
    studentManagement: ModulePermission
    adminManagement: ModulePermission
    campusPerformance: ModulePermission
    reports: ModulePermission
    settlements: ModulePermission
    marketingKit: ModulePermission
    auditLog: ModulePermission
    supportDesk: ModulePermission
    settings: ModulePermission
    deletionHub: ModulePermission
    referralSubmission: ModulePermission
    referralTracking: ModulePermission
    savingsCalculator: ModulePermission
    rulesAccess: ModulePermission
}

export interface User {
    userId: number
    fullName: string
    mobileNumber: string
    role: string
    status: string
    referralCode: string
    campusId?: number | null
    assignedCampus?: string | null
    confirmedReferralCount: number
    yearFeeBenefitPercent: number
    longTermBenefitPercent: number
    createdAt: Date
    empId?: string | null
}

export interface Student {
    studentId: number
    fullName: string
    parentId: number
    campusId: number
    grade: string
    section?: string | null
    rollNumber?: string | null
    status: string
    baseFee: number
    discountPercent: number
    parent?: { fullName: string; mobileNumber: string }
    campus?: { campusName: string }
    ambassador?: { fullName: string; mobileNumber: string; referralCode?: string; role?: string }
    createdAt: Date
}

export interface ReferralLead {
    leadId: number
    userId: number
    parentName: string
    parentMobile: string
    studentName?: string | null
    campus?: string | null
    gradeInterested?: string | null
    leadStatus: string
    confirmedDate?: Date | null
    createdAt: Date
    user?: User
    student?: Student
}
export interface Campus {
    id: number
    campusName: string
    campusCode: string
    location: string
    grades: string
    maxCapacity: number
    currentEnrollment: number
    isActive: boolean
    contactEmail?: string | null
    contactPhone?: string | null
    createdAt: Date
    updatedAt: Date
}

export interface Admin {
    adminId: number
    adminName: string
    adminMobile: string
    role: string
    assignedCampus: string | null
    status: string
    createdAt: Date
}

export interface SystemAnalytics {
    totalAmbassadors: number
    totalLeads: number
    totalConfirmed: number
    globalConversionRate: number
    totalCampuses: number
    systemWideBenefits: number
    totalStudents: number
    staffCount: number
    parentCount: number
    userRoleDistribution: { name: string; value: number }[]
    // New metrics for Phase 2
    avgLeadsPerAmbassador: number
    totalEstimatedRevenue: number
    conversionFunnel: { stage: string; count: number }[]
}

export interface CampusPerformance {
    campus: string
    totalLeads: number
    confirmed: number
    pending: number
    conversionRate: number
    ambassadors: number
}

export interface AdminAnalytics {
    success: boolean
    totalLeads: number
    confirmedLeads: number
    pendingLeads: number
    conversionRate: string | number
    totalAmbassadors: number
    avgReferralsPerAmbassador: string | number
    totalEstimatedValue: number
    campusDistribution: Array<{
        campus: string
        count: number
        percentage: string | number
    }>
    roleBreakdown: {
        parent: { count: number; percentage: string | number }
        staff: { count: number; percentage: string | number }
    }
    statusBreakdown: Array<{
        status: string
        count: number
        percentage: string | number
    }>
    topPerformers: Array<{
        name: string
        role: string
        referralCode: string
        count: number
    }>
}

export interface SystemSettings {
    id: number
    allowNewRegistrations: boolean
    currentAcademicYear: string
    defaultStudentFee: number
    maintenanceMode: boolean
    staffReferralText?: string | null
    parentReferralText?: string | null
    staffWelcomeMessage?: string | null
    parentWelcomeMessage?: string | null
    updatedAt: Date
}

export interface MarketingAsset {
    id: number
    name: string
    category: string
    description?: string | null
    fileUrl: string
    fileType?: string | null
    fileSize?: number | null
    isActive: boolean
    createdAt: Date
}

export interface BulkStudentData {
    fullName: string
    parentMobile: string
    grade: string
    campusName: string
    section?: string
    rollNumber?: string
}

export interface BulkUserData {
    fullName: string
    mobileNumber: string
    role: 'Parent' | 'Staff' | 'Alumni'
    email: string
    assignedCampus: string
    empId?: string
    childEprNo?: string
}
