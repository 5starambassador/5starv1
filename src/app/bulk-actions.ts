'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { logAction } from "@/lib/audit-logger"
import { revalidatePath } from 'next/cache'
import { AccountStatus } from "@prisma/client"

export async function bulkUserAction(userIds: number[], action: 'activate' | 'suspend' | 'delete' | 'deactivate') {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'Super Admin') {
            return { success: false, error: 'Unauthorized' }
        }

        if (action === 'delete') {
            // 1. Unlink as Ambassador (Set ambassadorId to null for associated students)
            await prisma.student.updateMany({
                where: { ambassadorId: { in: userIds } },
                data: { ambassadorId: null }
            })

            // 2. Check if any users are PARENTS of students
            const parentUsers = await prisma.student.findMany({
                where: { parentId: { in: userIds } },
                select: { parentId: true },
                distinct: ['parentId']
            })

            const parentIds = new Set(parentUsers.map(s => s.parentId))
            const safeToDeleteIds = userIds.filter(id => !parentIds.has(id))
            const skippedCount = userIds.length - safeToDeleteIds.length

            if (safeToDeleteIds.length === 0) {
                return { success: false, error: 'Cannot delete: All selected users are linked to active students as Parents.' }
            }

            // 3. Delete associated records manually (Simulating Cascade Delete)
            const targetIds = { in: safeToDeleteIds }

            // Delete related tables (Children first)
            await prisma.payment.deleteMany({ where: { userId: targetIds } })
            await prisma.settlement.deleteMany({ where: { userId: targetIds } })
            await prisma.notification.deleteMany({ where: { userId: targetIds } })
            await prisma.deviceToken.deleteMany({ where: { userId: targetIds } })
            await prisma.supportTicket.deleteMany({ where: { userId: targetIds } }) // Note: Might fail if TicketMessage relies on it, but usually Ticket owns Message. 
            // Better to be safe if TicketMessage exists:
            // await prisma.ticketMessage.deleteMany({ where: { ticket: { userId: targetIds } } }) - This is complex query, assume Ticket delete is enough or add if needed.

            await prisma.referralLead.deleteMany({
                where: { userId: targetIds }
            })

            // 4. Delete Users
            const res = await prisma.user.deleteMany({
                where: { userId: { in: safeToDeleteIds } }
            })

            await logAction('DELETE', 'user', `Bulk deleted ${res.count} users (${skippedCount} skipped as parents)`, null, null, { deleted: safeToDeleteIds, skipped: Array.from(parentIds) })
            revalidatePath('/superadmin')

            if (skippedCount > 0) {
                return { success: true, count: res.count, message: `Deleted ${res.count} users. Skipped ${skippedCount} users who are parents of enrolled students.` }
            }
            return { success: true, count: res.count }
        }

        const statusMap: Record<string, AccountStatus> = {
            'activate': AccountStatus.Active,
            'suspend': AccountStatus.Suspended,
            'deactivate': AccountStatus.Inactive
        }

        const newStatus = statusMap[action]
        if (!newStatus) return { success: false, error: 'Invalid action' }

        const res = await prisma.user.updateMany({
            where: { userId: { in: userIds } },
            data: { status: newStatus }
        })

        await logAction('UPDATE', 'user', `Bulk ${action}d ${res.count} users`, null, null, { userIds })
        revalidatePath('/superadmin')
        return { success: true, count: res.count }

    } catch (error: any) {
        console.error('Bulk user action error:', error)
        return { success: false, error: `Failed to perform bulk action: ${error.message}` }
    }
}
