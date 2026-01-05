'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'

/**
 * Get current registration status (public - anyone can read)
 */
export async function getRegistrationStatus(): Promise<boolean> {
    try {
        const settings = await prisma.systemSettings.findFirst()
        return settings?.allowNewRegistrations ?? true // Default to true if not found
    } catch (error) {
        console.error('Error fetching registration status:', error)
        return true // Fail open - allow registration if there's an error
    }
}

export async function getSystemSettings() {
    try {
        const settings = await prisma.systemSettings.findFirst()
        if (!settings) {
            // Return default settings if none exist
            return {
                allowNewRegistrations: true,
                currentAcademicYear: '2025-2026',
                defaultStudentFee: 60000,
                maintenanceMode: false
            }
        }
        return settings
    } catch (error) {
        console.error('Error fetching system settings:', error)
        return {
            allowNewRegistrations: true,
            currentAcademicYear: '2025-2026',
            defaultStudentFee: 60000,
            maintenanceMode: false
        }
    }
}

// Update System Settings
export async function updateSystemSettings(data: {
    currentAcademicYear?: string
    maintenanceMode?: boolean
    allowNewRegistrations?: boolean
    staffReferralText?: string
    parentReferralText?: string
    staffWelcomeMessage?: string
    parentWelcomeMessage?: string
    alumniReferralText?: string
    alumniWelcomeMessage?: string
}) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

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
                ...(data.currentAcademicYear && { currentAcademicYear: data.currentAcademicYear }),
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
                currentAcademicYear: data.currentAcademicYear || '2025-2026',
                maintenanceMode: data.maintenanceMode || false,
                allowNewRegistrations: data.allowNewRegistrations ?? true,
                staffReferralText: data.staffReferralText,
                parentReferralText: data.parentReferralText,
                staffWelcomeMessage: data.staffWelcomeMessage,
                parentWelcomeMessage: data.parentWelcomeMessage,
                alumniReferralText: data.alumniReferralText,
                alumniWelcomeMessage: data.alumniWelcomeMessage
            }
        })

        if (Object.keys(changeLog).length > 0) {
            await logAction('UPDATE', 'settings', `Config updated by ${user.fullName}`, id.toString(), { changes: changeLog })
        }
        revalidatePath('/superadmin')
        return { success: true, data: settings }
    } catch (error) {
        console.error('Error updating system settings:', error)
        return { success: false, error: 'Failed to update system settings' }
    }
}

// --- Academic Year Actions ---

export async function getAcademicYears() {
    try {
        const years = await (prisma as any).academicYear.findMany({
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

        // Optionally set as current if it's the first one?
        // For now just create
        await (prisma as any).academicYear.create({
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

        // 1. Transaction to update SystemSettings AND AcademicYear table
        await prisma.$transaction(async (tx) => {
            // Update Settings
            const settings = await tx.systemSettings.findFirst()
            if (settings) {
                await tx.systemSettings.update({
                    where: { id: settings.id },
                    data: { currentAcademicYear: yearString }
                })
            }

            // Unset current for all
            await (tx as any).academicYear.updateMany({
                data: { isCurrent: false }
            })

            // Set specific year as current
            await (tx as any).academicYear.update({
                where: { year: yearString },
                data: { isCurrent: true }
            })
        })

        return { success: true }
    } catch (error) {
        console.error('Error setting current academic year:', error)
        return { success: false, error: 'Failed to set current year' }
    }
}
