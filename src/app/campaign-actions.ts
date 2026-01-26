'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { getCurrentUser } from '@/lib/auth-service'

// Helper to check if user is admin
async function checkAdmin() {
    const user = await getCurrentUser()
    if (!user || user.role === 'Parent' || user.role === 'Staff' || user.role === 'Alumni' || user.role === 'Others') {
        throw new Error('Unauthorized: Admin access required')
    }
    return user
}

export async function getCampaigns() {
    try {
        await checkAdmin()
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                logs: {
                    orderBy: { runAt: 'desc' },
                    take: 1
                }
            }
        })
        return { success: true, campaigns }
    } catch (error) {
        console.error('getCampaigns error:', error)
        return { success: false, error: 'Failed to fetch campaigns' }
    }
}

export async function createCampaign(data: {
    name: string,
    subject: string,
    templateBody: string,
    type?: string,
    targetAudience?: any,
    channels?: string[]
}) {
    try {
        await checkAdmin()
        const campaign = await prisma.campaign.create({
            data: {
                name: data.name,
                subject: data.subject,
                templateBody: data.templateBody,
                type: data.type || 'EMAIL',
                targetAudience: data.targetAudience ?? {},
                channels: data.channels || ['EMAIL'],
                status: 'DRAFT'
            }
        })

        await logAction('Create Campaign', 'Marketing', `Created campaign: ${data.name}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, campaign }
    } catch (error) {
        console.error('createCampaign error:', error)
        return { success: false, error: 'Failed to create campaign' }
    }
}

export async function updateCampaign(id: number, data: Partial<{
    name: string,
    subject: string,
    templateBody: string,
    status: string,
    targetAudience: any,
    channels: string[]
}>) {
    try {
        await checkAdmin()
        const campaign = await prisma.campaign.update({
            where: { id },
            data
        })

        await logAction('Update Campaign', 'Marketing', `Updated campaign: ${id}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, campaign }
    } catch (error) {
        console.error('updateCampaign error:', error)
        return { success: false, error: 'Failed to update campaign' }
    }
}

export async function deleteCampaign(id: number) {
    try {
        await checkAdmin()
        await prisma.campaign.delete({
            where: { id }
        })

        await logAction('Delete Campaign', 'Marketing', `Deleted campaign: ${id}`, undefined)
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('deleteCampaign error:', error)
        return { success: false, error: 'Failed to delete campaign' }
    }
}

import { EmailService } from '@/lib/email-service'
import { UserRole } from '@prisma/client'

export async function getAudienceCount(audience: { role: string, campus: string, activityStatus: string }) {
    try {
        await checkAdmin()
        const users = await getFilteredUsers(audience)
        return { success: true, count: users.length }
    } catch (error) {
        return { success: false, error: 'Failed to count audience' }
    }
}

async function getFilteredUsers(audience: { role: string, campus: string, activityStatus: string }) {
    const where: any = {
        status: 'Active',
        email: { not: null }
    }

    if (audience.role !== 'All') {
        where.role = audience.role as UserRole
    }

    if (audience.campus !== 'All') {
        where.assignedCampus = audience.campus
    }

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const users = await prisma.user.findMany({
        where,
        include: {
            referrals: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    })

    if (audience.activityStatus === 'All') return users

    return users.filter(u => {
        const lastActivity = u.referrals[0]?.createdAt || u.createdAt
        const isDormant = new Date(lastActivity) < fourteenDaysAgo
        return audience.activityStatus === 'Dormant' ? isDormant : !isDormant
    })
}

export async function runCampaign(id: number) {
    try {
        await checkAdmin()
        const campaign = await prisma.campaign.findUnique({ where: { id } })
        if (!campaign) return { success: false, error: 'Campaign not found' }

        const audience = (campaign.targetAudience as any) || { role: 'All', campus: 'All', activityStatus: 'All' }
        const targetUsers = await getFilteredUsers(audience)

        if (targetUsers.length === 0) {
            return { success: false, error: 'No users match criteria' }
        }

        let sentCount = 0
        let failedCount = 0
        const errors: any[] = []

        for (const user of targetUsers) {
            if (!user.email) continue

            // Simple template mapping
            const personalizedSubject = campaign.subject
                .replace(/{userName}/g, user.fullName)
                .replace(/{referralCode}/g, user.referralCode || '')

            const personalizedBody = campaign.templateBody
                .replace(/{userName}/g, user.fullName)
                .replace(/{referralCode}/g, user.referralCode || '')

            // In a real high-volume app, consider a queue. Here we iterate small/medium sets.
            const res = await EmailService.sendCampaignEmail(user.email, personalizedSubject, personalizedBody)

            // Using a mock-like behavior if key missing is already in EmailService
            if (res.success) {
                sentCount++
            } else {
                failedCount++
                errors.push({ email: user.email, error: res.error })
            }
        }

        await prisma.campaignLog.create({
            data: {
                campaignId: id,
                status: failedCount === 0 ? 'SUCCESS' : sentCount > 0 ? 'PARTIAL' : 'FAILED',
                recipientCount: targetUsers.length,
                sentCount,
                failedCount,
                errorLog: errors.length > 0 ? errors : undefined
            }
        })

        await prisma.campaign.update({
            where: { id },
            data: {
                lastRunAt: new Date(),
                status: 'ACTIVE'
            }
        })

        await logAction('Run Campaign', 'Marketing', `Executed campaign: ${campaign.name}. Sent: ${sentCount}`, undefined)
        revalidatePath('/superadmin')
        return { success: true, sent: sentCount, failed: failedCount }
    } catch (error) {
        console.error('runCampaign error:', error)
        return { success: false, error: 'Failed to run campaign' }
    }
}
