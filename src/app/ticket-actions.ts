'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { canEdit, hasPermission, getPermissionScope, getScopeFilter } from '@/lib/permission-service'
import { revalidatePath } from 'next/cache'

// Create a new support ticket
export async function createTicket(data: {
    subject: string
    message: string
    category: string
    campus?: string
}) {
    const user = await getCurrentUser()
    if (!user || !user.userId) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Determine priority based on category
        let priority = 'Medium'
        if (data.category === 'Technical Issue') priority = 'High'
        if (data.category === 'Benefit Discrepancy') priority = 'High'
        if (data.category === 'Fee / Payment Query') priority = 'High'
        if (data.category === 'Login / Account Issue') priority = 'Urgent'
        if (data.category === 'Referral Not Showing') priority = 'Medium'

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: user.userId,
                subject: data.subject,
                message: data.message,
                category: data.category,
                priority,
                campus: data.campus || user.assignedCampus,
                status: 'Open'
            }
        })

        revalidatePath('/support')
        return { success: true, ticket }
    } catch (error: any) {
        console.error('Error creating ticket:', error)
        return { success: false, error: error.message || 'Failed to create ticket' }
    }
}

// Get tickets for the current user (Isolation: Only own tickets)
export async function getUserTickets() {
    const user = await getCurrentUser()
    if (!user || !user.userId) {
        return { success: false, error: 'Not authenticated', tickets: [] }
    }

    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        return { success: true, tickets }
    } catch (error: any) {
        console.error('Error fetching tickets:', error)
        return { success: false, error: error.message, tickets: [] }
    }
}

// Get tickets for admin based on permission SCOPE (Secure multi-campus visibility)
export async function getAdminTickets() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized', tickets: [], counts: { open: 0, inProgress: 0, resolved: 0 } }

    try {
        const { filter } = await getScopeFilter('supportDesk', {
            campusField: 'campus',
            useCampusName: true
        })

        if (!filter) return { success: false, error: 'Permission Denied', tickets: [], counts: { open: 0, inProgress: 0, resolved: 0 } }

        const tickets = await prisma.supportTicket.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        mobileNumber: true,
                        role: true,
                        // The original edit was syntactically incorrect and semantically misplaced.
                        // 'assignedAdminId' is a field on the SupportTicket model, not typically on the related User model.
                        // If the intent was to select the assignedAdminId of the *ticket itself*, it should be at the top level of the include.
                        // If the intent was to select an admin ID associated with the *user*, the User model would need such a field.
                        // Assuming the instruction implies ensuring safe access to adminId where it's relevant,
                        // and given the context of 'user.select', this line is removed as it doesn't fit here.
                        // If a field like 'assignedAdminId' exists on the User model, it should be selected directly.
                        // If the goal was to select the ticket's assignedAdminId, it would be:
                        // include: { user: { select: { ... } }, assignedAdminId: true }
                    }
                },
                messages: true
            }
        })

        // Counts based on scoped visibility
        const openCount = tickets.filter(t => t.status === 'Open').length
        const inProgressCount = tickets.filter(t => t.status === 'In-Progress').length
        const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length

        return {
            success: true,
            tickets,
            counts: { open: openCount, inProgress: inProgressCount, resolved: resolvedCount }
        }
    } catch (error: any) {
        console.error('Error fetching admin tickets:', error)
        return { success: false, error: error.message, tickets: [], counts: { open: 0, inProgress: 0, resolved: 0 } }
    }
}

// Update ticket status (Validated permission/scope)
export async function updateTicketStatus(ticketId: number, status: string) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    if (!await canEdit('supportDesk')) {
        return { success: false, error: 'Permission Denied' }
    }

    try {
        const { filter } = await getScopeFilter('supportDesk', { campusField: 'campus', useCampusName: true })
        if (!filter) return { success: false, error: 'Permission Denied' }

        const updateData: any = { status }
        if (status === 'Resolved' || status === 'Closed') {
            updateData.resolvedAt = new Date()
        }

        const ticket = await prisma.supportTicket.update({
            where: {
                id: ticketId,
                ...filter
            },
            data: {
                ...updateData,
                assignedAdminId: (admin as any)?.adminId || null
            }
        })

        revalidatePath('/tickets')
        revalidatePath('/support')
        return { success: true, ticket }
    } catch (error: any) {
        console.error('Error updating ticket:', error)
        return { success: false, error: error.message }
    }
}

// Add message/response to ticket (FIXED: IDOR VULNERABILITY)
export async function addTicketMessage(ticketId: number, message: string, isInternal: boolean = false) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const userId = (user as any).userId
    const adminId = (user as any).adminId
    const senderType = adminId ? 'Admin' : 'User'
    const senderId = adminId || userId

    try {
        // SECURITY: Verify Ownership or Admin Access
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: { user: true }
        })

        if (!ticket) return { success: false, error: 'Ticket not found' }

        if (senderType === 'User' && ticket.userId !== userId) {
            return { success: false, error: 'Access Denied: You do not own this ticket' }
        }

        if (senderType === 'Admin') {
            if (!await hasPermission('supportDesk')) return { success: false, error: 'Permission Denied' }
            // Scoped Check for Admin
            const { filter } = await getScopeFilter('supportDesk', { campusField: 'campus', useCampusName: true })
            const isAccessible = await prisma.supportTicket.findFirst({
                where: { id: ticketId, ...filter }
            })
            if (!isAccessible) return { success: false, error: 'Access Denied: Ticket outside of campus scope' }
        }

        const ticketMessage = await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId,
                senderType,
                message,
                isInternal
            }
        })

        // Auto-update status
        if (senderType === 'Admin' && ticket.status === 'Open') {
            await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'In-Progress' } })
        } else if (senderType === 'User' && (ticket.status === 'Resolved' || ticket.status === 'Closed')) {
            await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'In-Progress' } })
        }

        // Notifications
        if (senderType === 'Admin' && ticket.user.email) {
            const { EmailService } = await import('@/lib/email-service')
            await EmailService.sendSupportNewMessage(
                ticket.user.email,
                ticket.user.fullName,
                ticket.subject,
                message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                true
            )
        } else if (senderType === 'User' && ticket.assignedAdminId) {
            const assignedAdmin = await prisma.admin.findUnique({ where: { adminId: ticket.assignedAdminId } })
            if (assignedAdmin?.email) {
                const { EmailService } = await import('@/lib/email-service')
                await EmailService.sendSupportNewMessage(
                    assignedAdmin.email,
                    assignedAdmin.adminName,
                    ticket.subject,
                    message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                    false
                )
            }
        }

        revalidatePath('/tickets')
        return { success: true, message: ticketMessage }
    } catch (error: any) {
        console.error('Error adding message:', error)
        return { success: false, error: error.message }
    }
}

// Get ticket counts for dashboard widgets (Scoped)
export async function getTicketCounts() {
    try {
        const { filter } = await getScopeFilter('supportDesk', { campusField: 'campus', useCampusName: true })
        if (!filter) return { open: 0, inProgress: 0, resolved: 0, total: 0 }

        const stats = await prisma.supportTicket.groupBy({
            by: ['status'],
            where: filter,
            _count: true
        })

        const counts: any = { open: 0, inProgress: 0, resolved: 0 }
        stats.forEach(s => {
            if (s.status === 'Open') counts.open = s._count
            if (s.status === 'In-Progress') counts.inProgress = s._count
            if (s.status === 'Resolved' || s.status === 'Closed') counts.resolved += s._count
        })

        return { ...counts, total: counts.open + counts.inProgress + counts.resolved }
    } catch (error: any) {
        console.error('Error getting ticket counts:', error)
        return { open: 0, inProgress: 0, resolved: 0, total: 0 }
    }
}

// Get messages for a specific ticket (Secured)
export async function getTicketMessages(ticketId: number) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } }
            }
        })

        if (!ticket) return { success: false, error: 'Ticket not found' }

        // Secure Ownership check
        const userId = (user as any).userId
        const adminId = (user as any).adminId
        if (!adminId && ticket.userId !== userId) {
            return { success: false, error: 'Access Denied' }
        }

        return { success: true, messages: ticket.messages, status: ticket.status }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Check and update escalations (TRANSACTIONAL SAFETY)
export async function checkEscalations() {
    try {
        const now = new Date()
        const result = await prisma.$transaction(async (tx) => {
            const tickets = await tx.supportTicket.findMany({
                where: { status: { in: ['Open', 'In-Progress'] } }
            })

            let updatedCount = 0
            for (const ticket of tickets) {
                let newLevel = ticket.escalationLevel
                let shouldEscalate = false
                const lastEscalated = ticket.lastEscalatedAt || ticket.createdAt
                const hoursSinceLastEscalation = (now.getTime() - lastEscalated.getTime()) / (1000 * 60 * 60)

                if (ticket.escalationLevel === 1 && hoursSinceLastEscalation > 24) {
                    newLevel = 2; shouldEscalate = true;
                } else if (ticket.escalationLevel === 2 && hoursSinceLastEscalation > 12) {
                    newLevel = 3; shouldEscalate = true;
                } else if (ticket.escalationLevel === 3 && hoursSinceLastEscalation > 6) {
                    newLevel = 4; shouldEscalate = true;
                }

                if (shouldEscalate) {
                    await tx.supportTicket.update({
                        where: { id: ticket.id },
                        data: { escalationLevel: newLevel, lastEscalatedAt: now }
                    })
                    await tx.ticketMessage.create({
                        data: {
                            ticketId: ticket.id,
                            senderId: 0,
                            senderType: 'Admin',
                            message: `System: Ticket escalated to Level ${newLevel} due to time limit.`,
                            isInternal: true
                        }
                    })
                    updatedCount++
                }
            }
            return updatedCount
        })

        return { success: true, count: result }
    } catch (error: any) {
        console.error('Error checking escalations:', error)
        return { success: false, error: error.message }
    }
}

export async function escalateTicket(ticketId: number, reason: string) {
    const admin = await getCurrentUser()
    if (!admin || !(admin as any).adminId) return { success: false, error: 'Unauthorized' }

    try {
        const { filter } = await getScopeFilter('supportDesk', { campusField: 'campus', useCampusName: true })
        if (!filter) return { success: false, error: 'Permission Denied' }

        const ticket = await prisma.supportTicket.findFirst({
            where: { id: ticketId, ...filter }
        })
        if (!ticket) return { success: false, error: 'Ticket not found or out of scope' }

        if (ticket.escalationLevel >= 4) return { success: false, error: 'Max level reached' }

        const newLevel = ticket.escalationLevel + 1
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { escalationLevel: newLevel, lastEscalatedAt: new Date() }
        })

        await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId: (admin as any).adminId || 0,
                senderType: 'Admin',
                message: `Manual Escalation to Level ${newLevel}: ${reason}`,
                isInternal: true
            }
        })

        revalidatePath('/tickets')
        return { success: true, level: newLevel }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Get count of Level 4 tickets
export async function getUrgentTicketCount() {
    try {
        const { filter } = await getScopeFilter('supportDesk', { campusField: 'campus', useCampusName: true })
        if (!filter) return 0

        const count = await prisma.supportTicket.count({
            where: {
                ...filter,
                escalationLevel: 4,
                status: { in: ['Open', 'In-Progress'] }
            }
        })
        return count
    } catch (error) {
        return 0
    }
}
