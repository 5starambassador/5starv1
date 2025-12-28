/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines permissions for each admin role across dashboard modules
 */

export type AdminRole = 'Super Admin' | 'CampusHead' | 'Campus Head' | 'Finance Admin' | 'FinanceAdmin' | 'Admission Admin' | 'Campus Admin' | 'Staff' | 'Parent'
export type DataScope = 'all' | 'campus' | 'view-only' | 'none' | 'self'

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
    // Ambassador Portal Modules
    referralSubmission: ModulePermission
    referralTracking: ModulePermission
    savingsCalculator: ModulePermission
    rulesAccess: ModulePermission
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
        referralSubmission: { access: true, scope: 'all' },
        referralTracking: { access: true, scope: 'all' },
        savingsCalculator: { access: true, scope: 'all' },
        rulesAccess: { access: true, scope: 'all' }
    },
    'CampusHead': {
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'campus', allowedReports: ['users', 'campus', 'performance', 'new-registrations'] },
        settlements: { access: true, scope: 'campus' },
        marketingKit: { access: true, scope: 'campus' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'campus' },
        settings: { access: false, scope: 'none' },
        referralSubmission: { access: true, scope: 'campus' },
        referralTracking: { access: true, scope: 'campus' },
        savingsCalculator: { access: true, scope: 'campus' },
        rulesAccess: { access: true, scope: 'campus' }
    },
    'Campus Head': {
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'campus', allowedReports: ['users', 'campus', 'performance', 'new-registrations'] },
        settlements: { access: true, scope: 'campus' },
        marketingKit: { access: true, scope: 'campus' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'campus' },
        settings: { access: false, scope: 'none' },
        referralSubmission: { access: true, scope: 'campus' },
        referralTracking: { access: true, scope: 'campus' },
        savingsCalculator: { access: true, scope: 'campus' },
        rulesAccess: { access: true, scope: 'campus' }
    },
    'Finance Admin': {
        analytics: { access: true, scope: 'all' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'all', allowedReports: ['settlements', 'payments'] },
        settlements: { access: true, scope: 'all' },
        marketingKit: { access: false, scope: 'none' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: false, scope: 'none' },
        settings: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: false, scope: 'none' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: false, scope: 'none' }
    },
    'FinanceAdmin': {
        analytics: { access: true, scope: 'all' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'all', allowedReports: ['settlements', 'payments'] },
        settlements: { access: true, scope: 'all' },
        marketingKit: { access: false, scope: 'none' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: false, scope: 'none' },
        settings: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: false, scope: 'none' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: false, scope: 'none' }
    },
    'Admission Admin': {
        analytics: { access: true, scope: 'view-only' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'all', allowedReports: ['pending-leads', 'lead-pipeline', 'new-registrations'] },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: false, scope: 'none' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: true, scope: 'all' },
        settings: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: false, scope: 'none' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: false, scope: 'none' }
    },
    'Campus Admin': {
        analytics: { access: true, scope: 'campus' },
        userManagement: { access: false, scope: 'none' },
        studentManagement: { access: false, scope: 'none' },
        adminManagement: { access: false, scope: 'none' },
        campusPerformance: { access: false, scope: 'none' },
        reports: { access: true, scope: 'campus', allowedReports: ['users', 'campus', 'performance'] },
        settlements: { access: false, scope: 'none' },
        marketingKit: { access: false, scope: 'none' },
        auditLog: { access: false, scope: 'none' },
        supportDesk: { access: false, scope: 'none' },
        settings: { access: false, scope: 'none' },
        referralSubmission: { access: false, scope: 'none' },
        referralTracking: { access: false, scope: 'none' },
        savingsCalculator: { access: false, scope: 'none' },
        rulesAccess: { access: false, scope: 'none' }
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
        referralSubmission: { access: true, scope: 'self' },
        referralTracking: { access: true, scope: 'self' },
        savingsCalculator: { access: true, scope: 'self' },
        rulesAccess: { access: true, scope: 'all' }
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
        referralSubmission: { access: true, scope: 'self' },
        referralTracking: { access: true, scope: 'self' },
        savingsCalculator: { access: true, scope: 'self' },
        rulesAccess: { access: true, scope: 'all' }
    }
}

/**
 * Check if a role has access to a specific module
 */
export function hasModuleAccess(role: string, module: keyof RolePermissions): boolean {
    const permissions = ROLE_PERMISSIONS[role]
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
    const permissions = ROLE_PERMISSIONS[role]
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
    const permissions = ROLE_PERMISSIONS[role]
    if (!permissions) return 'none'
    return permissions[module]?.scope || 'none'
}

/**
 * Get allowed reports for a role
 */
export function getAllowedReports(role: string): string[] {
    const permissions = ROLE_PERMISSIONS[role]
    if (!permissions || !permissions.reports?.access) return []

    const allowedReports = permissions.reports.allowedReports || []
    if (allowedReports.includes('all')) {
        return [
            'users', 'campus', 'admins', 'summary',
            'referral-performance', 'pending-leads', 'monthly-trends',
            'inactive-users', 'top-performers', 'campus-distribution',
            'benefit-tier', 'new-registrations', 'staff-vs-parent', 'lead-pipeline'
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
        permission.scope === 'campus' ? 'Campus Only' :
            permission.scope === 'view-only' ? 'View Only' : 'No Access'

    const actions = []
    if (permission.canCreate) actions.push('Create')
    if (permission.canEdit) actions.push('Edit')
    if (permission.canDelete) actions.push('Delete')

    if (actions.length === 0) return scope
    return `${scope} (${actions.join(', ')})`
}
