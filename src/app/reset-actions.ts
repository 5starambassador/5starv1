'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { logAction } from "@/lib/audit-logger"

/**
 * PRODUCTION RESET TOOL
 * Clears all transactional data (Users, Students, Referrals)
 * Preserves: Admins, Campuses, Settings
 */
export async function resetDatabase(confirmation: string) {
    const user = await getCurrentUser()

    // 1. Strict Authorization Check
    if (!user || user.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized: Only Super Admin can perform this action' }
    }

    // 2. Confirmation Check
    if (confirmation !== 'DELETE') {
        return { success: false, error: 'Invalid confirmation code' }
    }

    try {
        // 3. Execution (Order matters for foreign keys)

        // Delete OTPs
        const otps = await prisma.otpVerification.deleteMany({})

        // Delete Notifications
        const notifications = await prisma.notification.deleteMany({})

        // Delete Ticket Messages & Tickets
        const msgs = await prisma.ticketMessage.deleteMany({})
        const tickets = await prisma.supportTicket.deleteMany({})

        // Delete Settlements
        const settlements = await prisma.settlement.deleteMany({})

        // Delete Referral Leads (Links Parents -> Students)
        const leads = await prisma.referralLead.deleteMany({})

        // Delete Students (Links Parents -> Students)
        const students = await prisma.student.deleteMany({})

        // Delete Users (Ambassadors/Parents)
        // We must NOT delete Admins, but Admins are in 'Admin' table.
        // 'User' table contains only Ambassadors/Parents.
        const users = await prisma.user.deleteMany({})

        // 4. Audit Log
        await logAction(
            'DELETE',
            'system',
            `DATABASE RESET performed by ${user.adminName}`,
            'ALL',
            null,
            { deleted: { users: users.count, students: students.count, leads: leads.count } }
        )

        return {
            success: true,
            counts: {
                users: users.count,
                students: students.count,
                leads: leads.count,
                settlements: settlements.count
            }
        }

    } catch (error: any) {
        console.error('Database Reset Error:', error)
        return { success: false, error: error.message || 'Failed to reset database' }
    }
}
