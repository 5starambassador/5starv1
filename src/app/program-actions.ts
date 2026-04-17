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
        const now = new Date()
        // Create a date for the start of today (midnight) to make endDate inclusive
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const programs = await prisma.externalProgram.findMany({
            where: {
                isActive: true,
                AND: [
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: startOfToday } }
                        ]
                    },
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: now } }
                        ]
                    }
                ]
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, programs }
    } catch (error) {
        console.error('Error fetching programs:', error)
        return { success: false, error: 'Failed to load campaigns' }
    }
}

/**
 * Fetch ALL programs for Admin Management (Includes Future/Expired)
 */
export async function getAllPrograms() {
    try {
        const programs = await prisma.externalProgram.findMany({
            // No Date Filter for Admin
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, programs }
    } catch (error) {
        console.error('Error fetching all programs:', error)
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
    startDate?: Date
    endDate?: Date
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
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: true
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/superadmin')

        // Trigger broadcast notification to all active users
        const { notifyProgramLaunch } = await import('@/lib/notification-helper')
        notifyProgramLaunch(program.title, program.slug).catch(err => {
            console.error('Failed to broadcast program launch notification:', err)
        })

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
    startDate?: Date
    endDate?: Date
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
                isActive: data.isActive,
                startDate: data.startDate,
                endDate: data.endDate
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

        // Check Validity Dates
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        if (program.startDate && now < program.startDate) {
            return { success: false, error: 'Program has not started yet' }
        }
        if (program.endDate && startOfToday > program.endDate) {
            return { success: false, error: 'Program has ended' }
        }

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
 * Robust CSV parser that handles quoted fields correctly
 */
function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        if (!line.trim()) continue;

        const row: string[] = [];
        let inQuotes = false;
        let currentValue = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim());
        rows.push(row);
    }
    return rows;
}

export async function syncProgramLeads() {
    try {
        const programs = await prisma.externalProgram.findMany({
            where: { isActive: true, NOT: { autoSyncUrl: null } }
        })

        const results = []

        for (const program of programs) {
            if (!program.autoSyncUrl) continue;

            try {
                // 1. Fetch CSV with browser-like User-Agent to avoid HTML redirects
                const response = await fetch(program.autoSyncUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                })
                let text = await response.text()

                // Check if we received HTML (redirection/login page) instead of CSV
                if (text.includes('<html') || text.includes('DOCTYPE html')) {
                    console.error(`Sync aborted for "${program.title}": Received HTML content instead of CSV. Check sheet publishing.`)
                    results.push({ program: program.title, status: 'Failed', error: 'Sheet returned HTML (Not Published/Auth Issue)' })
                    continue
                }

                // Remove UTF-8 BOM if present
                if (text.charCodeAt(0) === 0xFEFF) {
                    text = text.substring(1);
                }

                // 2. Parse CSV robustly
                const rows = parseCSV(text)
                if (rows.length < 2) continue

                // 3. Detect Headers (Robustly handle underscores, spaces, hyphens)
                const normalize = (h: string) => h.trim().toLowerCase().replace(/[_\s-]/g, '')
                const headers = rows[0].map(h => normalize(h))

                // Better Mobile detection
                const mobileIndex = headers.findIndex(h =>
                    h === 'mobile' || h === 'phone' || h === 'contact' ||
                    h.includes('mobile') || h.includes('phonenumber') || h.includes('contactnumber')
                )

                // Better Name detection
                const nameIndex = headers.findIndex(h =>
                    h === 'name' || h === 'student' || h === 'studentname' || h === 'fullname' ||
                    h.includes('student') || h.includes('child') || h.includes('candidate') || (h.includes('name') && !h.includes('parent'))
                )

                // detect Payment Status column
                const paymentStatusIndex = headers.findIndex(h =>
                    h.includes('paymentstatus') || h.includes('orderstatus') || h.includes('status')
                )

                if (mobileIndex === -1) {
                    results.push({ program: program.title, status: 'Failed', error: 'No Mobile column found' })
                    continue
                }

                // 4. Extract and Deduplicate Data (Ensure Success wins over Pending)
                const rawLeads = rows.slice(1).map(row => {
                    const rawMobile = row[mobileIndex]
                    if (!rawMobile) return null

                    const mobile = rawMobile.replace(/\D/g, '').slice(-10)
                    if (mobile.length !== 10) return null

                    let studentName = null
                    if (nameIndex !== -1 && row[nameIndex]) {
                        studentName = row[nameIndex].trim()
                    }

                    let paymentStatus = null
                    if (paymentStatusIndex !== -1 && row[paymentStatusIndex]) {
                        paymentStatus = row[paymentStatusIndex].trim().toUpperCase()
                    }

                    return { mobile, studentName, paymentStatus }
                }).filter((l): l is { mobile: string, studentName: string | null, paymentStatus: string | null } => l !== null)

                if (rawLeads.length === 0) {
                    results.push({ program: program.title, status: 'Success', synced: 0, message: 'No valid leads in file' })
                    continue
                }

                // Deduplicate: Group by mobile and merge the "best" data (Success > Pending, Longest Name)
                const successKeywords = ['SUCCESS', 'PAID', 'CONFIRMED', 'COMPLETED', 'CAPTURED']
                const deduplicatedMap = new Map<string, typeof rawLeads[0]>()

                for (const lead of rawLeads) {
                    const existing = deduplicatedMap.get(lead.mobile)
                    if (!existing) {
                        deduplicatedMap.set(lead.mobile, { ...lead })
                        continue
                    }

                    // 1. Prioritize Success Status
                    const isNewSuccess = lead.paymentStatus && successKeywords.includes(lead.paymentStatus)
                    const isExistingSuccess = existing.paymentStatus && successKeywords.includes(existing.paymentStatus)

                    if (isNewSuccess && !isExistingSuccess) {
                        existing.paymentStatus = lead.paymentStatus
                    }

                    // 2. Prioritize Most Complete Name
                    if (lead.studentName) {
                        if (!existing.studentName || lead.studentName.length > existing.studentName.length) {
                            existing.studentName = lead.studentName
                        }
                    }
                }

                const leadsToUpdate = Array.from(deduplicatedMap.values())

                // 5. Update Database
                let updatedCount = 0

                // Fetch relevant leads first to minimize queries (fetch even REGISTERED ones if we want to sync names)
                const targetMobiles = leadsToUpdate.map(l => l.mobile)
                const potentialLeads = await prisma.programLead.findMany({
                    where: {
                        programId: program.id,
                        visitorMobile: { in: targetMobiles }
                    }
                })

                // Create a map for quick access (Multiple leads per mobile)
                const leadMap = new Map<string, typeof potentialLeads>()
                potentialLeads.forEach(l => {
                    const existing = leadMap.get(l.visitorMobile) || []
                    leadMap.set(l.visitorMobile, [...existing, l])
                })

                // Perform updates
                const updates = leadsToUpdate.flatMap((leadData) => {
                    const matchingLeads = leadMap.get(leadData.mobile) || []

                    return matchingLeads.map(async (existingLead) => {
                        try {
                            // Determine internal status based on sheets payment status
                            let newInternalStatus = existingLead.status
                            const ps = (leadData.paymentStatus || "").toUpperCase()

                            // If payment is successful, mark as REGISTERED
                            if (['SUCCESS', 'PAID', 'CONFIRMED', 'COMPLETED', 'CAPTURED'].includes(ps)) {
                                newInternalStatus = 'REGISTERED'
                            }

                            await prisma.programLead.update({
                                where: { id: existingLead.id },
                                data: {
                                    status: newInternalStatus,
                                    registeredAt: newInternalStatus === 'REGISTERED' && existingLead.status !== 'REGISTERED' ? new Date() : existingLead.registeredAt,
                                    studentName: leadData.studentName,
                                    paymentStatus: leadData.paymentStatus
                                }
                            })
                            return 1
                        } catch (e) {
                            return 0
                        }
                    })
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
        revalidatePath('/program-leads')
        revalidatePath('/superadmin/program-leads', 'page')
        revalidatePath('/campus', 'layout')
        
        return { success: true, results }

    } catch (error) {
        console.error('Global Sync Error:', error)
        return { success: false, error: 'Sync Process Failed' }
    }
}
