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
                    select: { campusName: true }
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
}) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        let parentId = data.parentId

        // Create new parent if details provided
        if (data.newParent) {
            const existingParent = await prisma.user.findUnique({
                where: { mobileNumber: data.newParent.mobileNumber }
            })

            if (existingParent) {
                // If parent exists, just use their ID (or could throw error depending on preference)
                parentId = existingParent.userId
            } else {
                // Generate smart referral code
                const referralCode = await generateSmartReferralCode('Parent')

                const newParent = await prisma.user.create({
                    data: {
                        fullName: data.newParent.fullName,
                        mobileNumber: data.newParent.mobileNumber,
                        role: 'Parent',
                        referralCode,
                        childInAchariya: true,
                        status: 'Active',
                        yearFeeBenefitPercent: 0,
                        confirmedReferralCount: 0,
                        isFiveStarMember: false
                    }
                })
                parentId = newParent.userId
            }
        }

        // Calculate Fees if missing (Live Data)
        let baseFee = data.baseFee
        let discountPercent = data.discountPercent

        if (baseFee === undefined || baseFee === null) {
            // Fetch default fee for Campus + Grade
            baseFee = 60000 // Default fallback
            const gradeFee = await prisma.gradeFee.findUnique({
                where: {
                    campusId_grade: {
                        campusId: data.campusId,
                        grade: data.grade
                    }
                }
            })
            if (gradeFee) baseFee = gradeFee.annualFee
        }

        if (discountPercent === undefined || discountPercent === null) {
            // Fetch parent's discount entitlement
            const parent = await prisma.user.findUnique({
                where: { userId: parentId }
            })
            discountPercent = parent?.yearFeeBenefitPercent || 0
        }

        const student = await prisma.student.create({
            data: {
                fullName: data.fullName,
                parentId: parentId,
                campusId: data.campusId,
                grade: data.grade,
                section: data.section,
                rollNumber: data.rollNumber,
                status: 'Active',
                baseFee: baseFee as number,
                discountPercent: discountPercent as number
            }
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
}>) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('CampusHead'))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // Recalculate fees if critical fields change
        let updateData = { ...data }

        if (data.campusId && data.grade && !data.baseFee) {
            const gradeFee = await prisma.gradeFee.findUnique({
                where: {
                    campusId_grade: {
                        campusId: data.campusId,
                        grade: data.grade
                    }
                }
            })
            if (gradeFee) updateData.baseFee = gradeFee.annualFee
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

        // 2. Resolve or Create Parent User
        let parentId: number
        const existingParent = await prisma.user.findUnique({
            where: { mobileNumber: lead.parentMobile }
        })

        if (existingParent) {
            parentId = existingParent.userId
        } else {
            // Create new parent user
            const referralCode = await generateSmartReferralCode('Parent')

            const newParent = await prisma.user.create({
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
            parentId = newParent.userId
        }

        // 3. Find or default base fee from campus/grade
        let baseFee = 60000
        if (campusId && lead.gradeInterested) {
            const gradeFee = await prisma.gradeFee.findUnique({
                where: {
                    campusId_grade: {
                        campusId: campusId,
                        grade: lead.gradeInterested
                    }
                }
            })
            if (gradeFee) baseFee = gradeFee.annualFee
        }

        // 4. Create Student
        const student = await prisma.student.create({
            data: {
                fullName: studentDetails.studentName,
                parentId: parentId,
                ambassadorId: lead.userId,
                campusId: campusId,
                grade: lead.gradeInterested || 'Unknown',
                section: studentDetails.section,
                rollNumber: studentDetails.rollNumber,
                referralLeadId: lead.leadId,
                baseFee,
                discountPercent: lead.user.yearFeeBenefitPercent || 0,
                status: 'Active'
            }
        })

        revalidatePath('/superadmin')
        revalidatePath('/campus')
        revalidatePath('/students')

        return { success: true, student }
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
            const campus = await prisma.campus.findUnique({ where: { campusName: s.campusName } })
            if (!campus) {
                failed++
                errors.push(`${s.fullName}: Campus not found (${s.campusName})`)
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
                        role: { not: 'Student' } // Exclude students? Actually checking all non-students is safer
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

            // 4. Calculate Fees (Reusing logic)
            // Base Fee
            let baseFee = 60000
            const gradeFee = await prisma.gradeFee.findUnique({
                where: { campusId_grade: { campusId: campus.id, grade: s.grade } }
            })
            if (gradeFee) baseFee = gradeFee.annualFee

            // Discount
            const discountPercent = parent.yearFeeBenefitPercent || 0

            // 5. Create Student
            await prisma.student.create({
                data: {
                    fullName: s.fullName,
                    parentId: parent.userId,
                    campusId: campus.id,
                    grade: s.grade,
                    section: s.section,
                    rollNumber: s.rollNumber,
                    admissionNumber: s.admissionNumber,
                    ambassadorId: ambassadorId,
                    baseFee,
                    discountPercent,
                    status: 'Active',
                    academicYear: s.academicYear || '2025-2026'
                }
            })
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
