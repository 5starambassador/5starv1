'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'

// --- Helper: Verify Campus Admin Access ---
async function verifyCampusAccess() {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    // Role check: "CampusHead" is the schema value, "Campus Admin" might be used in UI
    // Role check: Allow "CampusHead", "Campus Head", "Campus Admin"
    if (!user.role.includes('Campus') && user.role !== 'Super Admin') {
        return { error: 'Access Denied: Campus Admin Role Required' }
    }

    if (user.role === 'Super Admin') {
        return { user, campusId: undefined, isSuperAdmin: true }
    }

    // For Campus Admin, we need their assigned campus
    if (!user.assignedCampus) {
        return { error: 'No Campus Assigned to your account' }
    }

    // Resolve campusId from the string name
    const campus = await prisma.campus.findUnique({
        where: { campusName: user.assignedCampus }
    })

    if (!campus) {
        return { error: `Assigned Campus '${user.assignedCampus}' not found in system` }
    }

    return { user, campusId: campus.id, isSuperAdmin: false, campusName: campus.campusName }
}

// --- Stats ---
export async function getCampusStats() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }
    const referralWhere = access.isSuperAdmin ? {} : { campusId: access.campusId }

    try {
        const [totalStudents, newReferrals, pendingAdmissions] = await Promise.all([
            prisma.student.count({ where: whereClause }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    createdAt: {
                        gte: new Date(new Date().setDate(1)) // This month
                    }
                }
            }),
            prisma.referralLead.count({
                where: {
                    ...referralWhere,
                    leadStatus: 'Confirmed' // Ready for admission
                }
            })
        ])

        return { success: true, stats: { totalStudents, newReferrals, pendingAdmissions } }
    } catch (error) {
        console.error('getCampusStats Error:', error)
        return { error: 'Failed to fetch stats' }
    }
}

// --- Students ---
export async function getCampusStudents(query?: string) {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause: any = access.isSuperAdmin ? {} : { campusId: access.campusId }

    if (query) {
        whereClause.OR = [
            { fullName: { contains: query, mode: 'insensitive' } },
            { rollNumber: { contains: query, mode: 'insensitive' } },
        ]
    }

    try {
        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                parent: { select: { fullName: true, mobileNumber: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit for now
        })
        return { success: true, data: students }
    } catch (error) {
        console.error('getCampusStudents Error:', error)
        return { error: 'Failed to fetch students' }
    }
}

// --- Referrals ---
export async function getCampusReferrals() {
    const access = await verifyCampusAccess()
    if (access.error) return { error: access.error }

    const whereClause = access.isSuperAdmin ? {} : { campusId: access.campusId }

    try {
        const referrals = await prisma.referralLead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { fullName: true, role: true } } } // Referred By
        })
        return { success: true, data: referrals }
    } catch (error) {
        console.error('getCampusReferrals Error:', error)
        return { error: 'Failed to fetch referrals' }
    }
}
