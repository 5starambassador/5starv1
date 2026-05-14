'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions'

import { getCurrentUser } from '@/lib/auth-service'
import { logAction } from '@/lib/audit-logger'
import { RolePermissions } from '@/types'

// Get permissions for a role (from DB or fallback to defaults)
/**
 * Retrieves the security permissions for a given role.
 * Queries the database first, falling back to static code-based defaults if not found.
 * 
 * @param role - The administrative or ambassador role name
 * @returns Object containing success status and the permission matrix
 */
export async function getRolePermissions(role: string): Promise<{ success: boolean; permissions?: RolePermissions; error?: string; isDefault?: boolean; isDegraded?: boolean }> {
    if (!role) {
        return { success: false, error: 'Role is required' }
    }
    try {
        const normalizedRole = role.replace(/_/g, ' ')
        const dbPerms = await prisma.rolePermissions.findUnique({
            where: { role: normalizedRole }
        })

        // Fallback to default permissions from code
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || DEFAULT_ROLE_PERMISSIONS['Campus Admin']

        if (dbPerms) {
            return {
                success: true,
                permissions: {
                    ...defaultPerms,
                    analytics: { access: (dbPerms as any).analyticsAccess, scope: (dbPerms as any).analyticsScope },
                    userManagement: {
                        access: (dbPerms as any).userMgmtAccess,
                        scope: (dbPerms as any).userMgmtScope,
                        canCreate: (dbPerms as any).userMgmtCreate,
                        canEdit: (dbPerms as any).userMgmtEdit,
                        canDelete: (dbPerms as any).userMgmtDelete
                    },
                    studentManagement: {
                        access: (dbPerms as any).studentMgmtAccess,
                        scope: (dbPerms as any).studentMgmtScope,
                        canCreate: (dbPerms as any).studentMgmtCreate,
                        canEdit: (dbPerms as any).studentMgmtEdit,
                        canDelete: (dbPerms as any).studentMgmtDelete
                    },
                    adminManagement: {
                        access: (dbPerms as any).adminMgmtAccess,
                        scope: (dbPerms as any).adminMgmtScope,
                        canCreate: (dbPerms as any).adminMgmtCreate,
                        canEdit: (dbPerms as any).adminMgmtEdit,
                        canDelete: (dbPerms as any).adminMgmtDelete
                    },
                    campusPerformance: { access: (dbPerms as any).campusPerfAccess, scope: (dbPerms as any).campusPerfScope },
                    reports: { access: (dbPerms as any).reportsAccess, scope: (dbPerms as any).reportsScope },
                    settlements: { access: (dbPerms as any).settlementsAccess, scope: (dbPerms as any).settlementsScope || 'none' },
                    marketingKit: { access: (dbPerms as any).marketingKitAccess, scope: (dbPerms as any).marketingKitScope || 'none' },
                    auditLog: { access: (dbPerms as any).auditLogAccess, scope: (dbPerms as any).auditLogScope || 'all' },
                    supportDesk: { access: (dbPerms as any).supportDeskAccess, scope: (dbPerms as any).supportDeskScope || 'all' },
                    settings: { access: (dbPerms as any).settingsAccess, scope: (dbPerms as any).settingsScope },
                    deletionHub: { access: (dbPerms as any).deletionHubAccess, scope: (dbPerms as any).deletionHubScope || 'none' },
                    referralSubmission: { access: (dbPerms as any).referralSubmissionAccess, scope: (dbPerms as any).referralSubmissionScope || 'none' },
                    referralTracking: { access: (dbPerms as any).referralTrackingAccess, scope: (dbPerms as any).referralTrackingScope || 'none' },
                    savingsCalculator: { access: (dbPerms as any).savingsCalculatorAccess, scope: (dbPerms as any).savingsCalculatorScope || 'none' },
                    rulesAccess: { access: (dbPerms as any).rulesAccessAccess, scope: (dbPerms as any).rulesAccessScope || 'none' },
                    passwordReset: { access: (dbPerms as any).passwordResetAccess, scope: (dbPerms as any).passwordResetScope || 'none' },
                    feeManagement: { access: (dbPerms as any).feeManagementAccess, scope: (dbPerms as any).feeManagementScope || 'none' },
                    engagementCentre: { access: (dbPerms as any).engagementCentreAccess, scope: (dbPerms as any).engagementCentreScope || 'none' },
                    paymentApproval: { access: (dbPerms as any).paymentApprovalAccess, scope: (dbPerms as any).paymentApprovalScope || 'none' },
                    programLeads: { access: (dbPerms as any).programLeadsAccess, scope: (dbPerms as any).programLeadsScope || 'none' },
                    externalPrograms: { access: (dbPerms as any).externalProgramsAccess, scope: (dbPerms as any).externalProgramsScope || 'none' },
                    academicCycles: { access: (dbPerms as any).academicCyclesAccess, scope: (dbPerms as any).academicCyclesScope || 'none' },
                    disasterRecovery: { access: (dbPerms as any).disasterRecoveryAccess, scope: (dbPerms as any).disasterRecoveryScope || 'none' },
                    // New Fields (with mapping if they exist in DB, fallback to defaults)
                    whatsappConfig: (dbPerms as any).whatsappConfigAccess !== undefined ? {
                        access: (dbPerms as any).whatsappConfigAccess,
                        scope: (dbPerms as any).whatsappConfigScope || 'none'
                    } : defaultPerms.whatsappConfig,
                    campaigns: (dbPerms as any).campaignsAccess !== undefined ? {
                        access: (dbPerms as any).campaignsAccess,
                        scope: (dbPerms as any).campaignsScope || 'none'
                    } : defaultPerms.campaigns,
                    marketingManager: (dbPerms as any).marketingManagerAccess !== undefined ? {
                        access: (dbPerms as any).marketingManagerAccess,
                        scope: (dbPerms as any).marketingManagerScope || 'none'
                    } : defaultPerms.marketingManager
                }
            }
        }

        return { success: true, permissions: defaultPerms, isDefault: true }
    } catch (error) {
        console.warn('getRolePermissions: Database unreachable. Falling back to code-based defaults.', (error as any).message)
        // EMERGENCY FALLBACK: Return defaults to prevent app-wide crash
        const normalizedRole = role.replace(/_/g, ' ')
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || DEFAULT_ROLE_PERMISSIONS['Campus Admin']
        return { success: true, permissions: defaultPerms, isDefault: true, isDegraded: true }
    }
}

/**
 * Persists updated permission matrix for a role.
 * Requires Super Admin authorization.
 * 
 * @param role - Target role to update
 * @param permissions - Complete permission matrix object
 */
export async function updateRolePermissions(role: string, permissions: RolePermissions) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    // Check if user has permission to manage admins/permissions
    const adminPermsResult = await getRolePermissions(admin.role)
    const canManage = admin.role === 'Super Admin' || (adminPermsResult.success && adminPermsResult.permissions?.adminManagement.canEdit)

    if (!canManage) {
        return { success: false, error: 'You do not have permission to update role settings' }
    }

    try {
        await prisma.rolePermissions.upsert({
            where: { role },
            create: {
                role,
                analyticsAccess: permissions.analytics.access,
                analyticsScope: permissions.analytics.scope,
                userMgmtAccess: permissions.userManagement.access,
                userMgmtScope: permissions.userManagement.scope,
                userMgmtCreate: permissions.userManagement.canCreate || false,
                userMgmtEdit: permissions.userManagement.canEdit || false,
                userMgmtDelete: permissions.userManagement.canDelete || false,
                studentMgmtAccess: permissions.studentManagement.access,
                studentMgmtScope: permissions.studentManagement.scope,
                studentMgmtCreate: permissions.studentManagement.canCreate || false,
                studentMgmtEdit: permissions.studentManagement.canEdit || false,
                studentMgmtDelete: permissions.studentManagement.canDelete || false,
                adminMgmtAccess: permissions.adminManagement.access,
                adminMgmtScope: permissions.adminManagement.scope,
                adminMgmtCreate: permissions.adminManagement.canCreate || false,
                adminMgmtEdit: permissions.adminManagement.canEdit || false,
                adminMgmtDelete: permissions.adminManagement.canDelete || false,
                campusPerfAccess: permissions.campusPerformance.access,
                campusPerfScope: permissions.campusPerformance.scope,
                reportsAccess: permissions.reports.access,
                reportsScope: permissions.reports.scope,
                settlementsAccess: permissions.settlements.access,
                settlementsScope: permissions.settlements.scope,
                marketingKitAccess: permissions.marketingKit.access,
                marketingKitScope: permissions.marketingKit.scope,
                auditLogAccess: permissions.auditLog.access,
                auditLogScope: permissions.auditLog.scope,
                supportDeskAccess: permissions.supportDesk?.access ?? false,
                supportDeskScope: permissions.supportDesk?.scope ?? 'none',
                settingsAccess: permissions.settings?.access ?? false,
                settingsScope: permissions.settings?.scope ?? 'none',
                deletionHubAccess: permissions.deletionHub?.access ?? false,
                deletionHubScope: permissions.deletionHub?.scope ?? 'none',
                referralSubmissionAccess: permissions.referralSubmission?.access ?? false,
                referralSubmissionScope: permissions.referralSubmission?.scope ?? 'none',
                referralTrackingAccess: permissions.referralTracking?.access ?? false,
                referralTrackingScope: permissions.referralTracking?.scope ?? 'none',
                savingsCalculatorAccess: permissions.savingsCalculator?.access ?? false,
                savingsCalculatorScope: permissions.savingsCalculator?.scope ?? 'none',
                rulesAccessAccess: permissions.rulesAccess?.access ?? false,
                rulesAccessScope: permissions.rulesAccess?.scope ?? 'none',
                passwordResetAccess: permissions.passwordReset?.access ?? false,
                passwordResetScope: permissions.passwordReset?.scope ?? 'none',
                feeManagementAccess: permissions.feeManagement?.access ?? false,
                feeManagementScope: permissions.feeManagement?.scope ?? 'none',
                engagementCentreAccess: permissions.engagementCentre?.access ?? false,
                engagementCentreScope: permissions.engagementCentre?.scope ?? 'none',
                paymentApprovalAccess: permissions.paymentApproval?.access ?? false,
                paymentApprovalScope: permissions.paymentApproval?.scope ?? 'none',
                programLeadsAccess: permissions.programLeads?.access ?? false,
                programLeadsScope: permissions.programLeads?.scope ?? 'none',
                externalProgramsAccess: permissions.externalPrograms?.access ?? false,
                externalProgramsScope: permissions.externalPrograms?.scope ?? 'none',
                academicCyclesAccess: permissions.academicCycles?.access ?? false,
                academicCyclesScope: permissions.academicCycles?.scope ?? 'none',
                disasterRecoveryAccess: permissions.disasterRecovery?.access ?? false,
                disasterRecoveryScope: permissions.disasterRecovery?.scope ?? 'none',
                updatedBy: admin.fullName
            } as any,
            update: {
                analyticsAccess: permissions.analytics.access,
                analyticsScope: permissions.analytics.scope,
                userMgmtAccess: permissions.userManagement.access,
                userMgmtScope: permissions.userManagement.scope,
                userMgmtCreate: permissions.userManagement.canCreate || false,
                userMgmtEdit: permissions.userManagement.canEdit || false,
                userMgmtDelete: permissions.userManagement.canDelete || false,
                studentMgmtAccess: permissions.studentManagement.access,
                studentMgmtScope: permissions.studentManagement.scope,
                studentMgmtCreate: permissions.studentManagement.canCreate || false,
                studentMgmtEdit: permissions.studentManagement.canEdit || false,
                studentMgmtDelete: permissions.studentManagement.canDelete || false,
                adminMgmtAccess: permissions.adminManagement.access,
                adminMgmtScope: permissions.adminManagement.scope,
                adminMgmtCreate: permissions.adminManagement.canCreate || false,
                adminMgmtEdit: permissions.adminManagement.canEdit || false,
                adminMgmtDelete: permissions.adminManagement.canDelete || false,
                campusPerfAccess: permissions.campusPerformance.access,
                campusPerfScope: permissions.campusPerformance.scope,
                reportsAccess: permissions.reports.access,
                reportsScope: permissions.reports.scope,
                settlementsAccess: permissions.settlements.access,
                settlementsScope: permissions.settlements.scope,
                marketingKitAccess: permissions.marketingKit.access,
                marketingKitScope: permissions.marketingKit.scope,
                auditLogAccess: permissions.auditLog.access,
                auditLogScope: permissions.auditLog.scope,
                supportDeskAccess: permissions.supportDesk?.access ?? false,
                supportDeskScope: permissions.supportDesk?.scope ?? 'none',
                settingsAccess: permissions.settings?.access ?? false,
                settingsScope: permissions.settings?.scope ?? 'none',
                deletionHubAccess: permissions.deletionHub?.access ?? false,
                deletionHubScope: permissions.deletionHub?.scope ?? 'none',
                referralSubmissionAccess: permissions.referralSubmission?.access ?? false,
                referralSubmissionScope: permissions.referralSubmission?.scope ?? 'none',
                referralTrackingAccess: permissions.referralTracking?.access ?? false,
                referralTrackingScope: permissions.referralTracking?.scope ?? 'none',
                savingsCalculatorAccess: permissions.savingsCalculator?.access ?? false,
                savingsCalculatorScope: permissions.savingsCalculator?.scope ?? 'none',
                rulesAccessAccess: permissions.rulesAccess?.access ?? false,
                rulesAccessScope: permissions.rulesAccess?.scope ?? 'none',
                passwordResetAccess: permissions.passwordReset?.access ?? false,
                passwordResetScope: permissions.passwordReset?.scope ?? 'none',
                feeManagementAccess: permissions.feeManagement?.access ?? false,
                feeManagementScope: permissions.feeManagement?.scope ?? 'none',
                engagementCentreAccess: permissions.engagementCentre?.access ?? false,
                engagementCentreScope: permissions.engagementCentre?.scope ?? 'none',
                paymentApprovalAccess: permissions.paymentApproval?.access ?? false,
                paymentApprovalScope: permissions.paymentApproval?.scope ?? 'none',
                programLeadsAccess: permissions.programLeads?.access ?? false,
                programLeadsScope: permissions.programLeads?.scope ?? 'none',
                externalProgramsAccess: permissions.externalPrograms?.access ?? false,
                externalProgramsScope: permissions.externalPrograms?.scope ?? 'none',
                academicCyclesAccess: permissions.academicCycles?.access ?? false,
                academicCyclesScope: permissions.academicCycles?.scope ?? 'none',
                disasterRecoveryAccess: permissions.disasterRecovery?.access ?? false,
                disasterRecoveryScope: permissions.disasterRecovery?.scope ?? 'none',
                whatsappConfigAccess: permissions.whatsappConfig?.access ?? false,
                whatsappConfigScope: permissions.whatsappConfig?.scope ?? 'none',
                campaignsAccess: permissions.campaigns?.access ?? false,
                campaignsScope: permissions.campaigns?.scope ?? 'none',
                marketingManagerAccess: permissions.marketingManager?.access ?? false,
                marketingManagerScope: permissions.marketingManager?.scope ?? 'none',
                updatedBy: admin.fullName
            } as any
        })

        revalidatePath('/')

        // Log the action (1.5)
        await logAction('PERMISSION_CHANGE', 'permissions', `Updated permissions for role: ${role}`, role, JSON.stringify({ permissions }))

        return { success: true }
    } catch (error: any) {
        console.error('Update permissions error:', error)
        return { success: false, error: `Failed to update permissions: ${error.message || 'Unknown error'}` }
    }
}

/**
 * Resets a role's permissions to the system's hardcoded defaults.
 * Deletes the database override for the role.
 * @param role - The role name to reset.
 * @returns Object indicating success.
 */
export async function resetRolePermissions(role: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    // Check if user has permission to manage admins/permissions
    const adminPermsResult = await getRolePermissions(admin.role)
    const canManage = admin.role === 'Super Admin' || (adminPermsResult.success && adminPermsResult.permissions?.adminManagement.canEdit)

    if (!canManage) {
        return { success: false, error: 'You do not have permission to reset role settings' }
    }

    try {
        await prisma.rolePermissions.deleteMany({
            where: { role }
        })

        revalidatePath('/')

        // Log the action (1.5)
        await logAction('PERMISSION_CHANGE', 'permissions', `Reset permissions for role: ${role} to defaults`, role)

        return { success: true }
    } catch (error) {
        console.error('Reset permissions error:', error)
        return { success: false, error: 'Failed to reset permissions' }
    }
}
