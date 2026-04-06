'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'

export type WhatsAppConfigData = {
    id: number
    eventKey: string
    templateName: string
    templateBody?: string | null
    isEnabled: boolean
    requiredVariablesCount: number
    description: string | null
}

export async function getWhatsAppConfigs(): Promise<WhatsAppConfigData[]> {
    const user = await getCurrentUser()
    if (!user || !(await hasPermission('whatsappConfig'))) return []
    try {
        const configs = await prisma.whatsAppConfig.findMany({
            orderBy: { eventKey: 'asc' }
        })
        return configs as any[]
    } catch (error) {
        console.error('Failed to fetch WhatsApp configs:', error)
        return []
    }
}

export async function updateWhatsAppConfig(id: number, data: Partial<WhatsAppConfigData>) {
    if (!(await hasPermission('whatsappConfig'))) {
        return { success: false, error: 'Permission denied' }
    }
    try {
        await prisma.whatsAppConfig.update({
            where: { id },
            data: {
                templateName: data.templateName,
                templateBody: data.templateBody,
                isEnabled: data.isEnabled,
                requiredVariablesCount: (data as any).requiredVariablesCount,
                description: data.description
            } as any
        })
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Failed to update WhatsApp config:', error)
        return { success: false, error: 'Failed to update configuration' }
    }
}

export async function createWhatsAppConfig(data: Omit<WhatsAppConfigData, 'id'>) {
    if (!(await hasPermission('whatsappConfig'))) {
        return { success: false, error: 'Permission denied' }
    }
    try {
        await prisma.whatsAppConfig.create({
            data: {
                eventKey: data.eventKey.toUpperCase().replace(/\s+/g, '_'),
                templateName: data.templateName,
                templateBody: data.templateBody,
                isEnabled: data.isEnabled,
                requiredVariablesCount: (data as any).requiredVariablesCount,
                description: data.description
            } as any
        })
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to create WhatsApp config:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'An event with this key already exists' }
        }
        return { success: false, error: 'Failed to create configuration' }
    }
}

export async function seedDefaultConfigs() {
    const defaults = [
        { eventKey: 'WELCOME_MESSAGE', templateName: 'welcome_message', requiredVariablesCount: 2, description: 'Immediate welcome message with referral code and link.' },
        { eventKey: 'WELCOME_DRIP_DAY1', templateName: 'welcome_drip_day1', requiredVariablesCount: 1, description: 'Day 1 educational video tip.' },
        { eventKey: 'WELCOME_DRIP_DAY3', templateName: 'welcome_drip_day3', requiredVariablesCount: 1, description: 'Day 3 family sharing nudge.' },
        { eventKey: 'REFERRAL_OTP', templateName: 'referral_otp', requiredVariablesCount: 1, description: 'OTP for lead submission form.' },
        { eventKey: 'PAYMENT_REMINDER', templateName: 'payment_reminder', requiredVariablesCount: 2, description: 'Reminder if reg fee is unpaid >24h.' },
        { eventKey: 'KYC_REMINDER', templateName: 'kyc_reminder', requiredVariablesCount: 1, description: 'Nudge for missing Aadhaar or Child info.' },
        { eventKey: 'KYC_APPROVED', templateName: 'kyc_approved', requiredVariablesCount: 2, description: 'Verification success alert.' },
        { eventKey: 'KYC_REJECTED', templateName: 'kyc_rejected', requiredVariablesCount: 3, description: 'Verification failure alert with reason.' },
        { eventKey: 'REFERRAL_CONFIRMED', templateName: 'referral_confirmed', requiredVariablesCount: 2, description: 'Alert when a lead is confirmed.' },
        { eventKey: 'SETTLEMENT_PROCESSED', templateName: 'settlement_processed', requiredVariablesCount: 2, description: 'Alert when commission is paid.' },
        { eventKey: 'PROGRAM_LAUNCH', templateName: 'program_launch_v1', requiredVariablesCount: 1, description: 'Broadcast for new external programs.' },
        { eventKey: 'BANK_DETAILS_REMINDER', templateName: 'bank_details_missing', requiredVariablesCount: 1, description: 'Nudge for missing bank account details.' },
        { eventKey: 'CHILD_DETAILS_REMINDER', templateName: 'child_details_missing', requiredVariablesCount: 1, description: 'Nudge for missing child/campus data.' },
        { eventKey: 'REFERRAL_REMINDER', templateName: 'referral_reminder', requiredVariablesCount: 1, description: 'Nudge for active users with 0 referrals.' },
        { eventKey: 'REFERRAL_MOTIVATION', templateName: 'referral_motivation', requiredVariablesCount: 2, description: 'Gamification nudge for users with 1-4 referrals.' },
        { eventKey: 'REFERRAL_FOLLOWUP', templateName: 'referral_followup', requiredVariablesCount: 2, description: 'Follow-up for stale referral leads.' },
        { eventKey: 'PROGRAM_BROWSE_ABANDON', templateName: 'program_browse_abandon', requiredVariablesCount: 2, description: 'Nudge for users who viewed but didn\'t join a program.' },
        { eventKey: 'AMBASSADOR_PROGRAM_NUDGE', templateName: 'ambassador_program_nudge', requiredVariablesCount: 2, description: 'Alert ambassador about their friend\'s interest.' },
        { eventKey: 'PROGRAM_REGISTRATION_SUCCESS', templateName: 'program_registration_success', requiredVariablesCount: 2, description: 'Congrats to lead for program registration.' },
        { eventKey: 'AMBASSADOR_PROGRAM_SUCCESS', templateName: 'ambassador_program_success', requiredVariablesCount: 2, description: 'Congrats to ambassador for successful program referral.' },
        { eventKey: 'ADMIN_DAILY_DIGEST', templateName: 'admin_daily_digest', requiredVariablesCount: 0, description: 'Daily performance summary for Superadmins.' },
        { eventKey: 'FIVE_STAR_ACHIEVEMENT', templateName: 'five_star_achievement', requiredVariablesCount: 1, description: 'Celebration alert for 5-star status.' },
        { eventKey: 'TICKET_RESPONSE', templateName: 'ticket_response', requiredVariablesCount: 1, description: 'Alert when a support ticket is answered.' },
        { eventKey: 'REFERRAL_SUBMITTED_AMBASSADOR', templateName: 'referral_added_ambassdor', requiredVariablesCount: 3, description: 'Alert ambassador that their referral was submitted.' },
        { eventKey: 'REFERRAL_SUBMITTED_PARENT', templateName: 'referral_message_to_referralparent', requiredVariablesCount: 3, description: 'Welcome message to the referred parent.' },
        { eventKey: 'ACTIVATE_ACCOUNT', templateName: 'activate_your_account', requiredVariablesCount: 1, description: 'Registration nudge for unactivated accounts.' },
        { eventKey: 'PENDING_STATUS', templateName: 'pending_account_status', requiredVariablesCount: 0, description: 'Information about pending verification status.' }
    ]

    try {
        for (const config of defaults) {
            await prisma.whatsAppConfig.upsert({
                where: { eventKey: config.eventKey },
                update: {
                    requiredVariablesCount: config.requiredVariablesCount,
                    description: config.description
                },
                create: config
            })
        }
        return { success: true }
    } catch (error) {
        console.error('Failed to seed configs:', error)
        return { success: false }
    }
}

export async function deleteWhatsAppConfig(id: number) {
    if (!(await hasPermission('whatsappConfig'))) {
        return { success: false, error: 'Permission denied' }
    }
    try {
        await prisma.whatsAppConfig.delete({
            where: { id }
        })
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete WhatsApp config:', error)
        return { success: false, error: 'Failed to delete configuration' }
    }
}
