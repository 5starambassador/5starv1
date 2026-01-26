export type Role = 'Super Admin' | 'Admission Admin' | 'Campus Head' | 'Campus Admin' | 'CampusHead' | 'CampusAdmin' | 'Staff' | 'Parent' | 'Finance Admin' | 'Alumni' | 'Others'

export type FeeType = 'OTP' | 'WOTP'

export interface ModulePermission {
    access: boolean
    scope: 'all' | 'campus' | 'view-only' | 'campus-view' | 'none' | 'self'
    canCreate?: boolean
    canEdit?: boolean
    canDelete?: boolean
}

export interface RolePermissions {
    [key: string]: any
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
    passwordReset: ModulePermission
    feeManagement: ModulePermission
    engagementCentre: ModulePermission
    paymentApproval: ModulePermission
}

export interface User {
    userId: number
    fullName: string
    mobileNumber: string
    role: string
    status: string
    referralCode: string
    email?: string | null
    password?: string | null
    campusId?: number | null
    assignedCampus?: string | null
    confirmedReferralCount: number
    yearFeeBenefitPercent: number
    longTermBenefitPercent: number
    longTermBenefitLocked?: boolean
    createdAt: Date
    empId?: string | null
    childEprNo?: string | null
    isFiveStarMember?: boolean
    currentYearCount?: number
    // Expanded fields for UserDetailsModal
    childName?: string | null
    grade?: string | null
    paymentStatus?: string | null
    transactionId?: string | null
    paymentAmount?: number | null
    aadharNo?: string | null
    bankAccountDetails?: string | null
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
    selectedFeeType?: FeeType | null
    annualFee?: number | null
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
    admissionNumber?: string | null
    selectedFeeType?: FeeType | null
    annualFee?: number | null
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

export interface GradeFee {
    id: number
    grade: string
    annualFee_otp?: number | null
    annualFee_wotp?: number | null
    campusId: number
    academicYear: string
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
    alumniCount: number
    othersCount: number
    userRoleDistribution: { name: string; value: number }[]
    avgLeadsPerAmbassador: number
    totalEstimatedRevenue: number
    conversionFunnel: { stage: string; count: number }[]
}

export interface AdminAnalytics {
    totalLeads: number
    confirmedLeads: number
    pendingLeads: number
    conversionRate: string
    totalAmbassadors: number
    avgReferralsPerAmbassador: string
    totalEstimatedValue: number
    campusDistribution: {
        campus: string
        count: number
        percentage: string
    }[]
    roleBreakdown: {
        parent: { count: number; percentage: string }
        staff: { count: number; percentage: string }
    }
    statusBreakdown: {
        status: string
        count: number
        percentage: string
    }[]
    topPerformers: {
        name: string
        role: string
        referralCode: string
        count: number
        totalValue?: number
    }[]
}

export interface CampusPerformance {
    campus: string
    totalLeads: number
    confirmed: number
    pending: number
    conversionRate: number
    ambassadors: number
    roleDistribution?: { name: string; value: number }[]
    totalStudents?: number
    staffCount?: number
    parentCount?: number
    alumniCount?: number
    othersCount?: number
    systemWideBenefits?: number
    prevBenefits?: number
    prevLeads?: number
    prevConfirmed?: number
}

export interface SystemSettings {
    id: number
    allowNewRegistrations: boolean
    currentAcademicYear: string
    maintenanceMode: boolean
    defaultStudentFee?: number
    staffReferralText?: string | null
    parentReferralText?: string | null
    staffWelcomeMessage?: string | null
    parentWelcomeMessage?: string | null
    alumniWelcomeMessage?: string | null;
    allowManualPayments: boolean;
    updatedAt: Date;
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
    role: 'Parent' | 'Staff' | 'Alumni' | 'Others'
    email: string
    assignedCampus: string
    empId?: string
    childEprNo?: string
}

export interface BenefitSlab {
    slabId: number
    tierName?: string | null
    referralCount: number
    yearFeeBenefitPercent: number
    longTermExtraPercent: number
    baseLongTermPercent: number
    description?: string | null
}
