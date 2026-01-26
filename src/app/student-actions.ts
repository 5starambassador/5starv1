'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'
import { canEdit } from '@/lib/permission-service'
import { generateSmartReferralCode } from '@/lib/referral-service'

export async function getStudents(filters?: { campusId?: number, parentId?: number, status?: string }) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return []
    }

    try {
        return await prisma.student.findMany({
            where: {
                campusId: filters?.campusId,
                parentId: filters?.parentId,
                status: filters?.status
            },
            include: {
                parent: {
                    select: { fullName: true, mobileNumber: true }
                },
                campus: {
                    select: { campusName: true, isActive: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    } catch (error) {
        console.error('Error fetching students:', error)
        return []
    }
}

// Generate unique referral code


export async function addStudent(data: {
    fullName: string
    parentId: number
    campusId: number
    grade: string
    section?: string
    rollNumber?: string
    baseFee?: number
    discountPercent?: number
    newParent?: {
        fullName: string
        mobileNumber: string
    }
    academicYear?: string // Added
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    // Verify Campus is Active
    const campus = await prisma.campus.findUnique({
        where: { id: data.campusId },
        select: { isActive: true }
    })

    if (!campus) return { success: false, error: 'Campus not found' }
    if (!campus.isActive && user.role !== 'Super Admin') {
        return { success: false, error: 'Cannot admit students to an Inactive Campus' }
    }

    try {
        // Wrap in transaction to ensure atomic parent/student creation
        const student = await prisma.$transaction(async (tx) => {
            let pId = data.parentId

            if (!pId && data.newParent) {
                const existingParent = await tx.user.findUnique({
                    where: { mobileNumber: data.newParent.mobileNumber }
                })

                if (existingParent) {
                    pId = existingParent.userId
                } else {
                    const referralCode = await generateSmartReferralCode('Parent')
                    const newParent = await tx.user.create({
                        data: {
                            fullName: data.newParent.fullName,
                            mobileNumber: data.newParent.mobileNumber,
                            role: 'Parent',
                            referralCode,
                            childInAchariya: true,
                            status: 'Active',
                            yearFeeBenefitPercent: 0,
                            confirmedReferralCount: 0,
                            isFiveStarMember: false,
                            academicYear: data.academicYear || '2025-2026'
                        }
                    })
                    pId = newParent.userId
                }
            }

            // Calculate Fees (Strict 0 fallback)
            let bFee = data.baseFee
            let dPercent = data.discountPercent

            if (bFee === undefined || bFee === null) {
                const gradeFees: any[] = await tx.$queryRaw`
                    SELECT "annualFee" FROM "GradeFee" 
                    WHERE "campusId" = ${data.campusId} 
                    AND "grade" = ${data.grade} 
                    AND "academicYear" = ${data.academicYear || '2025-2026'}
                    LIMIT 1
                `
                if (gradeFees.length > 0) bFee = gradeFees[0].annualFee
                else bFee = 0
            }

            if (dPercent === undefined || dPercent === null) {
                const p = await tx.user.findUnique({
                    where: { userId: pId }
                })
                dPercent = p?.yearFeeBenefitPercent || 0
            }

            return await tx.student.create({
                data: {
                    fullName: data.fullName,
                    parentId: pId,
                    campusId: data.campusId,
                    grade: data.grade,
                    section: data.section,
                    rollNumber: data.rollNumber,
                    status: 'Active',
                    baseFee: bFee as number,
                    discountPercent: dPercent as number,
                    academicYear: data.academicYear || '2025-2026'
                }
            })
        })
        revalidatePath('/superadmin')
        revalidatePath('/dashboard')
        revalidatePath('/students')
        return { success: true, student }
    } catch (error) {
        console.error('Error adding student:', error)
        return { success: false, error: 'Failed to add student' }
    }
}

export async function updateStudent(studentId: number, data: Partial<{
    fullName: string
    parentId: number
    grade: string
    campusId: number
    section: string
    rollNumber: string
    status: string
    baseFee: number
    discountPercent: number
    academicYear: string
}>) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // Recalculate fees if critical fields change
        let updateData = { ...data }

        if (data.campusId && data.grade && !data.baseFee) {
            const gradeFees: any[] = await prisma.$queryRaw`
                SELECT "annualFee" FROM "GradeFee" 
                WHERE "campusId" = ${data.campusId || 0} 
                AND "grade" = ${data.grade || ''} 
                AND "academicYear" = ${data.academicYear || '2025-2026'}
                LIMIT 1
            `
            if (gradeFees.length > 0) updateData.baseFee = gradeFees[0].annualFee
        }

        await prisma.student.update({
            where: { studentId },
            data: updateData
        })
        revalidatePath('/superadmin')
        revalidatePath('/students')
        return { success: true }
    } catch (error) {
        console.error('Error updating student:', error)
        return { success: false, error: 'Failed to update student' }
    }
}

export async function convertLeadToStudent(leadId: number, studentDetails: {
    studentName: string
    section?: string
    rollNumber?: string
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const lead = await prisma.referralLead.findUnique({
            where: { leadId },
            include: { user: true, student: true }
        })

        if (!lead) return { success: false, error: 'Lead not found' }
        if (lead.leadStatus !== 'Confirmed') return { success: false, error: 'Only confirmed leads can be converted' }
        if (lead.student) return { success: false, error: 'Lead already converted to student' }

        // 1. Resolve Campus ID
        let campusId = lead.campusId
        if (!campusId && lead.campus) {
            const campus = await prisma.campus.findUnique({
                where: { campusName: lead.campus }
            })
            if (campus) campusId = campus.id
        }

        if (!campusId) {
            return { success: false, error: `Could not resolve Campus ID for "${lead.campus}"` }
        }

        // Verify Campus is Active
        const targetCampus = await prisma.campus.findUnique({
            where: { id: campusId },
            select: { isActive: true }
        })

        if (!targetCampus) return { success: false, error: 'Campus not found' }
        if (!targetCampus.isActive && user.role !== 'Super Admin') {
            return { success: false, error: 'Cannot admit students to an Inactive Campus' }
        }

        // Execute as a Transaction to ensure atomic conversion
        const result = await prisma.$transaction(async (tx) => {
            // 2. Resolve or Create Parent User
            let pId: number
            const existingParent = await tx.user.findUnique({
                where: { mobileNumber: lead.parentMobile }
            })

            if (existingParent) {
                pId = existingParent.userId
            } else {
                const referralCode = await generateSmartReferralCode('Parent')
                const newParent = await tx.user.create({
                    data: {
                        fullName: lead.parentName,
                        mobileNumber: lead.parentMobile,
                        role: 'Parent',
                        referralCode,
                        childInAchariya: true,
                        status: 'Active',
                        yearFeeBenefitPercent: 0,
                        confirmedReferralCount: 0,
                        isFiveStarMember: false,
                        academicYear: lead.admittedYear || '2025-2026'
                    }
                })
                pId = newParent.userId
            }

            // 3. Find base fee (Strict 0 fallback)
            let bFee = 0
            if (campusId && lead.gradeInterested) {
                const gradeFees: any[] = await tx.$queryRaw`
                    SELECT "annualFee" FROM "GradeFee" 
                    WHERE "campusId" = ${campusId} 
                    AND "grade" = ${lead.gradeInterested} 
                    AND "academicYear" = ${lead.admittedYear || '2025-2026'}
                    LIMIT 1
                `
                if (gradeFees.length > 0) bFee = gradeFees[0].annualFee
            }

            // 4. Create Student
            const student = await tx.student.create({
                data: {
                    fullName: studentDetails.studentName || lead.studentName || 'Unknown',
                    parentId: pId,
                    ambassadorId: lead.userId,
                    campusId: campusId,
                    grade: lead.gradeInterested || 'Unknown',
                    section: studentDetails.section,
                    rollNumber: studentDetails.rollNumber,
                    referralLeadId: lead.leadId,
                    baseFee: bFee,
                    discountPercent: lead.user.yearFeeBenefitPercent || 0,
                    status: 'Active',
                    academicYear: lead.admittedYear || '2025-2026'
                }
            })

            // 5. Update Referral Lead Status
            await tx.referralLead.update({
                where: { leadId: lead.leadId },
                data: { leadStatus: 'Confirmed' } // Or 'Admitted' if you prefer, but UI usually expects 'Confirmed'
            })

            // 6. Increment Ambassador's count and promote to 5-Star if threshold reached
            const updatedUser = await tx.user.update({
                where: { userId: lead.userId },
                data: { confirmedReferralCount: { increment: 1 } }
            })

            if (updatedUser.confirmedReferralCount >= 5 && !updatedUser.isFiveStarMember) {
                await tx.user.update({
                    where: { userId: updatedUser.userId },
                    data: { isFiveStarMember: true }
                })
            }

            return student
        })

        revalidatePath('/superadmin')
        revalidatePath('/campus')
        revalidatePath('/students')

        return { success: true, student: result }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: 'Lead is already linked to a student' }
        }
        console.error('Error converting lead to student:', error)
        return { success: false, error: 'Conversion failed' }
    }
}

export async function bulkAddStudents(students: Array<{
    fullName: string,
    parentMobile: string,
    parentName?: string,
    grade: string,
    campusName: string,
    section?: string,
    rollNumber?: string,
    admissionNumber?: string,
    ambassadorMobile?: string
    ambassadorName?: string
    academicYear?: string
}>) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, added: 0, failed: students.length, errors: ['Unauthorized'] }
    }
    let added = 0
    let failed = 0
    let errors: string[] = []

    // Cache referral counts for limits
    const referralCounts = new Map<number, number>()

    for (const s of students) {
        try {
            // 0. Duplicate Check (ERP No)
            if (s.admissionNumber) {
                const existingStudent = await prisma.student.findUnique({
                    where: { admissionNumber: s.admissionNumber }
                })
                if (existingStudent) {
                    failed++
                    errors.push(`${s.fullName}: Duplicate Student ERP No (${s.admissionNumber})`)
                    continue
                }
            }

            // 1. Find or Create Parent
            let parent = await prisma.user.findUnique({ where: { mobileNumber: s.parentMobile } })

            if (!parent) {
                if (s.parentName) {
                    try {
                        const referralCode = await generateSmartReferralCode('Parent')
                        parent = await prisma.user.create({
                            data: {
                                fullName: s.parentName,
                                mobileNumber: s.parentMobile,
                                role: 'Parent',
                                referralCode,
                                childInAchariya: true,
                                status: 'Active',
                                yearFeeBenefitPercent: 0,
                                confirmedReferralCount: 0,
                                isFiveStarMember: false,
                                academicYear: s.academicYear || '2025-2026'
                            }
                        })
                    } catch (err) {
                        failed++
                        errors.push(`${s.fullName}: Failed to create parent (${s.parentMobile})`)
                        continue
                    }
                } else {
                    failed++
                    errors.push(`${s.fullName}: Parent not found & no name provided (${s.parentMobile})`)
                    continue
                }
            }

            // 2. Find Campus
            // 2. Find Campus
            const campus = await prisma.campus.findUnique({ where: { campusName: s.campusName } })
            if (!campus) {
                failed++
                errors.push(`${s.fullName}: Campus not found (${s.campusName})`)
                continue
            }
            if (!campus.isActive && user.role !== 'Super Admin') {
                failed++
                errors.push(`${s.fullName}: Campus is INACTIVE (${s.campusName})`)
                continue
            }

            // 3. Find Ambassador (Mobile Priority, Name Fallback)
            let ambassadorId = null

            // Try Mobile First
            if (s.ambassadorMobile) {
                const ambassador = await prisma.user.findUnique({ where: { mobileNumber: s.ambassadorMobile } })
                if (ambassador) {
                    ambassadorId = ambassador.userId
                } else {
                    errors.push(`${s.fullName}: Ambassador Mobile not found (${s.ambassadorMobile}), skipping link.`)
                }
            }
            // Try Name Second (if no mobile)
            else if (s.ambassadorName) {
                const matches = await prisma.user.findMany({
                    where: {
                        fullName: { equals: s.ambassadorName, mode: 'insensitive' },
                        role: { not: 'Student' as any } // Exclude students? Actually checking all non-students is safer
                    }
                })

                if (matches.length === 1) {
                    ambassadorId = matches[0].userId
                } else if (matches.length > 1) {
                    errors.push(`${s.fullName}: Multiple ambassadors named "${s.ambassadorName}". Use Mobile Number instead.`)
                } else {
                    errors.push(`${s.fullName}: No ambassador named "${s.ambassadorName}" found.`)
                }
            }

            // 3.1 Referral Limit Check
            if (ambassadorId) {
                // Get existing count for this ambassador in this AY
                if (!referralCounts.has(ambassadorId)) {
                    const count = await prisma.student.count({
                        where: {
                            ambassadorId: ambassadorId,
                            academicYear: s.academicYear || '2025-2026' // Assuming hardcoded for now or fetch from SystemSettings if available
                        }
                    })
                    referralCounts.set(ambassadorId, count)
                }

                const currentCount = referralCounts.get(ambassadorId) || 0
                if (currentCount >= 5) {
                    failed++
                    errors.push(`${s.fullName}: Ambassador limit reached (Max 5) for ${s.ambassadorMobile || s.ambassadorName}`)
                    continue
                }

                // Increment locally to catch limits within the same batch
                referralCounts.set(ambassadorId, currentCount + 1)
            }

            // Perform Student Creation in a transaction to ensure Parent-Student link is atomic
            await prisma.$transaction(async (tx) => {
                // Calculate Fees (Reusing logic with tx)
                let bFee = 0
                const gradeFees: any[] = await tx.$queryRaw`
                    SELECT "annualFee" FROM "GradeFee" 
                    WHERE "campusId" = ${campus.id} 
                    AND "grade" = ${s.grade} 
                    AND "academicYear" = ${s.academicYear || '2025-2026'}
                    LIMIT 1
                `
                if (gradeFees.length > 0) bFee = gradeFees[0].annualFee

                const dPercent = parent.yearFeeBenefitPercent || 0

                await tx.student.create({
                    data: {
                        fullName: s.fullName,
                        parentId: parent.userId,
                        campusId: campus.id,
                        grade: s.grade,
                        section: s.section,
                        rollNumber: s.rollNumber,
                        admissionNumber: s.admissionNumber,
                        ambassadorId: ambassadorId,
                        baseFee: bFee,
                        discountPercent: dPercent,
                        status: 'Active',
                        academicYear: s.academicYear || '2025-2026'
                    }
                })
            })

            // Increment Ambassador's count and promote to 5-Star if threshold reached
            if (ambassadorId) {
                const updatedAmbassador = await prisma.user.update({
                    where: { userId: ambassadorId },
                    data: { confirmedReferralCount: { increment: 1 } }
                })

                if (updatedAmbassador.confirmedReferralCount >= 5 && !updatedAmbassador.isFiveStarMember) {
                    await prisma.user.update({
                        where: { userId: ambassadorId },
                        data: { isFiveStarMember: true }
                    })
                }
            }
            added++
        } catch (error) {
            console.error(`Error adding student ${s.fullName}:`, error)
            failed++
            errors.push(`${s.fullName}: Failed to create`)
        }
    }

    revalidatePath('/superadmin')
    revalidatePath('/students')
    return { success: true, added, failed, errors }
}
