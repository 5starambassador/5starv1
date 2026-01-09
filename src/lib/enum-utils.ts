
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
    if (role === 'Parent') return UserRole.Parent
    if (role === 'Staff') return UserRole.Staff
    if (role === 'Alumni') return UserRole.Alumni
    return UserRole.Others
}

export function toAdminRole(role: string): AdminRole {
    const normalized = role?.trim()
    if (normalized === 'Super Admin' || normalized === 'Super_Admin') return AdminRole.Super_Admin
    if (normalized === 'Finance Admin' || normalized === 'Finance_Admin') return AdminRole.Finance_Admin
    if (normalized === 'Campus Head' || normalized === 'Campus_Head' || normalized === 'CampusHead') return AdminRole.Campus_Head
    if (normalized === 'Campus Admin' || normalized === 'Campus_Admin' || normalized === 'CampusAdmin') return AdminRole.Campus_Admin
    return AdminRole.Admission_Admin // Default to Admission_Admin for others
}

export function toLeadStatus(status: string): LeadStatus {
    switch (status) {
        case 'New': return LeadStatus.New
        case 'Interested': return LeadStatus.Interested
        case 'Contacted': return LeadStatus.Contacted
        case 'Follow-up': return LeadStatus.Follow_up
        case 'Confirmed': return LeadStatus.Confirmed
        case 'Admitted': return LeadStatus.Admitted
        case 'Closed': return LeadStatus.Closed
        case 'Rejected': return LeadStatus.Rejected
        default: return LeadStatus.New
    }
}

export function toAccountStatus(status: string): AccountStatus {
    switch (status) {
        case 'Active': return AccountStatus.Active
        case 'Inactive': return AccountStatus.Inactive
        case 'Pending': return AccountStatus.Pending
        case 'Suspended': return AccountStatus.Suspended
        default: return AccountStatus.Active
    }
}
