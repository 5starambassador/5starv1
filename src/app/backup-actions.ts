'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { logAction } from "@/lib/audit-logger"

/**
 * BACKUP DATABASE
 * Exports all critical system data as a JSON object.
 * Restricted to Super Admin.
 */
export async function backupDatabase() {
    const user = await getCurrentUser()

    if (!user || user.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const timestamp = new Date().toISOString()

        // Defensive fetching: catch individual table errors to prevent one failure from breaking the whole backup
        const [
            users,
            students,
            leads,
            admins,
            campuses,
            feeStructures,
            settings
        ] = await Promise.all([
            prisma.user.findMany().catch(e => { console.error('Backup: User table failed', e.message); return [] }),
            prisma.student.findMany().catch(e => { console.error('Backup: Student table failed', e.message); return [] }),
            prisma.referralLead.findMany().catch(e => { console.error('Backup: Lead table failed', e.message); return [] }),
            prisma.admin.findMany().catch(e => { console.error('Backup: Admin table failed', e.message); return [] }),
            prisma.campus.findMany().catch(e => { console.error('Backup: Campus table failed', e.message); return [] }),
            prisma.gradeFee.findMany().catch(e => { console.error('Backup: GradeFee table failed', e.message); return [] }),
            prisma.systemSettings.findFirst().catch(e => { console.error('Backup: SystemSettings failed', e.message); return null })
        ])

        const exporterName = 'adminName' in user ? user.adminName : user.fullName
        const backupData = {
            metadata: {
                version: '1.0',
                timestamp,
                exportedBy: exporterName,
                partial: (!users.length || !settings) // Flag if major parts are missing
            },
            data: {
                users,
                students,
                leads,
                admins,
                campuses,
                feeStructures,
                settings
            }
        }

        const stats = {
            users: users.length,
            students: students.length,
            leads: leads.length,
            size: JSON.stringify(backupData).length
        }

        await logAction(
            'EXPORT',
            'system',
            `DATABASE BACKUP created by ${exporterName}`,
            'ALL',
            null,
            stats
        )

        return { success: true, data: backupData }
    } catch (error: any) {
        console.error('Backup Error (Critical):', error)
        return { success: false, error: 'Backup Engine Error: ' + (error.message || 'Unknown') }
    }
}


/**
 * RESTORE DATABASE
 * Wipes current data and restores from a backup object.
 * Restricted to Super Admin.
 */
export async function restoreDatabase(backupData: any) {
    const user = await getCurrentUser()

    if (!user || user.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    if (!backupData || !backupData.data) {
        return { success: false, error: 'Invalid backup data format' }
    }

    const {
        users,
        students,
        leads,
        admins,
        campuses,
        feeStructures,
        settings
    } = backupData.data

    try {
        // Use a transaction to ensure all or nothing
        await prisma.$transaction(async (tx) => {
            // 1. DELETE EXISTING DATA (Reverse Dependency Order)
            // Dependencies:
            // Leads -> Users
            // Students -> Users, Campus
            // Users -> Campus (if linked? No, Users only link to campuses via string sometimes or minimal logic)
            // Admins -> Campus
            // Campuses -> FeeStructure (maybe?)
            // FeeStructures

            // Clean up dependent transactional tables first (same as reset)
            await tx.otpVerification.deleteMany({})
            await tx.notification.deleteMany({})
            await tx.ticketMessage.deleteMany({})
            await tx.supportTicket.deleteMany({})
            await tx.settlement.deleteMany({})

            // Core Data
            await tx.referralLead.deleteMany({})
            await tx.student.deleteMany({})
            await tx.user.deleteMany({}) // Parents/Ambassadors
            await tx.admin.deleteMany({}) // Admins
            await tx.campus.deleteMany({})
            await tx.gradeFee.deleteMany({})

            // System Settings (Upsert usually, but we can delete and create)
            await tx.systemSettings.deleteMany({})

            // 2. RESTORE DATA (Dependency Order)

            // System Settings
            if (settings) {
                // Remove ID to let DB handle it or force it? usually ID=1
                // Backup includes ID.
                await tx.systemSettings.create({ data: settings })
            }

            // Fee Structures
            if (feeStructures && feeStructures.length > 0) {
                await tx.gradeFee.createMany({ data: feeStructures })
            }

            // Campuses
            if (campuses && campuses.length > 0) {
                await tx.campus.createMany({ data: campuses })
            }

            // Admins
            if (admins && admins.length > 0) {
                await tx.admin.createMany({ data: admins })
            }

            // Users
            if (users && users.length > 0) {
                await tx.user.createMany({ data: users })
            }

            // Students
            if (students && students.length > 0) {
                await tx.student.createMany({ data: students })
            }

            // Leads
            if (leads && leads.length > 0) {
                await tx.referralLead.createMany({ data: leads })
            }
        })

        await logAction(
            'IMPORT',
            'system',
            `DATABASE RESTORE performed by ${'adminName' in user ? user.adminName : user.fullName}`,
            'ALL',
            null,
            { restored_from: backupData.metadata?.timestamp }
        )

        return { success: true }

    } catch (error: any) {
        console.error('Restore Error:', error)
        return { success: false, error: 'Failed to restore database: ' + error.message }
    }
}
