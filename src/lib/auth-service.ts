import 'server-only'
import { getSession } from './session'
import prisma from './prisma'
import { cache } from 'react'

import { mapAdminRole, mapUserRole } from './enum-utils'

export const getCurrentUser = cache(async () => {
    const session: any = await getSession()
    if (!session || !session.userId) return null

    if (session.userType === 'admin') {
        const admin = await prisma.admin.findUnique({
            where: { adminId: Number(session.userId) }
        })
        if (admin) {
            // Map to User-like structure for compatibility
            return {
                ...admin,
                userId: admin.adminId, // Map for compatibility
                fullName: admin.adminName,
                mobileNumber: admin.adminMobile,
                // Map role back to legacy string
                role: mapAdminRole(admin.role)
            }
        }
    }

    const user = await prisma.user.findUnique({
        where: { userId: Number(session.userId) }
    })

    if (user) {
        let finalUser = {
            ...user,
            role: mapUserRole(user.role)
        }

        if (!user.assignedCampus && user.campusId) {
            // Resolve campus name if missing but ID exists (Legacy/Registration compatibility)
            const campus = await prisma.campus.findUnique({
                where: { id: user.campusId },
                select: { campusName: true }
            })
            if (campus) {
                return { ...finalUser, assignedCampus: campus.campusName }
            }
        }
        // Calculate current year confirmed referrals for Dual Track Benefit display
        const currentYearStart = new Date(new Date().getFullYear(), 0, 1)
        const currentYearCount = await prisma.referralLead.count({
            where: {
                userId: user.userId,
                leadStatus: 'Confirmed',
                confirmedDate: { gte: currentYearStart }
            }
        })

        return { ...finalUser, currentYearCount }
    }

    return null
})
