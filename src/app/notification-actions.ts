'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'

export async function getNotifications(page = 1, limit = 10) {
    const session = await getSession()
    if (!session?.userId) return { success: false, error: 'Unauthorized' }

    try {
        const where: any = {}
        if (session.role === 'admin') {
            where.adminId = session.userId
        } else {
            where.userId = session.userId
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { ...where, isRead: false } })
        ])

        return { success: true, notifications, total, unreadCount }
    } catch (error) {
        console.error('getNotifications error:', error)
        return { success: false, error: 'Failed to fetch notifications' }
    }
}

export async function markAsRead(notificationId: number) {
    const session = await getSession()
    if (!session?.userId) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to mark as read' }
    }
}

export async function markAllAsRead() {
    const session = await getSession()
    if (!session?.userId) return { success: false, error: 'Unauthorized' }

    try {
        const where: any = { isRead: false }
        if (session.role === 'admin') {
            where.adminId = session.userId
        } else {
            where.userId = session.userId
        }

        await prisma.notification.updateMany({
            where,
            data: { isRead: true }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to mark all as read' }
    }
}

export async function createNotification(
    data: {
        userId?: number,
        adminId?: number,
        title: string,
        message: string,
        type?: 'info' | 'success' | 'warning' | 'error',
        link?: string
    }
) {
    try {
        await prisma.notification.create({
            data: {
                userId: data.userId,
                adminId: data.adminId,
                title: data.title,
                message: data.message,
                type: data.type || 'info',
                link: data.link
            }
        })
        return { success: true }
    } catch (error) {
        console.error('createNotification error:', error)
        return { success: false, error: 'Failed to create notification' }
    }
}

export async function getNotificationSettings() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        throw new Error('Unauthorized')
    }

    try {
        const settings = await prisma.notificationSettings.findFirst()
        if (!settings) {
            // Create default if not exists
            return await prisma.notificationSettings.create({
                data: {}
            })
        }
        return settings
    } catch (error) {
        console.error('getNotificationSettings error:', error)
        throw new Error('Failed to fetch notification settings')
    }
}

export async function updateNotificationSettings(data: any) {
    const user = await getCurrentUser()
    // Strict check: Only Super Admin can change global settings
    if (!user || user.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const settings = await prisma.notificationSettings.findFirst()
        const updateData = {
            emailNotifications: data.emailNotifications,
            smsNotifications: data.smsNotifications,
            whatsappNotifications: data.whatsappNotifications,
            leadFollowupReminders: data.leadFollowupReminders,
            reminderFrequencyDays: data.reminderFrequencyDays,
            notifySuperAdminOnNewAdmins: data.notifySuperAdminOnNewAdmins,
            notifyCampusHeadOnNewLeads: data.notifyCampusHeadOnNewLeads,
            updatedBy: (user.fullName as string) || 'Admin'
        }

        if (settings) {
            await prisma.notificationSettings.update({
                where: { id: settings.id },
                data: updateData
            })
        } else {
            await prisma.notificationSettings.create({
                data: updateData
            })
        }
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('updateNotificationSettings error:', error)
        return { success: false, error: 'Failed to update settings' }
    }
}


// ===================== PUSH NOTIFICATION ACTIONS =====================

/**
 * Registers a device token for Push Notifications.
 * Handles "Upsert" logic and ensuring 1:N relationship.
 */
export async function registerDevice(token: string, platform: 'WEB' | 'ANDROID' | 'IOS' = 'WEB') {
    const session = await getSession()
    if (!session?.userId) return { success: false, error: 'Unauthorized' }

    try {
        // Upsert: If token exists, update user & timestamp. If not, create.
        await prisma.deviceToken.upsert({
            where: { token },
            create: {
                userId: session.userId,
                token,
                platform
            },
            update: {
                userId: session.userId, // In case user switched accounts on same device
                lastUsedAt: new Date()
            }
        })
        return { success: true }
    } catch (error) {
        console.error('Register Device Error:', error)
        return { success: false, error: 'Failed to register device' }
    }
}

/**
 * Removes a device token (e.g., on Logout).
 */
export async function unregisterDevice(token: string) {
    try {
        await prisma.deviceToken.delete({
            where: { token }
        })
        return { success: true }
    } catch (error) {
        // Ignore if already deleted
        return { success: true }
    }
}
