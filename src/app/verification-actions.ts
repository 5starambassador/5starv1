'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { AccountStatus } from '@prisma/client'
import { logAction } from '@/lib/audit-logger'
import { syncUserStats, revalidateDashboard } from './sync-actions'
import { notifyVerificationApproved, notifyVerificationRejected } from '@/lib/notification-helper'


// Fetch Verified Users (Active Benefit Status)
export async function getVerifiedUsers() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const verifiedUsers = await prisma.user.findMany({
            where: {
                benefitStatus: 'Active' as any as AccountStatus
            },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                childName: true,
                childEprNo: true,
                grade: true,
                campusId: true,
                childCampusId: true,
                role: true,
                assignedCampus: true,
                confirmedReferralCount: true, // Bonus info for verified tab
                benefitStatus: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: verifiedUsers }
    } catch (error) {
        console.error('Error fetching verified users:', error)
        return { success: false, error: 'Failed to fetch data' }
    }
}

// Fetch Pending Verifications
export async function getPendingVerifications() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        // 1. Fetch potential matches (Student Records)
        const allStudents = await prisma.student.findMany({
            where: { status: 'Active' },
            select: { admissionNumber: true, parent: { select: { mobileNumber: true } } }
        })
        const studentErps = new Set(allStudents.map(s => s.admissionNumber).filter(Boolean))
        const parentMobiles = new Set(allStudents.map(s => s.parent.mobileNumber).filter(Boolean))

        // 2. Fetch users with PendingVerification OR (Pending + Match)
        // We want to show:
        // A) Anyone explicitly asking for verification (PendingVerification)
        // B) Anyone who is Pending but WE found a match (Smart Suggestion)
        const pendingUsers = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        benefitStatus: 'PendingVerification' as any as AccountStatus,
                        // FILTER: Exclude Staff who don't have a child in Achariya
                        NOT: {
                            AND: [
                                { role: 'Staff' },
                                { childInAchariya: false }
                            ]
                        }
                    },
                    {
                        AND: [
                            { benefitStatus: 'Pending' as any as AccountStatus },
                            { mobileNumber: { in: Array.from(parentMobiles) } }, // Only fetch Pending users if they MATCH a parent
                            // FILTER: Exclude Staff who don't have a child in Achariya (redundant if Pending matches parents, but safe)
                            {
                                NOT: {
                                    AND: [
                                        { role: 'Staff' },
                                        { childInAchariya: false }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                childName: true,
                childEprNo: true,
                grade: true,
                campusId: true,
                childCampusId: true,
                role: true,
                assignedCampus: true,
                createdAt: true,
                benefitStatus: true // Needed to show UI distinction if needed
            },
            orderBy: { createdAt: 'desc' }
        })

        // 3. Fetch "Verified Today" count from ActivityLog
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const verifiedLogs = await prisma.activityLog.findMany({
            where: {
                module: 'verification',
                action: { in: ['UPDATE', 'BULK_ACTION'] },
                createdAt: { gte: startOfDay }
            },
            select: {
                action: true,
                metadata: true
            }
        })

        const verifiedToday = verifiedLogs.reduce((acc, log) => {
            if (log.action === 'UPDATE') return acc + 1
            if (log.action === 'BULK_ACTION' && (log.metadata as any)?.count) {
                return acc + Number((log.metadata as any).count)
            }
            return acc
        }, 0)

        // 4. Potential Match Calculation
        const potentialMatches = pendingUsers.filter(u =>
            (u.childEprNo && studentErps.has(u.childEprNo)) ||
            (u.mobileNumber && parentMobiles.has(u.mobileNumber))
        ).length

        return {
            success: true,
            data: pendingUsers,
            verifiedToday,
            potentialMatches
        }
    } catch (error) {
        console.error('Error fetching pending verifications:', error)
        return { success: false, error: 'Failed to fetch data' }
    }
}

// Approve Verification
export async function approveVerification(userId: number, updatedDetails?: {
    childEprNo?: string
    grade?: string
    childCampusId?: number
    childName?: string
}) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const user = await prisma.user.findUnique({ where: { userId } })
        if (!user) return { success: false, error: 'User not found' }

        // Details to use: Updated ones OR existing ones
        const grade = updatedDetails?.grade || user.grade
        const childCampusId = updatedDetails?.childCampusId ? updatedDetails.childCampusId : (user.childCampusId || user.campusId || 0)

        // 1. Calculate Fee
        let newFee = 60000 // Default
        if (grade && childCampusId) {
            const currentYearRecord = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
            const currentYear = currentYearRecord?.year || "2025-2026"

            const gradeFee = await prisma.gradeFee.findFirst({
                where: {
                    campusId: childCampusId,
                    grade: grade,
                    academicYear: currentYear
                }
            })
            if (gradeFee) {
                newFee = gradeFee.annualFee_otp || 0
            }
        }

        // 2. Update User
        await prisma.user.update({
            where: { userId },
            data: {
                benefitStatus: 'Active',
                studentFee: newFee,
                ...(updatedDetails?.childEprNo && { childEprNo: updatedDetails.childEprNo }),
                ...(updatedDetails?.grade && { grade: updatedDetails.grade }),
                ...(updatedDetails?.childName && { childName: updatedDetails.childName }),
            }
        })

        // 3. Create Notification
        await notifyVerificationApproved(userId)

        await revalidateDashboard()
        return { success: true }
    } catch (error) {
        console.error('Error approving verification:', error)
        return { success: false, error: 'Approval failed' }
    }
}

// Reject Verification
export async function rejectVerification(userId: number, reason?: string) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        await prisma.user.update({
            where: { userId },
            data: {
                benefitStatus: 'Inactive',
                studentFee: 60000 // Reset to base
            }
        })

        // 2. Create Notification
        await notifyVerificationRejected(userId, reason)

        await revalidateDashboard()
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Rejection failed' }
    }
}

// Bulk Verify against Database
export async function bulkVerifyAgainstDatabase() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const pendingUsers = await prisma.user.findMany({
            where: {
                childInAchariya: true,
                OR: [
                    { benefitStatus: 'PendingVerification' as any as AccountStatus },
                    { studentFee: 60000 } // Default fee means potentially unverified
                ]
            }
        })

        let verifiedCount = 0
        let matchesFound = 0

        for (const user of pendingUsers) {
            let student = null

            // 1. Try ERP Number Match
            if (user.childEprNo) {
                student = await prisma.student.findUnique({
                    where: { admissionNumber: user.childEprNo },
                    include: { campus: true }
                })
            }

            // Mobile fallback removed as per institutional policy (ERP only confirmation)

            if (student) {
                matchesFound++
                // Match Found! Auto Approve.
                await syncUserStats(user.userId)

                // Notify User
                await notifyVerificationApproved(user.userId)
                verifiedCount++
            }
        }

        if (verifiedCount > 0) {
            await logAction('BULK_ACTION', 'verification', `Bulk verified ${verifiedCount} users via database scan`, admin.userId.toString(), null, { count: verifiedCount })
        }

        await revalidateDashboard()
        return { success: true, verifiedCount, matchesFound }

    } catch (error) {
        console.error('Bulk verification error:', error)
        return { success: false, error: 'Bulk verification failed' }
    }
}
