import 'server-only'
import { getRolePermissions } from '@/app/permission-actions'
import { getCurrentUser } from './auth-service'
import { DEFAULT_ROLE_PERMISSIONS, RolePermissions } from './permissions'
import { cache } from 'react'

/**
 * Get permissions for the currently logged-in admin
 */
export const getMyPermissions = cache(async () => {
    const user = await getCurrentUser()
    if (!user) return null

    // Start with code defaults as the base (covers any newly added module keys)
    // Normalize role name: Prisma enums use underscores (Super_Admin), 
    // but permissions logic uses spaces (Super Admin).
    const normalizedRole = user.role.replace(/_/g, ' ')
    const codeDefaults = DEFAULT_ROLE_PERMISSIONS[normalizedRole] as RolePermissions | undefined

    const result = await getRolePermissions(normalizedRole)
    if (result.success && result.permissions) {
        // Merge: code defaults fill in any keys missing from the DB record
        // DB values take precedence for keys that ARE present in the DB
        return { ...codeDefaults, ...(result.permissions as RolePermissions) } as RolePermissions
    }

    // Fallback to coded defaults if DB fetch fails or role not in DB
    return codeDefaults || null
})

/**
 * Check if the current user has access to a specific module
 */
export async function hasPermission(module: keyof RolePermissions) {
    const perms = await getMyPermissions()
    if (!perms) return false

    // Note: Super Admin permissions are also managed via the matrix, 
    // but defaults ensure they have full access.
    return perms[module]?.access || false
}

/**
 * Get the data scope for the current user and module
 */
export async function getPermissionScope(module: keyof RolePermissions) {
    const perms = await getMyPermissions()
    if (!perms) return 'none'
    return perms[module]?.scope || 'none'
}

/**
 * Get a Prisma where clause filter based on the user's permission scope
 * 
 * Scope meanings:
 * - 'all': No filter (see all data across all campuses)
 * - 'campus': Filter to user's assigned campus only
 * - 'self': Filter to user's own data (userId match)
 * - 'view-only': Same as 'all' or 'campus' but read-only (handled separately)
 * - 'campus-view': Filter to assigned campus AND read-only
 * - 'none': No access (returns null)
 * 
 * @param module - The permission module to check
 * @param options - Options for the filter
 * @returns Prisma where clause object or null if no access
 */
export async function getScopeFilter(
    module: keyof RolePermissions,
    options: {
        campusField?: string  // Field name for campus filtering (default: 'campusId')
        campusNameField?: string // Optional: Field name for campus name string filtering
        userField?: string    // Field name for user filtering (default: 'userId')
        useCampusName?: boolean // Use campus name string instead of ID
    } = {}
): Promise<{ filter: Record<string, any> | null; isReadOnly: boolean }> {
    const user = await getCurrentUser()
    if (!user) return { filter: null, isReadOnly: true }

    const scope = await getPermissionScope(module)
    const { campusField = 'campusId', campusNameField = null, userField = 'userId', useCampusName = false } = options

    switch (scope) {
        case 'all':
            return { filter: {}, isReadOnly: false } // No filter - see everything

        case 'campus':
        case 'campus-view':
            // Filter to assigned campus
            const isReadOnly = scope === 'campus-view'
            const campusId = (user as any).campusId

            if (!user.assignedCampus && !campusId) {
                return { filter: null, isReadOnly: true } // No campus assigned
            }

            // If we have both, and both fields are provided in options, use OR for robustness
            if (campusId && user.assignedCampus && campusNameField) {
                return {
                    filter: {
                        OR: [
                            { [campusField]: campusId },
                            { [campusNameField]: { contains: user.assignedCampus, mode: 'insensitive' } }
                        ]
                    },
                    isReadOnly
                }
            }

            // Fallback to single field
            if (useCampusName && user.assignedCampus) {
                return {
                    filter: { [campusField]: { contains: user.assignedCampus, mode: 'insensitive' } },
                    isReadOnly
                }
            }
            return { filter: { [campusField]: campusId }, isReadOnly }

        case 'self':
            // Filter to own data only (userId exists on User, adminId on Admin)
            const userId = (user as any).userId || (user as any).adminId
            return { filter: { [userField]: userId }, isReadOnly: false }

        case 'view-only':
            // Can see but not edit - return same as 'all' but flag as read-only
            return { filter: {}, isReadOnly: true }

        case 'none':
        default:
            return { filter: null, isReadOnly: true } // No access
    }
}

/**
 * Quick check if user can edit (checks both scope and granular canEdit flag)
 */
export async function canEdit(module: keyof RolePermissions): Promise<boolean> {
    const perms = await getMyPermissions()
    if (!perms || !perms[module]?.access) return false

    const scope = perms[module].scope
    const isReadOnlyScope = scope === 'view-only' || scope === 'campus-view' || scope === 'none'

    // If the module has an explicit canEdit flag, honor it. Otherwise, rely on scope.
    if (perms[module].canEdit !== undefined) {
        return perms[module].canEdit && !isReadOnlyScope
    }

    return !isReadOnlyScope
}

/**
 * Quick check if user can delete (checks both scope and granular canDelete flag)
 */
export async function canDelete(module: keyof RolePermissions): Promise<boolean> {
    const perms = await getMyPermissions()
    if (!perms || !perms[module]?.access) return false

    const scope = perms[module].scope
    const isReadOnlyScope = scope === 'view-only' || scope === 'campus-view' || scope === 'none'

    // If the module has an explicit canDelete flag, honor it. Otherwise, rely on scope.
    if (perms[module].canDelete !== undefined) {
        return perms[module].canDelete && !isReadOnlyScope
    }

    return !isReadOnlyScope
}

/**
 * Check if the current user can perform a specific action on a module
 * This is the primary utility for granular actions like create/edit/delete.
 */
export async function canPerformAction(
    module: keyof RolePermissions,
    action: 'create' | 'edit' | 'delete'
): Promise<boolean> {
    const perms = await getMyPermissions()
    if (!perms || !perms[module]?.access) return false

    const modulePermission = perms[module]
    const scope = modulePermission.scope
    const isReadOnlyScope = scope === 'view-only' || scope === 'campus-view' || scope === 'none'

    if (isReadOnlyScope) return false

    switch (action) {
        case 'create':
            return modulePermission.canCreate ?? true // Default to true if flag missing but access granted
        case 'edit':
            return modulePermission.canEdit ?? true
        case 'delete':
            return modulePermission.canDelete ?? true
        default:
            return false
    }
}

