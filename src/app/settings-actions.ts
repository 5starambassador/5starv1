'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { z } from 'zod'

// Validation Schema for Settings
const SettingsUpdateSchema = z.object({
    maintenanceMode: z.boolean().optional(),
    allowNewRegistrations: z.boolean().optional(),
    staffReferralText: z.string().max(500).optional(),
    parentReferralText: z.string().max(500).optional(),
    staffWelcomeMessage: z.string().max(100).optional(),
    parentWelcomeMessage: z.string().max(100).optional(),
    alumniReferralText: z.string().max(500).optional(),
    alumniWelcomeMessage: z.string().max(100).optional(),
})

const SecuritySettingsSchema = z.object({
    sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
    maxLoginAttempts: z.number().int().min(3).max(10).optional(),
    passwordResetExpiryHours: z.number().int().min(1).max(168).optional(),
    twoFactorAuthEnabled: z.boolean().optional(),
    ipWhitelist: z.string().optional(),
})

const LeadManagementSettingsSchema = z.object({
    autoAssignLeads: z.boolean().optional(),
    leadStaleDays: z.number().int().min(1).max(365).optional(),
    followupEscalationDays: z.number().int().min(1).max(30).optional(),
    duplicateDetectionEnabled: z.boolean().optional(),
})

/**
 * Get current registration status (public - anyone can read)
 * EXPERT: Fail-closed (false) implementation.
 */
export async function getRegistrationStatus(): Promise<boolean> {
    try {
        const settings = await prisma.systemSettings.findFirst()
        // Fail-closed: default to FALSE if not found or on error
        return settings?.allowNewRegistrations ?? false
    } catch (error) {
        console.error('Error fetching registration status:', error)
        return false // Fail-closed
    }
}

export async function getSystemSettings() {
    try {
        // Fetch global flags
        const settings = await prisma.systemSettings.findFirst()

        // Fetch current academic year from the consolidated source of truth
        // @ts-ignore - Stale Prisma synchronization issue
        const currentYearRecord = await prisma.academicYear.findFirst({
            where: { isCurrent: true }
        })

        const defaultSettings = {
            allowNewRegistrations: false, // Fail-closed default
            currentAcademicYear: currentYearRecord?.year || '2025-2026',
            defaultStudentFee: 60000,
            maintenanceMode: false,
            id: 0,
            updatedAt: new Date()
        }

        if (!settings) return defaultSettings

        return {
            ...settings,
            currentAcademicYear: currentYearRecord?.year || '2025-2026'
        }
    } catch (error) {
        console.error('Error fetching system settings:', error)
        return {
            allowNewRegistrations: false,
            currentAcademicYear: '2025-2026',
            defaultStudentFee: 60000,
            maintenanceMode: false,
            id: 0,
            updatedAt: new Date()
        }
    }
}

// Update System Settings
export async function updateSystemSettings(rawData: any) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // 1. Zod Validation
        const validation = SettingsUpdateSchema.safeParse(rawData)
        if (!validation.success) {
            return { success: false, error: 'Invalid data format' }
        }
        const data = validation.data

        const existing = await prisma.systemSettings.findFirst()
        const id = existing?.id || 1

        // Track changes for high-fidelity audit
        const changeLog: any = {}
        if (existing) {
            Object.keys(data).forEach((key: string) => {
                const val = (data as any)[key]
                const oldVal = (existing as any)[key]
                if (val !== undefined && val !== oldVal) {
                    changeLog[key] = { from: oldVal, to: val }
                }
            })
        }

        const settings = await prisma.systemSettings.upsert({
            where: { id },
            update: {
                ...(data.maintenanceMode !== undefined && { maintenanceMode: data.maintenanceMode }),
                ...(data.allowNewRegistrations !== undefined && { allowNewRegistrations: data.allowNewRegistrations }),
                ...(data.staffReferralText !== undefined && { staffReferralText: data.staffReferralText }),
                ...(data.parentReferralText !== undefined && { parentReferralText: data.parentReferralText }),
                ...(data.staffWelcomeMessage !== undefined && { staffWelcomeMessage: data.staffWelcomeMessage }),
                ...(data.parentWelcomeMessage !== undefined && { parentWelcomeMessage: data.parentWelcomeMessage }),
                ...(data.alumniReferralText !== undefined && { alumniReferralText: data.alumniReferralText }),
                ...(data.alumniWelcomeMessage !== undefined && { alumniWelcomeMessage: data.alumniWelcomeMessage }),
            },
            create: {
                maintenanceMode: data.maintenanceMode || false,
                allowNewRegistrations: data.allowNewRegistrations ?? false,
                staffReferralText: data.staffReferralText,
                parentReferralText: data.parentReferralText,
                staffWelcomeMessage: data.staffWelcomeMessage,
                parentWelcomeMessage: data.parentWelcomeMessage,
                alumniReferralText: data.alumniReferralText,
                alumniWelcomeMessage: data.alumniWelcomeMessage
            }
        })

        if (Object.keys(changeLog).length > 0) {
            await logAction('UPDATE', 'settings', `Config updated by ${user.fullName}`, id.toString(), null, { changes: changeLog })
        }

        // Fetch current academic year
        // @ts-ignore
        const currentYearRecord = await prisma.academicYear.findFirst({
            where: { isCurrent: true }
        })

        revalidatePath('/superadmin')
        return {
            success: true,
            data: {
                ...settings,
                currentAcademicYear: currentYearRecord?.year || '2025-2026'
            }
        }
    } catch (error) {
        console.error('Error updating system settings:', error)
        return { success: false, error: 'Failed' }
    }
}

// --- Security Settings ---

export async function getSecuritySettings() {
    try {
        const settings = await prisma.securitySettings.findFirst()
        if (!settings) {
            return {
                sessionTimeoutMinutes: 30,
                maxLoginAttempts: 5,
                passwordResetExpiryHours: 24,
                twoFactorAuthEnabled: false,
                ipWhitelist: ''
            }
        }
        return settings
    } catch (error) {
        console.error('Error getting security settings:', error)
        return null
    }
}

export async function updateSecuritySettings(rawData: any) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        const validation = SecuritySettingsSchema.safeParse(rawData)
        if (!validation.success) return { success: false, error: 'Invalid data' }
        const data = validation.data

        const existing = await prisma.securitySettings.findFirst()
        const id = existing?.id || 1

        // Track changes for high-fidelity audit
        const changeLog: any = {}
        if (existing) {
            Object.keys(data).forEach((key: string) => {
                const val = (data as any)[key]
                const oldVal = (existing as any)[key]
                if (val !== undefined && val !== oldVal) {
                    changeLog[key] = { from: oldVal, to: val }
                }
            })
        }

        const settings = await (prisma.securitySettings as any).upsert({
            where: { id },
            update: data as any,
            create: {
                id,
                sessionTimeoutMinutes: data.sessionTimeoutMinutes || 30,
                maxLoginAttempts: data.maxLoginAttempts || 5,
                passwordResetExpiryHours: data.passwordResetExpiryHours || 24,
                twoFactorAuthEnabled: data.twoFactorAuthEnabled || false,
                ipWhitelist: (data as any).ipWhitelist
            }
        })

        if (Object.keys(changeLog).length > 0) {
            await logAction('UPDATE', 'security', `Security updated by ${user.fullName}`, id.toString(), null, { changes: changeLog })
        }
        revalidatePath('/superadmin')
        return { success: true, data: settings }
    } catch (error) {
        console.error('Error updating security settings:', error)
        return { success: false, error: 'Failed' }
    }
}

// --- Lead Management Settings ---

export async function getLeadManagementSettings() {
    try {
        const settings = await prisma.leadManagementSettings.findFirst()
        return settings || {
            autoAssignLeads: true,
            leadStaleDays: 30,
            followupEscalationDays: 7,
            duplicateDetectionEnabled: true
        }
    } catch (error) {
        return null
    }
}

export async function updateLeadManagementSettings(rawData: any) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        const validation = LeadManagementSettingsSchema.safeParse(rawData)
        if (!validation.success) return { success: false, error: 'Invalid data' }

        const existing = await prisma.leadManagementSettings.findFirst()
        const id = existing?.id || 1
        const data = validation.data

        // Track changes for high-fidelity audit
        const changeLog: any = {}
        if (existing) {
            Object.keys(data).forEach((key: string) => {
                const val = (data as any)[key]
                const oldVal = (existing as any)[key]
                if (val !== undefined && val !== oldVal) {
                    changeLog[key] = { from: oldVal, to: val }
                }
            })
        }

        await prisma.leadManagementSettings.upsert({
            where: { id },
            update: data,
            create: { id, ...data }
        })

        if (Object.keys(changeLog).length > 0) {
            await logAction('UPDATE', 'lead-mgmt', `Lead management updated by ${user.fullName}`, id.toString(), null, { changes: changeLog })
        }

        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed' }
    }
}

// --- Academic Year Actions ---

export async function getAcademicYears() {
    try {
        // @ts-ignore - Stale Prisma synchronization issue
        const years = await prisma.academicYear.findMany({
            orderBy: { startDate: 'desc' }
        })
        return { success: true, data: years }
    } catch (error) {
        console.error('Error getting academic years:', error)
        return { success: false, error: 'Failed' }
    }
}

export async function addAcademicYear(data: { year: string; startDate: Date; endDate: Date }) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // @ts-ignore - Stale Prisma synchronization issue
        await prisma.academicYear.create({
            data: {
                year: data.year,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: true,
                isCurrent: false
            }
        })
        return { success: true }
    } catch (error) {
        console.error('Error adding academic year:', error)
        return { success: false, error: 'Failed to add year' }
    }
}

export async function setCurrentAcademicYear(yearString: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // EXPERT: Sole source of truth is now the AcademicYear table.
        // SystemSettings no longer stores a duplicate string.
        await prisma.$transaction(async (tx) => {
            // Unset current for all
            // @ts-ignore - Stale Prisma synchronization issue
            await tx.academicYear.updateMany({
                data: { isCurrent: false }
            })

            // Set specific year as current
            // @ts-ignore - Stale Prisma synchronization issue
            await tx.academicYear.update({
                where: { year: yearString },
                data: { isCurrent: true }
            })
        })

        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Error setting current academic year:', error)
        return { success: false, error: 'Failed to set current year' }
    }
}
