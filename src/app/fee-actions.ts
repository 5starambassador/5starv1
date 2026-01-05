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
    annualFee: number
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
            annualFee: f.annualFee,
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
            const sanitizedAY = (f.academicYear || '2025-2026').trim()

            await prisma.gradeFee.upsert({
                where: {
                    campusId_grade_academicYear: {
                        campusId,
                        grade: sanitizedGrade,
                        academicYear: sanitizedAY
                    }
                },
                update: { annualFee: f.annualFee },
                create: {
                    campusId,
                    grade: sanitizedGrade,
                    academicYear: sanitizedAY,
                    annualFee: f.annualFee
                }
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
            SELECT "campusId", "grade", "academicYear", "annualFee"
            FROM "GradeFee"
            ${feeWhere}
        `

        // Build Map: "CampusID-Grade-AY" -> Fee
        const feeMap = new Map<string, number>()
        fees.forEach(f => {
            const key = `${f.campusId}-${f.grade.trim()}-${f.academicYear.trim()}`
            feeMap.set(key, f.annualFee)
        })

        // 3. Update Students
        let updatedCount = 0
        const updates = []

        for (const s of students) {
            const sGrade = s.grade.trim()
            const sAy = (s.academicYear || '2025-2026').trim()
            const key = `${s.campusId}-${sGrade}-${sAy}`
            const standardFee = feeMap.get(key) || 0 // Strict 0

            // If fee differs
            if (s.baseFee !== standardFee) {
                updates.push(prisma.student.update({
                    where: { studentId: s.studentId },
                    data: { baseFee: standardFee }
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
