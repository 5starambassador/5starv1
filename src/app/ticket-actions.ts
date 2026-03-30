'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { canEdit, hasPermission, getPermissionScope, getScopeFilter } from '@/lib/permission-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { getSession } from '@/lib/session'

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
        logAction('CREATE', 'support', `Ticket created: "${data.subject}" [${priority}]`, ticket.id.toString(), user.userId, { isUser: true, category: data.category })

        // ⚡ INTEGRATION: Trigger Instant Automations
        try {
            const { automationEngine } = await import('@/lib/automation-engine')
            await automationEngine.processImmediateEvent('ON_TICKET_CREATED', user.userId, {
                category: data.category,
                campus: data.campus || (user.assignedCampus ?? undefined)
            })
        } catch (err) {
            console.error('[AutomationEngine] Trigger failed:', err)
        }

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
                    where: { isInternal: false },
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
                    }
                },
                assignedAdmin: {
                    select: {
                        adminName: true
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
        logAction('UPDATE', 'support', `Ticket #${ticketId} status changed to: ${status}`, ticketId.toString())
        return { success: true, ticket }
    } catch (error: any) {
        console.error('Error updating ticket:', error)
        return { success: false, error: error.message }
    }
}

// Add message/response to ticket (FIXED: IDOR VULNERABILITY)
export async function addTicketMessage(ticketId: number, message: string, isInternal: boolean = false, attachmentUrl?: string) {
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

        // Message Level Security: Only admins can mark messages as internal
        if (isInternal && senderType !== 'Admin') {
            return { success: false, error: 'Access Denied: Only administrators can create internal notes' }
        }

        const ticketMessage = await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId,
                senderType,
                message,
                isInternal,
                attachmentUrl
            }
        })

        // Auto-update status
        if (senderType === 'Admin' && (ticket.status === 'Open' || (!isInternal && (ticket.status === 'Resolved' || ticket.status === 'Closed')))) {
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
        logAction(
            'CREATE', 'support',
            `${senderType} replied to ticket #${ticketId}${isInternal ? ' [Internal Note]' : ''}`,
            ticketId.toString(),
            senderId,
            senderType === 'Admin' ? { isAdmin: true } : { isUser: true }
        )
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

        // Filter messages for users
        const filteredMessages = adminId
            ? ticket.messages
            : ticket.messages.filter(m => !m.isInternal)

        return { success: true, messages: filteredMessages, status: ticket.status }
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
        logAction('UPDATE', 'support', `Ticket #${ticketId} manually escalated to Level ${newLevel}: ${reason}`, ticketId.toString(), (admin as any).adminId, { isAdmin: true })
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

export async function getSupportSnippets(category?: string) {
    try {
        const snippets = await prisma.supportSnippet.findMany({
            where: category ? { category } : {},
            orderBy: { title: 'asc' }
        })
        return { success: true, snippets }
    } catch (error: any) {
        console.error('Error fetching snippets:', error)
        return { success: false, error: error.message }
    }
}

export async function addSupportSnippet(title: string, content: string, category?: string) {
    try {
        const snippet = await prisma.supportSnippet.create({
            data: { title, content, category }
        })
        return { success: true, snippet }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function rateSupportTicket(ticketId: number, rating: number, feedback?: string) {
    try {
        const session = await getSession()
        if (!session?.userId) return { success: false, error: 'Unauthorized' }

        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
        if (!ticket || ticket.userId !== Number(session.userId)) {
            return { success: false, error: 'Access Denied' }
        }

        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { rating, feedback }
        })

        revalidatePath('/support')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
