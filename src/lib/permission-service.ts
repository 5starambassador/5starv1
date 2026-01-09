import 'server-only'
import { getRolePermissions } from '@/app/permission-actions'
import { getCurrentUser } from './auth-service'
import { ROLE_PERMISSIONS, RolePermissions } from './permissions'

/**
 * Get permissions for the currently logged-in admin
 */
export async function getMyPermissions() {
    const user = await getCurrentUser()
    if (!user) return null

    const result = await getRolePermissions(user.role)
    if (result.success) {
        return result.permissions as RolePermissions
    }

    // Fallback to coded defaults if DB fetch fails or role not in DB
    return ROLE_PERMISSIONS[user.role] as RolePermissions || null
}

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
        userField?: string    // Field name for user filtering (default: 'userId')
        useCampusName?: boolean // Use campus name string instead of ID
    } = {}
): Promise<{ filter: Record<string, any> | null; isReadOnly: boolean }> {
    const user = await getCurrentUser()
    if (!user) return { filter: null, isReadOnly: true }

    const scope = await getPermissionScope(module)
    const { campusField = 'campusId', userField = 'userId', useCampusName = false } = options

    switch (scope) {
        case 'all':
            return { filter: {}, isReadOnly: false } // No filter - see everything

        case 'campus':
            // Filter to assigned campus
            const campusId = (user as any).campusId
            if (!user.assignedCampus && !campusId) {
                return { filter: null, isReadOnly: true } // No campus assigned
            }
            if (useCampusName && user.assignedCampus) {
                return {
                    filter: { [campusField]: { contains: user.assignedCampus, mode: 'insensitive' } },
                    isReadOnly: false
                }
            }
            return { filter: { [campusField]: campusId }, isReadOnly: false }

        case 'campus-view':
            // Filter to assigned campus (Read Only)
            const cvId = (user as any).campusId
            if (!user.assignedCampus && !cvId) {
                return { filter: null, isReadOnly: true }
            }
            if (useCampusName && user.assignedCampus) {
                return {
                    filter: { [campusField]: { contains: user.assignedCampus, mode: 'insensitive' } },
                    isReadOnly: true // Force TRUE
                }
            }
            return { filter: { [campusField]: cvId }, isReadOnly: true } // Force TRUE

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
 * Quick check if user can edit (scope is not view-only or none)
 */
export async function canEdit(module: keyof RolePermissions): Promise<boolean> {
    const scope = await getPermissionScope(module)
    return scope !== 'none' && scope !== 'view-only' && scope !== 'campus-view'
}

