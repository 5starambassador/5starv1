/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines permissions for each admin role across dashboard modules
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
}

export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
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
        paymentApproval: { access: true, scope: 'all' }
    },
    'Campus Head': {
        // MANAGER ROLE: Strategy & Oversight (View Only for Operations, Full Analytics)
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: true, scope: 'campus', canCreate: false, canEdit: false, canDelete: false }, // View Only
        studentManagement: { access: true, scope: 'campus', canCreate: false, canEdit: false, canDelete: false }, // View Only
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
        referralSubmission: { access: true, scope: 'campus' },
        referralTracking: { access: true, scope: 'campus' },
        savingsCalculator: { access: true, scope: 'campus' },
        rulesAccess: { access: true, scope: 'campus' },
        feeManagement: { access: true, scope: 'campus', canCreate: false, canEdit: false }, // View Only
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: false, scope: 'none' }
    },
    'Finance Admin': {
        analytics: { access: true, scope: 'all' },
        userManagement: { access: true, scope: 'view-only' }, // Changed from false/none
        studentManagement: { access: true, scope: 'all', canCreate: false, canEdit: false }, // Changed from false/none (View Only)
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'all', allowedReports: ['settlements', 'payments', 'financial-roi'] }, // Added financial-roi
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
        paymentApproval: { access: true, scope: 'all' }
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
        engagementCentre: { access: false, scope: 'none' },
        paymentApproval: { access: true, scope: 'view-only' }
    },
    'Campus Admin': {
        // OPERATOR ROLE: Execution & Data Entry (Full Edit Access, Basic Reports)
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: true, scope: 'campus', canCreate: true, canEdit: true },
        studentManagement: { access: true, scope: 'campus', canCreate: true, canEdit: true },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'campus', allowedReports: ['users', 'campus', 'performance', 'new-registrations', 'pending-leads', 'lead-pipeline'] }, // No Financial ROI
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
        paymentApproval: { access: false, scope: 'none' }
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
        paymentApproval: { access: false, scope: 'none' }
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
        paymentApproval: { access: false, scope: 'none' }
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
        paymentApproval: { access: false, scope: 'none' }
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
        paymentApproval: { access: false, scope: 'none' }
    },
}

/**
 * Check if a role has access to a specific module
 */
export function hasModuleAccess(role: string, module: keyof RolePermissions): boolean {
    const normalizedRole = role.replace(/_/g, ' ')
    const permissions = ROLE_PERMISSIONS[normalizedRole]
    if (!permissions) return false
    return permissions[module]?.access || false
}

/**
 * Check if a role can perform a specific action on a module
 */
export function canPerformAction(
    role: string,
    module: keyof RolePermissions,
    action: 'create' | 'edit' | 'delete'
): boolean {
    const normalizedRole = role.replace(/_/g, ' ')
    const permissions = ROLE_PERMISSIONS[normalizedRole]
    if (!permissions || !permissions[module]?.access) return false

    const modulePermission = permissions[module]

    switch (action) {
        case 'create':
            return modulePermission.canCreate || false
        case 'edit':
            return modulePermission.canEdit || false
        case 'delete':
            return modulePermission.canDelete || false
        default:
            return false
    }
}

/**
 * Get the data scope for a role and module
 */
export function getDataScope(role: string, module: keyof RolePermissions): DataScope {
    const normalizedRole = role.replace(/_/g, ' ')
    const permissions = ROLE_PERMISSIONS[normalizedRole]
    if (!permissions) return 'none'
    return permissions[module]?.scope || 'none'
}

/**
 * Get allowed reports for a role
 */
export function getAllowedReports(role: string): string[] {
    const normalizedRole = role.replace(/_/g, ' ')
    const permissions = ROLE_PERMISSIONS[normalizedRole]
    if (!permissions || !permissions.reports?.access) return []

    const allowedReports = permissions.reports.allowedReports || []
    if (allowedReports.includes('all')) {
        return [
            'users', 'campus', 'admins', 'summary',
            'referral-performance', 'pending-leads', 'monthly-trends',
            'inactive-users', 'top-performers', 'campus-distribution',
            'benefit-tier', 'new-registrations', 'staff-vs-parent', 'lead-pipeline',
            'conversion-funnel', 'financial-roi', 'target-achievement', 'star-milestones'
        ]
    }

    return allowedReports
}

/**
 * Check if a role can access a specific report
 */
export function canAccessReport(role: string, reportId: string): boolean {
    const allowedReports = getAllowedReports(role)
    return allowedReports.includes(reportId)
}

/**
 * Get human-readable permission description
 */
export function getPermissionDescription(permission: ModulePermission): string {
    if (!permission.access) return 'No Access'

    const scope = permission.scope === 'all' ? 'All Data' :
        permission.scope === 'campus' ? 'Campus Manager' :
            permission.scope === 'view-only' ? 'Global View' :
                permission.scope === 'campus-view' ? 'Campus View' : 'No Access'

    const actions = []
    if (permission.canCreate) actions.push('Create')
    if (permission.canEdit) actions.push('Edit')
    if (permission.canDelete) actions.push('Delete')

    if (actions.length === 0) return scope
    return `${scope} (${actions.join(', ')})`
}
/**
 * Generates a Prisma where filter based on user role and module scope.
 */
export function getPrismaScopeFilter(user: any, module: keyof RolePermissions): any {
    const scope = getDataScope(user.role, module)

    if (scope === 'all') return {}

    // Default filters for common models
    if (scope === 'campus' || scope === 'campus-view') {
        const campusId = user.campusId || (user as any).adminCampusId
        const campusName = user.assignedCampus

        // Return a multi-field filter to cover different model structures
        return {
            OR: [
                ...(campusId ? [{ campusId }] : []),
                ...(campusName ? [{ campus: campusName }] : []),
                ...(campusName ? [{ assignedCampus: campusName }] : [])
            ]
        }
    }

    if (scope === 'self') {
        return { userId: user.userId }
    }

    return { userId: -1 } // Force empty result for unauthorized
}
