'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'

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

        if (role === 'Campus Head' && campus) {
            // Campus Head sees tickets from their campus
            whereClause = { campus }
        } else if (role === 'Admission Admin') {
            // Admission Admin sees benefit/referral tickets
            whereClause = {
                category: { in: ['Benefit Discrepancy', 'Referral Not Showing'] }
            }
        }
        // Super Admin sees all tickets (empty where clause)

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

        // Update ticket status to In-Progress if it was Open
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'In-Progress' }
        })

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

        if (role === 'Campus Head' && campus) {
            whereClause = { campus }
        } else if (role === 'Admission Admin') {
            whereClause = {
                category: { in: ['Benefit Discrepancy', 'Referral Not Showing'] }
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
