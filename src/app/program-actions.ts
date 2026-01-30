'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'
import { getMyPermissions } from '@/lib/permission-service'

/**
 * Fetch all active external programs for the Ambassador Gallery
 */
export async function getActivePrograms() {
    try {
        const programs = await prisma.externalProgram.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, programs }
    } catch (error) {
        console.error('Error fetching programs:', error)
        return { success: false, error: 'Failed to load campaigns' }
    }
}

/**
 * (Admin) Create a new External Program
 */
export async function createExternalProgram(data: {
    title: string
    slug: string
    targetUrl: string
    description?: string
    commissionAmount?: number
    rewardType?: 'CASH' | 'POINTS' | 'NONE'
    autoSyncUrl?: string
}) {


    try {
        const user = await getCurrentUser()
        if (!user) throw new Error('Unauthorized')

        const permissions = await getMyPermissions()
        if (!permissions?.externalPrograms?.canCreate) {
            // Fallback for Super Admin
            if (!user.role.includes('Super Admin')) throw new Error('Unauthorized')
        }

        const program = await prisma.externalProgram.create({
            data: {
                title: data.title,
                slug: data.slug,
                targetUrl: data.targetUrl,
                description: data.description,
                commissionAmount: data.commissionAmount || 0,
                rewardType: data.rewardType || 'NONE',
                autoSyncUrl: data.autoSyncUrl,
                isActive: true
            }
        })
        revalidatePath('/dashboard')
        revalidatePath('/superadmin')
        return { success: true, program }
    } catch (error) {
        console.error('Error creating program:', error)
        return { success: false, error: 'Failed to create program' }
    }
}

/**
 * (Admin) Update an existing External Program
 */
export async function updateExternalProgram(id: number, data: {
    title: string
    slug: string
    targetUrl: string
    description?: string
    commissionAmount?: number
    rewardType?: 'CASH' | 'POINTS' | 'NONE'
    autoSyncUrl?: string
    isActive?: boolean
}) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error('Unauthorized')

        const permissions = await getMyPermissions()
        if (!permissions?.externalPrograms?.canEdit) {
            if (!user.role.includes('Super Admin')) throw new Error('Unauthorized')
        }

        const program = await prisma.externalProgram.update({
            where: { id },
            data: {
                title: data.title,
                slug: data.slug,
                targetUrl: data.targetUrl,
                description: data.description,
                commissionAmount: data.commissionAmount || 0,
                rewardType: data.rewardType || 'NONE',
                autoSyncUrl: data.autoSyncUrl,
                isActive: data.isActive
            }
        })
        revalidatePath('/dashboard')
        revalidatePath('/superadmin')
        return { success: true, program }
    } catch (error) {
        console.error('Error updating program:', error)
        return { success: false, error: 'Failed to update program' }
    }
}

/**
 * Capture a new Lead (Click Tracking)
 */
export async function captureProgramLead(data: {
    slug: string
    referralCode: string
    visitorMobile: string
    visitorName?: string
}) {
    try {
        // 1. Find Program
        const program = await prisma.externalProgram.findUnique({
            where: { slug: data.slug }
        })
        if (!program || !program.isActive) return { success: false, error: 'Program not found or inactive' }

        // 2. Find Referrer
        const referrer = await prisma.user.findUnique({
            where: { referralCode: data.referralCode }
        })
        if (!referrer) return { success: false, error: 'Invalid referral code' }

        // 3. Create Lead
        // Check duplicate? For clicks, we might allow multiple, but let's debounce duplicates within 1 hour in future.
        // For now, simple insert.
        await prisma.programLead.create({
            data: {
                programId: program.id,
                referrerId: referrer.userId,
                visitorMobile: data.visitorMobile,
                visitorName: data.visitorName || 'Anonymous',
                status: 'CLICKED'
            }
        })

        return { success: true, targetUrl: program.targetUrl }
    } catch (error) {
        console.error('Error capturing lead:', error)
        return { success: false, error: 'Failed to process lead' }
    }
}

/**
 * Sync Leads from Google Sheets (CSV)
 * Triggers status update from CLICKED -> REGISTERED
 */
export async function syncProgramLeads() {
    try {
        const programs = await prisma.externalProgram.findMany({
            where: { isActive: true, NOT: { autoSyncUrl: null } }
        })

        const results = []

        for (const program of programs) {
            if (!program.autoSyncUrl) continue;

            try {
                // 1. Fetch CSV
                const response = await fetch(program.autoSyncUrl)
                const text = await response.text()

                // 2. Parse CSV (Simple parsing for Mobile column)
                // We typically expect headers. Let's look for "Mobile" or "Phone"
                const rows = text.split('\n').map(r => r.split(','))
                if (rows.length < 2) continue

                const headers = rows[0].map(h => h.trim().toLowerCase())
                const mobileIndex = headers.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('contact'))

                if (mobileIndex === -1) {
                    results.push({ program: program.title, status: 'Failed', error: 'No Mobile/Phone column found in CSV' })
                    continue
                }

                // 3. Extract Data (Mobile + Student Name)
                const leadsToUpdate = rows.slice(1).map(row => {
                    const rawMobile = row[mobileIndex]
                    const mobile = rawMobile ? rawMobile.replace(/\D/g, '').slice(-10) : null

                    let studentName = null
                    // Try to find Student Name column
                    const nameIndex = headers.findIndex(h =>
                        h.includes('student') || h.includes('child') || h.includes('candidate') || h.includes('name of')
                    )
                    if (nameIndex !== -1) {
                        const rawName = row[nameIndex]
                        if (rawName && rawName.trim().length > 0) studentName = rawName.trim()
                    }

                    return mobile ? { mobile, studentName } : null
                }).filter((l): l is { mobile: string, studentName: string | null } => l !== null)

                if (leadsToUpdate.length === 0) continue

                // 4. Update Database
                // We need to update individually because studentName varies
                let updatedCount = 0

                // Fetch relevant leads first to minimize queries
                const targetMobiles = leadsToUpdate.map(l => l.mobile)
                const potentialLeads = await prisma.programLead.findMany({
                    where: {
                        programId: program.id,
                        status: 'CLICKED',
                        visitorMobile: { in: targetMobiles }
                    }
                })

                // Create a map for quick access
                const leadMap = new Map(potentialLeads.map(l => [l.visitorMobile, l.id]))

                // Perform updates
                const updates = leadsToUpdate.map(async (leadData) => {
                    const leadId = leadMap.get(leadData.mobile)
                    if (leadId) {
                        try {
                            await prisma.programLead.update({
                                where: { id: leadId },
                                data: {
                                    status: 'REGISTERED',
                                    registeredAt: new Date(),
                                    studentName: leadData.studentName // Save the name from sheet
                                }
                            })
                            return 1
                        } catch (e) {
                            return 0
                        }
                    }
                    return 0
                })

                const resultsArray = await Promise.all(updates)
                updatedCount = resultsArray.reduce((acc: number, val) => acc + val, 0)

                results.push({ program: program.title, status: 'Success', synced: updatedCount })

            } catch (err) {
                console.error(`Sync failed for ${program.title}:`, err)
                results.push({ program: program.title, status: 'Error', error: 'Fetch/Parse failed' })
            }
        }

        revalidatePath('/dashboard')
        return { success: true, results }

    } catch (error) {
        console.error('Global Sync Error:', error)
        return { success: false, error: 'Sync Process Failed' }
    }
}
