'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { canEdit, hasPermission, getPermissionScope } from '@/lib/permission-service'
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

        return { success: true, ticket }
    } catch (error: any) {
        console.error('Error creating ticket:', error)
        return { success: false, error: error.message || 'Failed to create ticket' }
    }
}

// Get tickets for the current user
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

// Get tickets for admin based on role
export async function getAdminTickets(role: string, campus?: string) {
    try {
        let whereClause = {}

        if ((role === 'Campus Head' || role === 'Campus Admin') && campus) {
            // Campus Head and Campus Admin see tickets from their campus
            // OR if escalated to Level 2 (for Campus Head, maybe just campus-specific escalation?)
            // Actually, escalation logic keeps them within campus/category but moves responsibility.
            // If escalated to Admission Admin (Level 3), does Campus Head still see it? Yes.
            // But Campus Head should PRIORITIZE Level 2 tickets.
            // Strict routing:
            whereClause = { campus }
        } else if (role === 'Admission Admin') {
            // Admission Admin sees benefit/referral tickets OR any ticket escalated to Level 3 (that isn't Finance)
            whereClause = {
                OR: [
                    { category: { in: ['Benefit Discrepancy', 'Referral Not Showing'] } },
                    { escalationLevel: { gte: 3 }, category: { not: 'Fee / Payment Query' } }
                ]
            }
        } else if (role === 'Finance Admin') {
            // Finance Admin sees Fee/Payment tickets OR any escalated Fee ticket
            whereClause = {
                category: 'Fee / Payment Query'
            }
        }

        const tickets = await prisma.supportTicket.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        mobileNumber: true,
                        role: true,
                        assignedCampus: true
                    }
                },
                messages: true
            }
        })

        // Get counts by status
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

// Update ticket status
export async function updateTicketStatus(ticketId: number, status: string, adminId?: number) {
    const admin = await getCurrentUser()
    if (!admin) return { success: false, error: 'Unauthorized' }

    // Check permission
    if (!await canEdit('supportDesk')) {
        return { success: false, error: 'Permission Denied: Cannot update ticket status' }
    }
    try {
        const updateData: any = { status }

        if (status === 'Resolved' || status === 'Closed') {
            updateData.resolvedAt = new Date()
        }

        if (adminId) {
            updateData.assignedAdminId = adminId
        }

        const ticket = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: updateData
        })

        return { success: true, ticket }
    } catch (error: any) {
        console.error('Error updating ticket:', error)
        return { success: false, error: error.message }
    }
}

// Add message/response to ticket
export async function addTicketMessage(ticketId: number, message: string, senderType: 'User' | 'Admin', senderId: number, isInternal: boolean = false) {
    if (senderType === 'Admin') {
        const admin = await getCurrentUser()
        if (!admin) return { success: false, error: 'Unauthorized' }
        if (!await hasPermission('supportDesk')) {
            return { success: false, error: 'Permission Denied: Cannot message on support tickets' }
        }
    }
    try {
        const ticketMessage = await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId,
                senderType,
                message,
                isInternal
            }
        })

        // Fetch ticket details for notification
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: {
                user: true
            }
        })

        if (ticket) {
            // Update status logic
            if (senderType === 'Admin') {
                // If Admin replies, set to 'In-Progress' (or 'Resolved' if they mark it so, but this is just adding a message)
                // usually adding a message doesn't auto-resolve, but if it was Open, it becomes In-Progress
                if (ticket.status === 'Open') {
                    await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'In-Progress' } })
                }

                // Notify User
                if (ticket.user.email) {
                    // Import EmailService here to avoid circular deps if any (though likely safe at top)
                    // But wait, `addTicketMessage` is in `ticket-actions.ts`, `EmailService` is in `lib`. Safe.
                    const { EmailService } = await import('@/lib/email-service')
                    await EmailService.sendSupportNewMessage(
                        ticket.user.email,
                        ticket.user.fullName,
                        ticket.subject,
                        message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                        true
                    )
                }

            } else {
                // User replied
                // If closed, maybe reopen?
                if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
                    await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'In-Progress' } })
                } else if (ticket.status === 'Open') {
                    // Keep as Open or move to In-Progress? 
                    // Usually if user replies, it means they are adding info.
                }

                // Notify Assigned Admin (if any)
                if (ticket.assignedAdminId) {
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
            }
        }

        return { success: true, message: ticketMessage }
    } catch (error: any) {
        console.error('Error adding message:', error)
        return { success: false, error: error.message }
    }
}

// Get ticket counts for dashboard widgets
export async function getTicketCounts(role: string, campus?: string) {
    try {
        let whereClause = {}

        if ((role === 'Campus Head' || role === 'Campus Admin') && campus) {
            whereClause = { campus }
        } else if (role === 'Admission Admin') {
            whereClause = {
                OR: [
                    { category: { in: ['Benefit Discrepancy', 'Referral Not Showing'] } },
                    { escalationLevel: { gte: 3 }, category: { not: 'Fee / Payment Query' } }
                ]
            }
        } else if (role === 'Finance Admin') {
            whereClause = {
                category: 'Fee / Payment Query'
            }
        }

        const [open, inProgress, resolved] = await Promise.all([
            prisma.supportTicket.count({ where: { ...whereClause, status: 'Open' } }),
            prisma.supportTicket.count({ where: { ...whereClause, status: 'In-Progress' } }),
            prisma.supportTicket.count({ where: { ...whereClause, status: { in: ['Resolved', 'Closed'] } } })
        ])

        return { open, inProgress, resolved, total: open + inProgress + resolved }
    } catch (error: any) {
        console.error('Error getting ticket counts:', error)
        return { open: 0, inProgress: 0, resolved: 0, total: 0 }
    }
}

// Get messages for a specific ticket (for polling)
export async function getTicketMessages(ticketId: number) {
    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!ticket) {
            return { success: false, error: 'Ticket not found' }
        }

        return { success: true, messages: ticket.messages, status: ticket.status }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Check and update escalations (to be called periodically or on page load)
export async function checkEscalations() {
    try {
        const now = new Date()
        const tickets = await prisma.supportTicket.findMany({
            where: {
                status: { in: ['Open', 'In-Progress'] }
            }
        })

        let updatedCount = 0

        for (const ticket of tickets) {
            let newLevel = ticket.escalationLevel
            let shouldEscalate = false
            const lastEscalated = ticket.lastEscalatedAt || ticket.createdAt
            const hoursSinceLastEscalation = (now.getTime() - lastEscalated.getTime()) / (1000 * 60 * 60)

            // Escalation Logic
            // Level 1 -> 2 (Campus Admin -> Campus Head OR Finance Admin) : > 24h
            if (ticket.escalationLevel === 1 && hoursSinceLastEscalation > 24) {
                newLevel = 2
                shouldEscalate = true
            }
            // Level 2 -> 3 (Campus Head/Finance -> Admission Admin) : > 12h from L2
            else if (ticket.escalationLevel === 2 && hoursSinceLastEscalation > 12) {
                newLevel = 3
                shouldEscalate = true
            }
            // Level 3 -> 4 (Admission Admin -> Super Admin) : > 6h from L3
            else if (ticket.escalationLevel === 3 && hoursSinceLastEscalation > 6) {
                newLevel = 4
                shouldEscalate = true
            }

            if (shouldEscalate) {
                await prisma.supportTicket.update({
                    where: { id: ticket.id },
                    data: {
                        escalationLevel: newLevel,
                        lastEscalatedAt: now
                    }
                })
                updatedCount++

                // Log system message
                await prisma.ticketMessage.create({
                    data: {
                        ticketId: ticket.id,
                        senderId: 0, // System
                        senderType: 'Admin',
                        message: `System: Ticket escalated to Level ${newLevel} due to time limit exceeded.`,
                        isInternal: true
                    }
                })
            }
        }

        return { success: true, count: updatedCount }
    } catch (error: any) {
        console.error('Error checking escalations:', error)
        return { success: false, error: error.message }
    }
}

// Manual Escalation
export async function escalateTicket(ticketId: number, reason: string, adminId: number) {
    try {
        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
        if (!ticket) return { success: false, error: 'Ticket not found' }

        if (ticket.escalationLevel >= 4) {
            return { success: false, error: 'Maximum escalation level reached' }
        }

        const newLevel = ticket.escalationLevel + 1

        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                escalationLevel: newLevel,
                lastEscalatedAt: new Date()
            }
        })

        // Add internal note
        await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId: adminId,
                senderType: 'Admin',
                message: `Manual Escalation to Level ${newLevel}: ${reason}`,
                isInternal: true
            }
        })

        revalidatePath('/superadmin/support')
        return { success: true, level: newLevel }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Get count of Level 4 tickets (Urgent)
export async function getUrgentTicketCount() {
    try {
        const count = await prisma.supportTicket.count({
            where: {
                escalationLevel: 4,
                status: { in: ['Open', 'In-Progress'] }
            }
        })
        return count
    } catch (error) {
        return 0
    }
}
