import { Prisma } from '@prisma/client'

export interface ReferralFilterParams {
    status?: string
    role?: string
    campus?: string
    feeType?: string
    search?: string
    dateRange?: { from: string; to: string }
    grade?: string
}

/**
 * Builds a Prisma WHERE clause for querying ReferralLeads based on filter parameters.
 * Replaces duplicated logic in getReferralStats, getAllReferrals, and exportReferrals.
 * 
 * @param filters - The user-selected filters
 * @param scopeFilter - The base permission/scope filter (mandatory security layer)
 */
export function buildReferralWhereClause(
    filters: ReferralFilterParams | undefined,
    scopeFilter: any
): any {
    // Start with the security scope
    const where: any = { ...scopeFilter }

    if (!filters) return where

    // Status Filter
    if (filters.status && filters.status !== 'All') {
        where.leadStatus = { in: filters.status.split(',') }
    }

    // Role Filter
    if (filters.role && filters.role !== 'All') {
        where.user = { role: { in: filters.role.split(',') } }
    }

    // Campus Filter
    if (filters.campus && filters.campus !== 'All') {
        where.campus = { in: filters.campus.split(',') }
    }

    if (filters.feeType && filters.feeType !== 'All') {
        where.selectedFeeType = { in: filters.feeType.split(',') }
    }

    // Grade Filter
    if (filters.grade && filters.grade !== 'All') {
        where.gradeInterested = { in: filters.grade.split(',') }
    }

    // Search Filter (Multi-field)
    if (filters.search) {
        where.OR = [
            { parentName: { contains: filters.search, mode: 'insensitive' } },
            { parentMobile: { contains: filters.search } },
            { studentName: { contains: filters.search, mode: 'insensitive' } },
            { admissionNumber: { contains: filters.search, mode: 'insensitive' } },
            { user: { fullName: { contains: filters.search, mode: 'insensitive' } } },
            { user: { referralCode: { contains: filters.search, mode: 'insensitive' } } }
        ]
    }

    // Date Range Filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
        where.createdAt = {}
        if (filters.dateRange.from) where.createdAt.gte = new Date(filters.dateRange.from)
        if (filters.dateRange.to) where.createdAt.lte = new Date(filters.dateRange.to)
    }

    return where
}
