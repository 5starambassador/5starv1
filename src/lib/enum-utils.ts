
import { UserRole, AdminRole, AccountStatus, LeadStatus } from '@prisma/client'

/**
 * Maps Prisma Enums to their display string values.
 * The schema now uses PascalCase members (e.g. UserRole.Parent).
 */

export function mapUserRole(role: UserRole): string {
    switch (role) {
        case UserRole.Parent: return 'Parent'
        case UserRole.Staff: return 'Staff'
        case UserRole.Alumni: return 'Alumni'
        case UserRole.Others: return 'Others'
        default: return 'Others'
    }
}

export function mapAdminRole(role: AdminRole): string {
    switch (role) {
        case AdminRole.Super_Admin: return 'Super Admin'
        case AdminRole.Finance_Admin: return 'Finance Admin'
        case AdminRole.Campus_Head: return 'Campus Head'
        case AdminRole.Campus_Admin: return 'Campus Admin'
        case AdminRole.Admission_Admin: return 'Admission Admin'
        default: return 'Admin'
    }
}

export function mapAccountStatus(status: AccountStatus): string {
    switch (status) {
        case AccountStatus.Active: return 'Active'
        case AccountStatus.Inactive: return 'Inactive'
        case AccountStatus.Pending: return 'Pending'
        case AccountStatus.Suspended: return 'Suspended'
        default: return 'Active'
    }
}

export function mapLeadStatus(status: LeadStatus): string {
    switch (status) {
        case LeadStatus.New: return 'New'
        case LeadStatus.Interested: return 'Interested'
        case LeadStatus.Contacted: return 'Contacted'
        case LeadStatus.Follow_up: return 'Follow-up'
        case LeadStatus.Confirmed: return 'Confirmed'
        case LeadStatus.Admitted: return 'Admitted'
        case LeadStatus.Closed: return 'Closed'
        case LeadStatus.Rejected: return 'Rejected'
        default: return 'New'
    }
}

export function toUserRole(role: string): UserRole {
    const normalized = role?.toString().trim().toLowerCase()
    if (normalized === 'parent') return UserRole.Parent
    if (normalized === 'staff') return UserRole.Staff
    if (normalized === 'alumni') return UserRole.Alumni
    return UserRole.Others
}

export function toAdminRole(role: string): AdminRole {
    const normalized = role?.toString().trim().toLowerCase().replace(/[\s_-]/g, '')
    if (normalized === 'superadmin') return AdminRole.Super_Admin
    if (normalized === 'financeadmin') return AdminRole.Finance_Admin
    if (normalized === 'campushead') return AdminRole.Campus_Head
    if (normalized === 'campusadmin') return AdminRole.Campus_Admin
    if (normalized === 'admissionadmin') return AdminRole.Admission_Admin
    return AdminRole.Admission_Admin // Default to Admission_Admin for others
}

export function toLeadStatus(status: string): LeadStatus {
    const normalized = status?.toString().trim().toLowerCase().replace(/[\s-]/g, '')
    switch (normalized) {
        case 'new': return LeadStatus.New
        case 'interested': return LeadStatus.Interested
        case 'contacted': return LeadStatus.Contacted
        case 'followup': return LeadStatus.Follow_up
        case 'confirmed': return LeadStatus.Confirmed
        case 'admitted': return LeadStatus.Admitted
        case 'closed': return LeadStatus.Closed
        case 'rejected': return LeadStatus.Rejected
        default: return LeadStatus.New
    }
}

export function toAccountStatus(status: string): AccountStatus {
    const normalized = status?.toString().trim().toLowerCase()
    switch (normalized) {
        case 'active': return AccountStatus.Active
        case 'inactive': return AccountStatus.Inactive
        case 'pending': return AccountStatus.Pending
        case 'suspended': return AccountStatus.Suspended
        default: return AccountStatus.Active
    }
}
