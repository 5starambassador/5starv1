import { Prisma, LeadStatus, AccountStatus } from '@prisma/client'

/**
 * Common Logic for Audience Query Construction
 * Used by:
 * - campaign-actions.ts (Counting & Sending)
 * - campaign-dispatcher.ts (Batched Dispatch)
 *
 * DESIGN: Uses AND array so filters never clobber each other's OR/fields.
 * All new fields are optional and default to "All" behavior.
 */

export type AudienceFilter = {
    type?: 'AMBASSADORS' | 'PROGRAM_LEADS' | 'REFERRALS' | 'STUDENTS'
    role: string
    campus: string
    activityStatus: string // 'All' | 'Active' | 'Dormant'

    accountHealth?: string      // 'Active' | 'Inactive' | 'All'
    referralMilestone?: string  // '0' | '1' | '2' | '3' | '4' | '5+' | 'All'
    missingInfo?: string        // 'bankDetails' | 'childDetails' | 'None'
    leadFunnelStatus?: string   // 'hasPendingLeads' | 'hasVisitedLeads' | 'hasSubmittedNotConfirmed' | 'hasNoLeads' | 'All'
    leadStatus?: string         // 'New' | 'Contacted' | 'Admitted_Confirmed' | 'Rejected' | 'All'
    programLeadStatus?: string  // 'CLICKED' | 'REGISTERED' | 'All'
}

export const getAmbassadorQuery = (audience: AudienceFilter): Prisma.UserWhereInput => {
    // Use AND array so filters never clobber each other's OR/field assignments
    const andClauses: Prisma.UserWhereInput[] = []

    // ── Account Health ─────────────────────────────────────────────────────────
    const health = audience.accountHealth || 'Active'
    if (health === 'Active') {
        andClauses.push({ status: AccountStatus.Active })
    } else if (health === 'Inactive') {
        andClauses.push({ status: { not: AccountStatus.Active } })
    }
    // 'All' = no filter

    // ── Role ───────────────────────────────────────────────────────────────────
    if (audience.role && audience.role !== 'All') {
        andClauses.push({ role: audience.role as any })
    }

    // ── Campus ─────────────────────────────────────────────────────────────────
    if (audience.campus && audience.campus !== 'All') {
        andClauses.push({ assignedCampus: audience.campus })
    }

    // ── Activity Status (14-day engagement check) ─────────────────────────────
    if (audience.activityStatus && audience.activityStatus !== 'All') {
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        if (audience.activityStatus === 'Active') {
            andClauses.push({
                OR: [
                    { createdAt: { gte: fourteenDaysAgo } },
                    { referrals: { some: { createdAt: { gte: fourteenDaysAgo } } } }
                ]
            })
        } else if (audience.activityStatus === 'Dormant') {
            andClauses.push({ createdAt: { lt: fourteenDaysAgo } })
            andClauses.push({ referrals: { none: { createdAt: { gte: fourteenDaysAgo } } } })
        }
    }

    // ── Referral Milestones ────────────────────────────────────────────────────
    const milestone = audience.referralMilestone
    if (milestone && milestone !== 'All') {
        if (milestone === '0') {
            andClauses.push({ confirmedReferralCount: 0 })
        } else if (milestone === '1') {
            andClauses.push({ confirmedReferralCount: 1 })
        } else if (milestone === '2') {
            andClauses.push({ confirmedReferralCount: 2 })
        } else if (milestone === '3') {
            andClauses.push({ confirmedReferralCount: 3 })
        } else if (milestone === '4') {
            andClauses.push({ confirmedReferralCount: 4 })
        } else if (milestone === '5+') {
            andClauses.push({ confirmedReferralCount: { gte: 5 } })
        }
    }

    // ── Missing Info ───────────────────────────────────────────────────────────
    // UI sends 'None' as default (not undefined), so check both
    const missing = audience.missingInfo
    if (missing && missing !== 'None' && missing !== 'All') {
        if (missing === 'bankDetails') {
            andClauses.push({
                OR: [
                    { accountNumber: null },
                    { accountNumber: '' },
                    { ifscCode: null },
                    { ifscCode: '' }
                ]
            })
        } else if (missing === 'childDetails') {
            andClauses.push({ role: 'Parent' })
            andClauses.push({ students: { none: {} } })
        }
    }

    // ── Lead Funnel Status ─────────────────────────────────────────────────────
    const funnel = audience.leadFunnelStatus
    if (funnel && funnel !== 'All') {
        if (funnel === 'hasSubmittedNotConfirmed') {
            // Has referral leads but NONE confirmed/admitted → perfect for follow-up
            andClauses.push({
                referrals: {
                    some: {},
                    none: { leadStatus: { in: [LeadStatus.Confirmed, LeadStatus.Admitted] } }
                }
            })
        } else if (funnel === 'hasPendingLeads') {
            andClauses.push({
                referrals: {
                    some: {
                        leadStatus: { in: [LeadStatus.New, LeadStatus.Interested, LeadStatus.Follow_up, LeadStatus.Contacted] }
                    }
                }
            })
        } else if (funnel === 'hasVisitedLeads') {
            andClauses.push({
                referrals: { some: { leadStatus: LeadStatus.Contacted } }
            })
        } else if (funnel === 'hasNoLeads') {
            andClauses.push({ referrals: { none: {} } })
        }
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}

export const getStudentQuery = (audience: AudienceFilter): Prisma.StudentWhereInput => {
    const where: Prisma.StudentWhereInput = {
        status: 'Active',
        referralLeadId: { not: null } // Only referral-converted students (not ERP imports)
    }
    if (audience.campus && audience.campus !== 'All') {
        where.campus = { campusName: audience.campus }
    }
    return where
}

export const getReferralQuery = (audience: AudienceFilter): Prisma.ReferralLeadWhereInput => {
    const andClauses: Prisma.ReferralLeadWhereInput[] = []

    // ── Campus ─────────────────────────────────────────────────────────────────
    if (audience.campus && audience.campus !== 'All') {
        andClauses.push({ campus: audience.campus })
    }

    // ── Lead Status (Referral Stage) ───────────────────────────────────────────
    const status = audience.leadStatus
    if (status && status !== 'All') {
        if (status === 'Admitted_Confirmed') {
            andClauses.push({ leadStatus: { in: [LeadStatus.Admitted, LeadStatus.Confirmed] } })
        } else if (status === 'Contacted') {
            andClauses.push({ leadStatus: { in: [LeadStatus.Contacted, LeadStatus.Follow_up, LeadStatus.Interested] } })
        } else if (status === 'New') {
            andClauses.push({ leadStatus: LeadStatus.New })
        } else if (status === 'Rejected') {
            andClauses.push({ leadStatus: LeadStatus.Rejected })
        }
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}

export const getProgramLeadQuery = (audience: AudienceFilter): Prisma.ProgramLeadWhereInput => {
    const andClauses: Prisma.ProgramLeadWhereInput[] = []

    // ── Campus (via Referrer) ──────────────────────────────────────────────────
    if (audience.campus && audience.campus !== 'All') {
        andClauses.push({ referrer: { assignedCampus: audience.campus } })
    }

    // ── Status (Stage) ────────────────────────────────────────────────────────
    const status = audience.programLeadStatus
    if (status && status !== 'All') {
        if (status === 'CLICKED') {
            andClauses.push({ status: 'CLICKED' })
        } else if (status === 'REGISTERED') {
            andClauses.push({ status: 'REGISTERED' })
        }
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}
