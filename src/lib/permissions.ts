/**
 * Role-Based Access Control (RBAC) Architecture
 * This file defines the structure for administrative permissions.
 * The DEFAULT_ROLE_PERMISSIONS serves as the system's hardcoded fallback
 * and the template for database-level overrides in the "Access Matrix".
 */

export type AdminRole = 'Super Admin' | 'Campus Head' | 'Finance Admin' | 'Admission Admin' | 'Campus Admin' | 'Staff' | 'Parent' | 'Alumni' | 'Others'
export type DataScope = 'all' | 'campus' | 'view-only' | 'campus-view' | 'none' | 'self'

export interface ModulePermission {
    access: boolean
    scope: DataScope
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
    reports: ModulePermission & { allowedReports?: string[] }
    settlements: ModulePermission
    marketingKit: ModulePermission
    auditLog: ModulePermission
    supportDesk: ModulePermission
    settings: ModulePermission
    deletionHub: ModulePermission
    passwordReset: ModulePermission
    // Ambassador Portal Modules
    referralSubmission: ModulePermission
    referralTracking: ModulePermission
    savingsCalculator: ModulePermission
    rulesAccess: ModulePermission
    feeManagement: ModulePermission
    engagementCentre: ModulePermission
    paymentApproval: ModulePermission
    programLeads: ModulePermission
    externalPrograms: ModulePermission & { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }
    academicCycles: ModulePermission
    disasterRecovery: ModulePermission
    whatsappConfig?: ModulePermission
    campaigns?: ModulePermission
    marketingManager?: ModulePermission
}

/**
 * System Hardcoded Defaults
 * These are used during the initial setup of a role or if no database override is found.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
    'Super Admin': {
        analytics: { access: true, scope: 'all' },
        userManagement: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true },
        studentManagement: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true },
        adminManagement: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true },
        campusPerformance: { access: true, scope: 'all' },
        reports: { access: true, scope: 'all', allowedReports: ['all'] },
        settlements: { access: true, scope: 'all' },
        marketingKit: { access: true, scope: 'all' },
        auditLog: { access: true, scope: 'all' },
        supportDesk: { access: true, scope: 'all' },
        settings: { access: true, scope: 'all' },
        deletionHub: { access: true, scope: 'all' },
        passwordReset: { access: true, scope: 'all' },
        referralSubmission: { access: true, scope: 'all' },
        referralTracking: { access: true, scope: 'all' },
        savingsCalculator: { access: true, scope: 'all' },
        rulesAccess: { access: true, scope: 'all' },
        feeManagement: { access: true, scope: 'all' },
        engagementCentre: { access: true, scope: 'all' },
        paymentApproval: { access: true, scope: 'all' },
        programLeads: { access: true, scope: 'all' },
        externalPrograms: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true },
        academicCycles: { access: true, scope: 'all' },
        disasterRecovery: { access: true, scope: 'all' },
        whatsappConfig: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true },
        campaigns: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true },
        marketingManager: { access: true, scope: 'all', canCreate: true, canEdit: true, canDelete: true }
    },
    'Campus Head': {
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: true, scope: 'campus', canCreate: false, canEdit: false, canDelete: false },
        studentManagement: { access: true, scope: 'campus', canCreate: false, canEdit: false, canDelete: false },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'campus', allowedReports: ['users', 'campus', 'performance', 'new-registrations', 'financial-roi', 'monitor-trends'] },
        settlements: { access: true, scope: 'campus' },
        marketingKit: { access: true, scope: 'campus' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'campus' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: true, scope: 'campus' },
        savingsCalculator: { access: true, scope: 'campus' },
        rulesAccess: { access: true, scope: 'campus' },
        feeManagement: { access: true, scope: 'campus', canCreate: false, canEdit: false },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' },
        programLeads: { access: false, scope: 'none' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: true, scope: 'campus' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Finance Admin': {
        analytics: { access: true, scope: 'all' },
        userManagement: { access: true, scope: 'view-only' },
        studentManagement: { access: true, scope: 'all', canCreate: false, canEdit: false },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'all', allowedReports: ['settlements', 'payments', 'financial-roi'] },
        settlements: { access: true, scope: 'all' },
        marketingKit: { access: false, scope: 'none' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: false, scope: 'none' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: false, scope: 'none' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: false, scope: 'none' },
        feeManagement: { access: false, scope: 'none' },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: true, scope: 'all' },
        programLeads: { access: false, scope: 'none' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: false, scope: 'none' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Admission Admin': {
        analytics: { access: true, scope: 'view-only' },
        userManagement: { access: true, scope: 'view-only' },
        studentManagement: { access: true, scope: 'all', canCreate: true, canEdit: true },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'all', allowedReports: ['pending-leads', 'lead-pipeline', 'new-registrations'] },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: true, scope: 'all' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'all' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: true, scope: 'all' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: true, scope: 'all' },
        feeManagement: { access: false, scope: 'none' },
        engagementCentre: { access: true, scope: 'all' },
        paymentApproval: { access: true, scope: 'view-only' },
        programLeads: { access: false, scope: 'none' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: true, scope: 'view-only' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Campus Admin': {
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: true, scope: 'campus', canCreate: true, canEdit: true },
        studentManagement: { access: true, scope: 'campus', canCreate: true, canEdit: true },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'campus', allowedReports: ['users', 'campus', 'performance', 'new-registrations', 'pending-leads', 'lead-pipeline'] },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: false, scope: 'none' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'campus' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: true, scope: 'campus' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: true, scope: 'campus' },
        feeManagement: { access: true, scope: 'campus', canCreate: true, canEdit: true },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' },
        programLeads: { access: false, scope: 'none' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: false, scope: 'none' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Staff': {
        analytics: { access: true, scope: 'self' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: false, scope: 'none' },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: true, scope: 'all' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'self' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: true, scope: 'self' },
        referralTracking: { access: true, scope: 'self' },
        savingsCalculator: { access: true, scope: 'self' },
        rulesAccess: { access: true, scope: 'all' },
        feeManagement: { access: false, scope: 'none' },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' },
        programLeads: { access: true, scope: 'self' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: false, scope: 'none' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Parent': {
        analytics: { access: true, scope: 'self' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: false, scope: 'none' },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: true, scope: 'all' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'self' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: true, scope: 'self' },
        referralTracking: { access: true, scope: 'self' },
        savingsCalculator: { access: true, scope: 'self' },
        rulesAccess: { access: true, scope: 'all' },
        feeManagement: { access: false, scope: 'none' },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' },
        programLeads: { access: true, scope: 'self' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: false, scope: 'none' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Alumni': {
        analytics: { access: true, scope: 'self' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: false, scope: 'none' },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: true, scope: 'all' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'self' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: true, scope: 'self' },
        referralTracking: { access: true, scope: 'self' },
        savingsCalculator: { access: true, scope: 'self' },
        rulesAccess: { access: true, scope: 'all' },
        feeManagement: { access: false, scope: 'none' },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' },
        programLeads: { access: true, scope: 'self' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: false, scope: 'none' },
        marketingManager: { access: false, scope: 'none' }
    },
    'Others': {
        analytics: { access: true, scope: 'self' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: false, scope: 'none' },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: true, scope: 'all' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'self' },
        settings: { access: false, scope: 'none' },
        deletionHub: { access: false, scope: 'none' },
        passwordReset: { access: false, scope: 'none' },
        referralSubmission: { access: true, scope: 'self' },
        referralTracking: { access: true, scope: 'self' },
        savingsCalculator: { access: true, scope: 'self' },
        rulesAccess: { access: true, scope: 'all' },
        feeManagement: { access: false, scope: 'none' },
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' },
        programLeads: { access: true, scope: 'self' },
        externalPrograms: { access: false, scope: 'none' },
        academicCycles: { access: false, scope: 'none' },
        disasterRecovery: { access: false, scope: 'none' },
        whatsappConfig: { access: false, scope: 'none' },
        campaigns: { access: false, scope: 'none' },
        marketingManager: { access: false, scope: 'none' }
    },
}
