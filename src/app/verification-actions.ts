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
    const user = await getCurrentUser();
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' };

    try {
        const skip = (page - 1) * limit;

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
        ];

        if (search) {
            andConditions.push({
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { mobileNumber: { contains: search } },
                    { childEprNo: { contains: search, mode: 'insensitive' } },
                    { childName: { contains: search, mode: 'insensitive' } }
                ]
            });
        }

        if (campus) andConditions.push({ assignedCampus: campus });
        if (role) andConditions.push({ role: role as any });
        if (grade) andConditions.push({ grade: grade });

        const baseWhere: any = { AND: andConditions };

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // 1. Fetch EVERYTHING in parallel
        const results = await Promise.all([
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
                where: { ...baseWhere, role: 'Staff' }
            }),
            prisma.user.count({
                where: { ...baseWhere, role: 'Parent' }
            }),
            prisma.user.count({
                where: {
                    benefitStatus: { in: ['Pending', 'PendingVerification'] as any[] },
                    OR: [
                        { childEprNo: { not: null } },
                        { mobileNumber: { not: '' } }
                    ]
                }
            }),
            prisma.activityLog.findMany({
                where: {
                    module: 'verification',
                    action: { in: ['UPDATE', 'BULK_ACTION'] },
                    createdAt: { gte: startOfDay }
                },
                select: { action: true, metadata: true }
            }),
            (prisma as any).erpStudentData.count()
        ]);

        const pendingUsers = results[0] as any[];
        const total = results[1] as number;
        const totalVerified = results[2] as number;
        const staffCount = results[3] as number;
        const parentCount = results[4] as number;
        const totalMatches = results[5] as number;
        const verifiedLogs = results[6] as any[];
        const stagedCount = results[7] as number;

        // 2. Identify relevant numbers for matching the current batch
        const relevantMobileNumbers = pendingUsers.map((u: any) => u.mobileNumber).filter((m: any): m is string => !!m);
        const relevantEprNumbers = pendingUsers.map((u: any) => u.childEprNo).filter((e: any): e is string => !!e);

        // 3. Search ERP Staging Table (New Staging Match)
        const stagingMatches = await (prisma as any).erpStudentData.findMany({
            where: {
                OR: [
                    { admissionNumber: { in: relevantEprNumbers } },
                    { parentMobile: { in: relevantMobileNumbers } }
                ]
            }
        });

        // 4. Search Main Student Table (Existing Match)
        const dbMatches = await prisma.student.findMany({
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
        });

        // Use plain objects with index signatures to avoid any confusing constructor/callable errors in the LS
        const studentErpMap: { [key: string]: any } = {};
        const parentMobileMap: { [key: string]: any } = {};

        // Priority 1: ERP Staging Matches (Blue/New)
        (stagingMatches as any[]).forEach((s: any) => {
            const matchData = {
                studentName: s.fullName,
                grade: s.grade,
                campus: s.campusName,
                campusId: undefined, 
                admissionNumber: s.admissionNumber,
                isStaging: true
            };
            if (s.admissionNumber) studentErpMap[s.admissionNumber] = matchData;
            if (s.parentMobile) parentMobileMap[s.parentMobile] = matchData;
        });

        // Priority 2: Main Student Matches (Green/Existing) - Overwrites staging if both exist
        (dbMatches as any[]).forEach((s: any) => {
            const matchData = {
                studentName: s.fullName,
                grade: s.grade,
                campus: (s.campus as any)?.campusName || 'Unknown',
                campusId: s.campusId,
                admissionNumber: s.admissionNumber,
                isStaging: false
            };
            if (s.admissionNumber) studentErpMap[s.admissionNumber] = matchData;
            if (s.parent?.mobileNumber) parentMobileMap[s.parent.mobileNumber] = matchData;
        });

        // 5. Attach match suggestions to users
        const usersWithMatches = pendingUsers.map((u: any) => {
            const match = (u.childEprNo && studentErpMap[u.childEprNo]) ||
                (u.mobileNumber && parentMobileMap[u.mobileNumber]);

            if (match) {
                return {
                    ...u,
                    matchSuggestion: {
                        studentName: match.studentName,
                        grade: match.grade,
                        campus: match.campus,
                        campusId: match.campusId,
                        admissionNumber: match.admissionNumber,
                        isStaging: match.isStaging
                    }
                };
            }
            return { ...u, matchSuggestion: null };
        });

        const verifiedToday = verifiedLogs.reduce((acc: number, log: any) => {
            if (log.action === 'UPDATE') return acc + 1;
            if (log.action === 'BULK_ACTION' && (log.metadata as any)?.count) {
                return acc + Number((log.metadata as any).count);
            }
            return acc;
        }, 0);

        return {
            success: true,
            data: usersWithMatches,
            total,
            totalVerified,
            staffCount,
            parentCount,
            stagedCount,
            totalPages: Math.ceil(total / limit),
            verifiedToday,
            potentialMatches: totalMatches
        };
    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        return { success: false, error: 'Failed to fetch data' };
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

        // 1. Resolve Final Details (Preference: Manual Update > User Profile > ERP Staging)
        let finalEprNo = updatedDetails?.childEprNo || user.childEprNo
        let finalGrade = updatedDetails?.grade || user.grade
        let finalName = updatedDetails?.childName || user.childName || user.fullName
        let finalCampusId = updatedDetails?.childCampusId || user.childCampusId || user.campusId || 0

        // 2. Fetch Staging Data (If ERP No exists)
        let stagingRecord = null
        if (finalEprNo) {
            stagingRecord = await (prisma as any).erpStudentData.findUnique({
                where: { admissionNumber: finalEprNo }
            })
        }

        // If staging found, prioritize its official grade/name/campus
        if (stagingRecord) {
            finalGrade = stagingRecord.grade
            finalName = stagingRecord.fullName
            // Resolve campus ID from name if needed
            if (!finalCampusId) {
                const campus = await prisma.campus.findUnique({ where: { campusName: stagingRecord.campusName } })
                if (campus) finalCampusId = campus.id
            }
        }

        // 3. One-Child-Only Benefit Rule
        const existingStudents = await prisma.student.count({ where: { parentId: userId } })
        const discountPercent = existingStudents === 0 ? (user.yearFeeBenefitPercent || 0) : 0

        // 4. Calculate Fee based on final grade/campus
        let newFee = 60000 
        if (finalGrade && finalCampusId) {
            const currentYearRecord = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
            const currentYear = currentYearRecord?.year || "2025-2026"

            const gradeFee = await prisma.gradeFee.findFirst({
                where: {
                    campusId: finalCampusId,
                    grade: finalGrade,
                    academicYear: currentYear
                }
            })
            if (gradeFee) {
                newFee = gradeFee.annualFee_otp || 0
            }
        }

        // 5. Atomic Promotion (Transaction)
        await prisma.$transaction(async (tx) => {
            // A. Create Student Entity
            await tx.student.create({
                data: {
                    fullName: finalName || 'Unknown',
                    parentId: userId,
                    campusId: finalCampusId,
                    grade: finalGrade || 'Unknown',
                    admissionNumber: finalEprNo,
                    status: 'Active',
                    baseFee: newFee,
                    discountPercent: discountPercent,
                    academicYear: user.academicYear || '2025-2026'
                }
            })

            // B. Update User Status
            await tx.user.update({
                where: { userId },
                data: {
                    benefitStatus: 'Active',
                    studentFee: newFee,
                    childInAchariya: true,
                    childName: finalName,
                    childEprNo: finalEprNo,
                    grade: finalGrade,
                    campusId: finalCampusId
                }
            })
        })

        // 6. Post-Approval Logic
        await syncUserStats(userId)
        await notifyVerificationApproved(userId)
        await logAction('UPDATE', 'verification', `Approved and Promoted student for user ${userId}`, userId.toString())
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

// Bulk Verify against Database AND Staging
export async function bulkVerifyAgainstDatabase() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const pendingUsers = await prisma.user.findMany({
            where: {
                childInAchariya: false,
                OR: [
                    { benefitStatus: 'PendingVerification' as any as AccountStatus },
                    { 
                        AND: [
                            { benefitStatus: 'Pending' as any as AccountStatus },
                            { childEprNo: { not: null } }
                        ]
                    }
                ]
            }
        })

        let verifiedCount = 0
        let matchesFound = 0

        for (const user of pendingUsers) {
            let matchData = null

            // 1. Try Main Student Table Match
            if (user.childEprNo) {
                const student = await prisma.student.findUnique({
                    where: { admissionNumber: user.childEprNo }
                })
                if (student) matchData = { type: 'DB', ...student }
            }

            // 2. Try ERP Staging Table Match (If no DB match)
            if (!matchData && user.childEprNo) {
                const staging = await (prisma as any).erpStudentData.findUnique({
                    where: { admissionNumber: user.childEprNo }
                })
                if (staging) matchData = { type: 'STAGING', ...staging }
            }

            if (matchData) {
                matchesFound++
                // AUTO-APPROVE (Moves data and promotes to Student if needed)
                await approveVerification(user.userId)
                verifiedCount++
            }
        }

        if (verifiedCount > 0) {
            await logAction('BULK_ACTION', 'verification', `Bulk verified ${verifiedCount} users via DB/Staging scan`, admin.userId.toString(), null, { count: verifiedCount })
        }

        await revalidateDashboard()
        return { success: true, verifiedCount, matchesFound }

    } catch (error) {
        console.error('Bulk verification error:', error)
        return { success: false, error: 'Bulk verification failed' }
    }
}

export async function getVerificationsForExport(
    status: 'pending' | 'verified' | 'staged',
    search: string = '',
    campus?: string,
    role?: string,
    grade?: string
) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        if (status === 'staged') {
            let where: any = {};
            const andConditions: any[] = [];
            if (search) {
                andConditions.push({
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' } },
                        { admissionNumber: { contains: search, mode: 'insensitive' } },
                        { parentMobile: { contains: search } }
                    ]
                });
            }
            if (campus) andConditions.push({ campusName: campus });
            if (grade) andConditions.push({ grade: grade });

            if (andConditions.length > 0) {
                where = { AND: andConditions };
            }

            const data = await (prisma as any).erpStudentData.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });

            return { success: true, data };
        }

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

/**
 * Fetch ERP Staging Data for the Super Admin
 */
export async function getErpStagingData(
    page: number = 1,
    limit: number = 50,
    search: string = '',
    campus?: string,
    grade?: string
) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

    try {
        const skip = (page - 1) * limit
        let where: any = {}

        const andConditions: any[] = []

        if (search) {
            andConditions.push({
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { admissionNumber: { contains: search, mode: 'insensitive' } },
                    { parentMobile: { contains: search } }
                ]
            })
        }

        if (campus) andConditions.push({ campusName: campus })
        if (grade) andConditions.push({ grade: grade })

        if (andConditions.length > 0) {
            where = { AND: andConditions }
        }

        const [data, total] = await Promise.all([
            (prisma as any).erpStudentData.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            (prisma as any).erpStudentData.count({ where })
        ])

        return {
            success: true,
            data,
            total,
            totalPages: Math.ceil(total / limit)
        }
    } catch (error) {
        console.error('Error fetching ERP staging data:', error)
        return { success: false, error: 'Failed to fetch ERP data' }
    }
}
