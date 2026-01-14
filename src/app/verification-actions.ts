'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'
import { AccountStatus } from '@prisma/client'
import { logAction } from '@/lib/audit-logger'

// Fetch Pending Verifications
export async function getPendingVerifications() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        // Fetch users with PendingVerification status
        const pendingUsers = await prisma.user.findMany({
            where: {
                benefitStatus: 'PendingVerification' as any as AccountStatus
            },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                childName: true,
                childEprNo: true,
                grade: true,
                campusId: true, // This might be working campus for Staff, need to check if we have handling for studying campus
                role: true,
                assignedCampus: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })

        // Enhance with Campus Names if needed (though assignedCampus might suffice)
        return { success: true, data: pendingUsers }
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
        const childCampusId = updatedDetails?.childCampusId ? updatedDetails.childCampusId : (user.campusId || 0)

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

        await logAction('UPDATE', 'verification', `Approved verification for User ${userId}`, admin.userId.toString(), userId, { approvedBy: admin.userId })

        revalidatePath('/superadmin/verification')
        return { success: true }
    } catch (error) {
        console.error('Error approving verification:', error)
        return { success: false, error: 'Approval failed' }
    }
}

// Reject Verification
export async function rejectVerification(userId: number) {
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

        await logAction('UPDATE', 'verification', `Rejected verification for User ${userId}`, admin.userId.toString(), userId, { rejectedBy: admin.userId })

        revalidatePath('/superadmin/verification')
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

            // 2. Fallback: Mobile Match
            if (!student && user.mobileNumber) {
                const students = await prisma.student.findMany({
                    where: { parent: { mobileNumber: user.mobileNumber }, status: 'Active' },
                    include: { campus: true },
                    orderBy: { createdAt: 'desc' }
                })
                if (students.length > 0) student = students[0]
            }

            if (student) {
                matchesFound++
                // Match Found! Auto Approve.

                // 1. Calculate Fee for this student's actual campus/grade
                let newFee = 60000
                if (student.campusId && student.grade) {
                    const currentYearRecord = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
                    const currentYear = currentYearRecord?.year || "2025-2026"

                    const gradeFee = await prisma.gradeFee.findFirst({
                        where: {
                            campusId: student.campusId,
                            grade: student.grade,
                            academicYear: currentYear
                        }
                    })
                    if (gradeFee) newFee = gradeFee.annualFee_otp || 0
                }

                // 2. Update User
                await prisma.user.update({
                    where: { userId: user.userId },
                    data: {
                        benefitStatus: 'Active',
                        childName: student.fullName,
                        grade: student.grade,
                        studentFee: newFee,
                    }
                })
                verifiedCount++
            }
        }

        if (verifiedCount > 0) {
            await logAction('BULK_ACTION', 'verification', `Bulk verified ${verifiedCount} users`, admin.userId.toString(), null, { count: verifiedCount })
        }

        revalidatePath('/superadmin/verification')
        return { success: true, verifiedCount, matchesFound }

    } catch (error) {
        console.error('Bulk verification error:', error)
        return { success: false, error: 'Bulk verification failed' }
    }
}
