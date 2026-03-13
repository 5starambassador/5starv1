'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { AccountStatus } from '@prisma/client'
import { logAction } from '@/lib/audit-logger'
import { syncUserStats, revalidateDashboard } from './sync-actions'
import { notifyVerificationApproved, notifyVerificationRejected } from '@/lib/notification-helper'


// Fetch Verified Users (Active Benefit Status)
export async function getVerifiedUsers(
    page: number = 1,
    limit: number = 50,
    search: string = '',
    campus?: string,
    role?: string,
    grade?: string
) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const skip = (page - 1) * limit

        const andConditions: any[] = [
            { childInAchariya: true }
        ]

        if (search) {
            andConditions.push({
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { mobileNumber: { contains: search } },
                    { childEprNo: { contains: search, mode: 'insensitive' } },
                    { childName: { contains: search, mode: 'insensitive' } }
                ]
            })
        }

        if (campus) andConditions.push({ assignedCampus: campus })
        if (role) andConditions.push({ role: role as any })
        if (grade) andConditions.push({ grade: grade })

        const where: any = { AND: andConditions }

        const [verifiedUsers, total] = await Promise.all([
            prisma.user.findMany({
                where,
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
                    confirmedReferralCount: true,
                    benefitStatus: true,
                    childInAchariya: true,
                    empId: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.user.count({ where })
        ])

        // 2. Match Suggestions (Look for real student records if childName is missing/generic)
        const relevantMobileNumbers = verifiedUsers.map(u => u.mobileNumber).filter((m): m is string => !!m)
        const relevantEprNumbers = verifiedUsers.map(u => u.childEprNo).filter((e): e is string => !!e)

        const matchingStudents = await prisma.student.findMany({
            where: {
                OR: [
                    { admissionNumber: { in: relevantEprNumbers } },
                    { parent: { mobileNumber: { in: relevantMobileNumbers } } }
                ],
                status: 'Active'
            },
            include: {
                parent: { select: { mobileNumber: true } },
                campus: { select: { campusName: true } }
            }
        })

        const studentErps = new Map<string, typeof matchingStudents[0]>()
        const parentMobiles = new Map<string, typeof matchingStudents[0]>()

        matchingStudents.forEach(s => {
            if (s.admissionNumber) studentErps.set(s.admissionNumber, s)
            if (s.parent?.mobileNumber) parentMobiles.set(s.parent.mobileNumber, s)
        })

        const usersWithMatches = verifiedUsers.map(u => {
            const match = (u.childEprNo && studentErps.get(u.childEprNo)) ||
                (u.mobileNumber && parentMobiles.get(u.mobileNumber))

            if (match) {
                return {
                    ...u,
                    matchSuggestion: {
                        studentName: match.fullName,
                        grade: match.grade,
                        campus: match.campus.campusName,
                        campusId: match.campusId,
                        admissionNumber: match.admissionNumber
                    }
                }
            }
            return { ...u, matchSuggestion: null }
        })

        return {
            success: true,
            data: usersWithMatches,
            total,
            totalPages: Math.ceil(total / limit)
        }
    } catch (error) {
        console.error('Error fetching verified users:', error)
        return { success: false, error: 'Failed to fetch data' }
    }
}

// Fetch Pending Verifications
export async function getPendingVerifications(
    page: number = 1,
    limit: number = 50,
    search: string = '',
    campus?: string,
    role?: string,
    grade?: string
) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const skip = (page - 1) * limit

        const andConditions: any[] = [
            { childInAchariya: false }, // EXCLUDE verified users
            {
                OR: [
                    {
                        benefitStatus: 'PendingVerification' as any as AccountStatus
                    },
                    {
                        AND: [
                            { benefitStatus: 'Pending' as any as AccountStatus },
                            { childEprNo: { not: null } }
                        ]
                    }
                ]
            }
        ]

        if (search) {
            andConditions.push({
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { mobileNumber: { contains: search } },
                    { childEprNo: { contains: search, mode: 'insensitive' } },
                    { childName: { contains: search, mode: 'insensitive' } }
                ]
            })
        }

        if (campus) andConditions.push({ assignedCampus: campus })
        if (role) andConditions.push({ role: role as any })
        if (grade) andConditions.push({ grade: grade })

        const baseWhere: any = { AND: andConditions }

        // 1. Fetch pending users with pagination
        const [pendingUsers, total, totalVerified, staffCount, parentCount] = await Promise.all([
            prisma.user.findMany({
                where: baseWhere,
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
                    benefitStatus: true,
                    childInAchariya: true,
                    empId: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.user.count({ where: baseWhere }),
            prisma.user.count({ where: { childInAchariya: true } }),
            prisma.user.count({
                where: {
                    ...baseWhere,
                    role: 'Staff'
                }
            }),
            prisma.user.count({
                where: {
                    ...baseWhere,
                    role: 'Parent'
                }
            })
        ])

        // 2. TARGETED matching (Only for the fetched batch)
        const relevantMobileNumbers = pendingUsers.map(u => u.mobileNumber).filter((m): m is string => !!m)
        const relevantEprNumbers = pendingUsers.map(u => u.childEprNo).filter((e): e is string => !!e)

        const matchingStudents = await prisma.student.findMany({
            where: {
                OR: [
                    { admissionNumber: { in: relevantEprNumbers } },
                    { parent: { mobileNumber: { in: relevantMobileNumbers } } }
                ],
                status: 'Active'
            },
            include: {
                parent: { select: { mobileNumber: true } },
                campus: { select: { campusName: true } }
            }
        })

        // Use proper typing and explicit population for the Maps
        const studentErps = new Map<string, typeof matchingStudents[0]>()
        const parentMobiles = new Map<string, typeof matchingStudents[0]>()

        matchingStudents.forEach(s => {
            if (s.admissionNumber) studentErps.set(s.admissionNumber, s)
            if (s.parent?.mobileNumber) parentMobiles.set(s.parent.mobileNumber, s)
        })

        // Attach match suggestions to users
        const usersWithMatches = pendingUsers.map(u => {
            const match = (u.childEprNo && studentErps.get(u.childEprNo)) ||
                (u.mobileNumber && parentMobiles.get(u.mobileNumber))

            if (match) {
                return {
                    ...u,
                    matchSuggestion: {
                        studentName: match.fullName,
                        grade: match.grade,
                        campus: match.campus.campusName,
                        campusId: match.campusId,
                        admissionNumber: match.admissionNumber
                    }
                }
            }
            return { ...u, matchSuggestion: null }
        })

        // 3. Status retrieval (Efficient counts)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const verifiedLogs = await prisma.activityLog.findMany({
            where: {
                module: 'verification',
                action: { in: ['UPDATE', 'BULK_ACTION'] },
                createdAt: { gte: startOfDay }
            },
            select: { action: true, metadata: true }
        })

        const verifiedToday = verifiedLogs.reduce((acc, log) => {
            if (log.action === 'UPDATE') return acc + 1
            if (log.action === 'BULK_ACTION' && (log.metadata as any)?.count) {
                return acc + Number((log.metadata as any).count)
            }
            return acc
        }, 0)

        // Total potential matches
        const totalMatches = await prisma.user.count({
            where: {
                benefitStatus: { in: ['Pending', 'PendingVerification'] as any[] },
                OR: [
                    { childEprNo: { not: null } },
                    { mobileNumber: { not: '' } }
                ]
            }
        })

        return {
            success: true,
            data: usersWithMatches,
            total,
            totalVerified,
            staffCount,
            parentCount,
            totalPages: Math.ceil(total / limit),
            verifiedToday,
            potentialMatches: totalMatches
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

        // 2. Update User (Verification Phase)
        await prisma.user.update({
            where: { userId },
            data: {
                studentFee: newFee,
                childInAchariya: true,
                ...(updatedDetails?.childEprNo && { childEprNo: updatedDetails.childEprNo }),
                ...(updatedDetails?.grade && { grade: updatedDetails.grade }),
                ...(updatedDetails?.childName && { childName: updatedDetails.childName }),
            }
        })

        // 3. Centralized Stat Sync (Matches new senior expert rules)
        await syncUserStats(userId)

        // 4. Create Notification
        await notifyVerificationApproved(userId)

        await logAction('UPDATE', 'verification', `Approved verification for user ${userId}`, userId.toString())

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

        await logAction('UPDATE', 'verification', `Rejected verification for user ${userId}${reason ? `: ${reason}` : ''}`, userId.toString())

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

export async function getVerificationsForExport(
    status: 'pending' | 'verified',
    search: string = '',
    campus?: string,
    role?: string,
    grade?: string
) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const andConditions: any[] = []

        if (status === 'verified') {
            andConditions.push({ childInAchariya: true })
        } else {
            andConditions.push({ childInAchariya: false })
            andConditions.push({
                OR: [
                    {
                        benefitStatus: 'PendingVerification' as any as AccountStatus
                    },
                    {
                        AND: [
                            { benefitStatus: 'Pending' as any as AccountStatus },
                            { childEprNo: { not: null } }
                        ]
                    }
                ]
            })
        }

        if (search) {
            andConditions.push({
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { mobileNumber: { contains: search } },
                    { childEprNo: { contains: search, mode: 'insensitive' } },
                    { childName: { contains: search, mode: 'insensitive' } }
                ]
            })
        }

        if (campus) andConditions.push({ assignedCampus: campus })
        if (role) andConditions.push({ role: role as any })
        if (grade) andConditions.push({ grade: grade })

        const where: any = { AND: andConditions }

        const users = await prisma.user.findMany({
            where,
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
                benefitStatus: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return {
            success: true,
            data: users
        }
    } catch (error) {
        console.error('Error fetching export data:', error)
        return { success: false, error: 'Failed to fetch export data' }
    }
}
