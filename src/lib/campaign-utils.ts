import { Prisma } from '@prisma/client'

/**
 * Common Logic for Audience Query Construction
 * Used by:
 * - campaign-actions.ts (Counting)
 * - campaign-dispatcher.ts (Sending)
 */

export type AudienceFilter = {
    type?: 'AMBASSADORS' | 'PROGRAM_LEADS' | 'REFERRALS' | 'STUDENTS'
    role: string
    campus: string
    activityStatus: string // 'All' | 'Active' | 'Dormant'
}

export const getAmbassadorQuery = (audience: AudienceFilter) => {
    const where: Prisma.UserWhereInput = { status: 'Active' }

    if (audience.role !== 'All') where.role = (audience.role as any)
    if (audience.campus !== 'All') where.assignedCampus = audience.campus

    if (audience.activityStatus !== 'All') {
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        if (audience.activityStatus === 'Active') {
            // Active: Either created recently OR has a recent referral
            where.OR = [
                { createdAt: { gte: fourteenDaysAgo } },
                { referrals: { some: { createdAt: { gte: fourteenDaysAgo } } } }
            ]
        } else if (audience.activityStatus === 'Dormant') {
            // Dormant: Created more than 14 days ago AND has no recent referrals
            where.createdAt = { lt: fourteenDaysAgo }
            where.referrals = {
                none: { createdAt: { gte: fourteenDaysAgo } }
            }
        }
    }

    return where
}

export const getStudentQuery = (audience: AudienceFilter) => {
    const where: Prisma.StudentWhereInput = { status: 'Active' }
    if (audience.campus !== 'All') where.campus = { campusName: audience.campus }
    return where
}
