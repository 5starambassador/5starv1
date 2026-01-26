'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth-service'
import { revalidatePath } from 'next/cache'

// Type for bulk upload
export interface BulkFeeData {
    campusName: string
    grade: string
    academicYear: string
    annualFee_otp?: number
    annualFee_wotp?: number
}

// ========= Get Fee Structure =========
export async function getFeeStructure(filter?: { academicYear?: string, campusId?: number, grade?: string }) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // Use queryRaw to bypass potentially stale Prisma Client types
        // This ensures we get 'academicYear' even if generated client is outdated
        let fees: any[] = []

        // Use queryRaw with dynamic conditions
        const conditions: Prisma.Sql[] = []
        if (filter?.campusId) conditions.push(Prisma.sql`g."campusId" = ${filter.campusId}`)
        if (filter?.academicYear) conditions.push(Prisma.sql`g."academicYear" = ${filter.academicYear}`)
        if (filter?.grade) conditions.push(Prisma.sql`g."grade" = ${filter.grade}`)

        const whereClause = conditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
            : Prisma.empty

        fees = await prisma.$queryRaw`
            SELECT g.*, c."campusName", c."campusCode"
            FROM "GradeFee" g
            JOIN "Campus" c ON g."campusId" = c."id"
            ${whereClause}
            ORDER BY c."campusName" ASC, g."grade" ASC
        `

        // Map raw result to expected nested structure
        const formattedFees = fees.map(f => ({
            id: f.id,
            campusId: f.campusId,
            grade: f.grade,
            academicYear: f.academicYear,
            annualFee_otp: f.annualFee_otp,
            annualFee_wotp: f.annualFee_wotp,
            campus: {
                id: f.campusId,
                campusName: f.campusName,
                campusCode: f.campusCode
            }
        }))

        return { success: true, data: formattedFees }
    } catch (error) {
        console.error('Error fetching fees:', error)
        return { success: false, error: 'Failed' }
    }
}

// ========= Bulk Upsert Fee Structure =========
export async function uploadFeeStructure(fees: BulkFeeData[]) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // Prefetch campuses to map Name -> ID
        const campuses = await prisma.campus.findMany()
        // Create map for Case-Insensitive Name Lookup
        const campusMap = new Map(campuses.map(c => [c.campusName.toUpperCase().trim(), c.id]))

        let processed = 0
        let errors: string[] = []

        for (const f of fees) {
            // Handle potential missing or whitespace-only names
            if (!f.campusName) {
                errors.push(`Row has missing Campus Name`)
                continue
            }

            const normalizedName = f.campusName.toUpperCase().trim()
            const campusId = campusMap.get(normalizedName)

            if (!campusId) {
                errors.push(`Campus not found: "${f.campusName}"`)
                continue
            }

            // Upsert Fee
            // Default Academic Year if missing to 2025-2026 to prevent empty display
            // TRIM inputs to strictly avoid filter mismatches
            const sanitizedGrade = f.grade.trim()
            const sanitizedAY = (f.academicYear || '2026-2027').trim()

            await prisma.gradeFee.upsert({
                where: {
                    campusId_grade_academicYear: {
                        campusId,
                        grade: sanitizedGrade,
                        academicYear: sanitizedAY
                    }
                },
                update: {
                    annualFee_otp: f.annualFee_otp,
                    annualFee_wotp: f.annualFee_wotp
                } as any,
                create: {
                    campusId,
                    grade: sanitizedGrade,
                    academicYear: sanitizedAY,
                    annualFee_otp: f.annualFee_otp,
                    annualFee_wotp: f.annualFee_wotp
                } as any
            })
            processed++
        }

        revalidatePath('/superadmin')
        return { success: true, processed, errors }
    } catch (error) {
        console.error('Error uploading fees:', error)
        return { success: false, error: 'Failed to upload fees' }
    }
}

// ========= Sync Student Fees =========
export async function syncStudentFees(campusId?: number, academicYear?: string, grade?: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // 1. Fetch Students (Active only) via queryRaw to avoid stale types
        const conditions: Prisma.Sql[] = [Prisma.sql`"status" = 'Active'`]
        if (campusId) conditions.push(Prisma.sql`"campusId" = ${campusId}`)
        if (academicYear) conditions.push(Prisma.sql`"academicYear" = ${academicYear}`)
        if (grade) conditions.push(Prisma.sql`"grade" = ${grade}`)

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

        const students: any[] = await prisma.$queryRaw`
            SELECT "studentId", "campusId", "grade", "academicYear", "baseFee"
            FROM "Student"
            ${whereClause}
        `

        // 2. Fetch Fee Structures
        // We fetch ALL fees to ensure we have the complete map for lookups
        // But we can optimize to only fetch linked campuses if needed. For now, fetch all is safer/simpler for map building.
        // Actually, let's filter the fees too if possible to reduce data transfer.
        const feeConditions: Prisma.Sql[] = []
        if (campusId) feeConditions.push(Prisma.sql`"campusId" = ${campusId}`)
        if (academicYear) feeConditions.push(Prisma.sql`"academicYear" = ${academicYear}`)
        if (grade) feeConditions.push(Prisma.sql`"grade" = ${grade}`)

        const feeWhere = feeConditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(feeConditions, ' AND ')}`
            : Prisma.empty

        const fees: any[] = await prisma.$queryRaw`
            SELECT "campusId", "grade", "academicYear", "annualFee_otp", "annualFee_wotp"
            FROM "GradeFee"
            ${feeWhere}
        `

        // Build Map: "CampusID-Grade-AY" -> { otp, wotp }
        const feeMap = new Map<string, { otp: number; wotp: number }>()
        fees.forEach(f => {
            const key = `${f.campusId}-${f.grade.trim()}-${f.academicYear.trim()}`
            feeMap.set(key, { otp: f.annualFee_otp || 0, wotp: f.annualFee_wotp || 0 })
        })

        // 3. Update Students
        let updatedCount = 0
        const updates = []

        for (const s of students) {
            const sGrade = s.grade.trim()
            const sAy = (s.academicYear || '2026-2027').trim()
            const key = `${s.campusId}-${sGrade}-${sAy}`

            // For student sync, we need to know WHICH fee type they have.
            // If the student already has a record, they might have selectedFeeType.
            const studentRecord = await prisma.student.findUnique({
                where: { studentId: s.studentId },
                select: { selectedFeeType: true }
            })

            const feeRule = feeMap.get(key)
            if (!feeRule) continue

            const standardFee = studentRecord?.selectedFeeType === 'WOTP'
                ? feeRule.wotp
                : feeRule.otp // Default or OTP

            // If fee differs
            if (s.baseFee !== standardFee) {
                updates.push(prisma.student.update({
                    where: { studentId: s.studentId },
                    data: {
                        baseFee: standardFee,
                        annualFee: standardFee // Keep snapshot in sync too
                    } as any
                }))
                updatedCount++
            }
        }

        // Execute batch updates
        const BATCH_SIZE = 50
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            await Promise.all(updates.slice(i, i + BATCH_SIZE))
        }

        revalidatePath('/superadmin')
        revalidatePath('/students')
        return { success: true, total: students.length, updated: updatedCount }

    } catch (error) {
        console.error('Error syncing fees:', error)
        return { success: false, error: 'Sync failed' }
    }
}

// ========= Delete Fee Structure =========
export async function deleteFeeStructure(id: number) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        await prisma.gradeFee.delete({
            where: { id }
        })

        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Error deleting fee:', error)
        return { success: false, error: 'Failed to delete fee' }
    }
}

// ========= Bulk Delete Fee Structures =========
export async function bulkDeleteFeeStructures(ids: number[]) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        await prisma.gradeFee.deleteMany({
            where: {
                id: { in: ids }
            }
        })

        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('Error deleting fees:', error)
        return { success: false, error: 'Failed to delete fees' }
    }
}
// ========= Get Staff Base Fee (Grade-1) =========
export async function getStaffBaseFee(campusName: string): Promise<number> {
    try {
        if (!campusName) return 60000

        // 1. Find Campus ID
        const campus = await prisma.campus.findFirst({
            where: {
                campusName: { equals: campusName, mode: 'insensitive' }
            },
            select: { id: true }
        })

        if (!campus) {
            console.warn(`Campus not found for Staff Fee lookup: ${campusName}`)
            return 60000
        }

        // 2. Fetch Grade-1 Fee (Try 2026-2027 first, then 2025-2026)
        // Adjust Grade string as needed (assuming 'Grade-1' based on requirements)
        // Also check '1', 'Grade 1' if needed. For now sticking to 'Grade-1' as standard.
        const gradeTarget = 'Grade-1'

        const feeRecord = await prisma.gradeFee.findFirst({
            where: {
                campusId: campus.id,
                grade: gradeTarget,
                academicYear: '2026-2027' // Policy A.Y.
            },
            select: { annualFee_otp: true }
        })

        if (feeRecord && feeRecord.annualFee_otp) {
            return feeRecord.annualFee_otp
        }

        // Fallback to current year if 2026-27 not defined
        const feeFallback = await prisma.gradeFee.findFirst({
            where: {
                campusId: campus.id,
                grade: gradeTarget,
                academicYear: '2025-2026'
            },
            select: { annualFee_otp: true }
        })

        if (feeFallback && feeFallback.annualFee_otp) {
            return feeFallback.annualFee_otp
        }

        return 60000 // Default fallback
    } catch (error) {
        console.error('Error fetching staff base fee:', error)
        return 60000
    }
}
