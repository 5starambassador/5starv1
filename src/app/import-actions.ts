'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { generateSmartReferralCode } from "@/lib/referral-service"
import { UserRole } from "@prisma/client"

// --- Helper: Simple CSV Parser ---
// --- Helper: Simple CSV Parser ---
function parseCSV(csvText: string) {
    // Remove BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '')
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())

    return lines.slice(1).map(line => {
        // Handle quoted values correctly
        const values: string[] = []
        let inQuotes = false
        let currentValue = ''

        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim())
                currentValue = ''
            } else {
                currentValue += char
            }
        }
        values.push(currentValue.trim())

        // Map headers to values
        const row: any = {}
        headers.forEach((h, i) => {
            // Remove any potential quotes from headers
            const cleanHeader = h.replace(/^"|"$/g, '').trim()
            let value = values[i] || ''
            // Remove quotes from value if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1)
            }
            row[cleanHeader] = value
        })
        return row
    })
}

// --- Import Fees ---
export async function importFees(csvData: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        const rows = parseCSV(csvData)
        let processed = 0
        let errors: string[] = []

        // Fetch all campuses mapping
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.campusName.toLowerCase(), c.id]))

        for (const [index, row] of rows.entries()) {
            const campusName = row.campusName
            const grade = row.grade
            const academicYear = row.academicYear || '2025-2026'
            const annualFee = parseInt(row.annualFee)

            if (!campusName || !grade || !annualFee) {
                errors.push(`Row ${index + 2}: Missing required fields`)
                continue
            }

            const campusId = campusMap.get(campusName.toLowerCase())
            if (!campusId) {
                errors.push(`Row ${index + 2}: Campus '${campusName}' not found`)
                continue
            }

            await prisma.gradeFee.upsert({
                where: {
                    campusId_grade_academicYear: {
                        campusId,
                        grade,
                        academicYear
                    }
                },
                update: { annualFee },
                create: {
                    campusId,
                    grade,
                    academicYear,
                    annualFee
                }
            })
            processed++
        }

        return { success: true, processed, errors }
    } catch (error: any) {
        console.error('Import Fees Error:', error)
        return { success: false, error: error.message }
    }
}

// --- Import Ambassadors ---
export async function importAmbassadors(csvData: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        const rows = parseCSV(csvData)
        let processed = 0
        let errors: string[] = []

        for (const [index, row] of rows.entries()) {
            // Flexible Header Mapping (Support both camelCase and Human Readable)
            const fullName = row.fullName || row['Full Name']
            const mobileNumber = row.mobileNumber || row['Mobile Number']
            const roleStr = row.role || row['Role']
            // Normalize Role (Capitalize first letter to match Enum)
            const roleNorm = roleStr ? (roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase()) : ''

            // Validate against Enum
            const validRoles = ['Parent', 'Staff', 'Alumni', 'Others']
            if (!validRoles.includes(roleNorm)) {
                errors.push(`Row ${index + 2}: Invalid Role '${roleStr}'. Must be Parent, Staff, Alumni, or Others`)
                continue
            }
            const role = roleNorm as UserRole
            const email = row.email || row['Email'] || null
            const assignedCampus = row.assignedCampus || row['Campus Name'] || row['Campus'] || null
            const empId = row.empId || row['EMP.ID.'] || row['Emp ID'] || null
            const childEprNo = row.childEprNo || row['ERP No'] || row['ERP No.'] || null
            const academicYear = row.academicYear || row['Academic Year'] || '2025-2026'
            const password = row.password || row['Password'] || null
            const referralCode = row.referralCode || row['Referral Code'] || null

            // Basic Validation
            if (!fullName || !mobileNumber || !role) {
                errors.push(`Row ${index + 2}: Missing required fields`)
                continue
            }

            // Check if exists
            const existing = await prisma.user.findUnique({ where: { mobileNumber } })
            if (existing) {
                errors.push(`Row ${index + 2}: Mobile ${mobileNumber} already exists`)
                continue
            }

            // Generate Code if not provided
            const finalReferralCode = referralCode || await generateSmartReferralCode(role, academicYear)

            // Create User
            await prisma.user.create({
                data: {
                    fullName,
                    mobileNumber,
                    role,
                    email,
                    assignedCampus,
                    referralCode: finalReferralCode,
                    empId,
                    childEprNo,
                    childInAchariya: false, // Defaulting to false for bulk upload unless specified
                    childName: null,
                    grade: null,
                    status: 'Active',
                    password: password || null,
                    academicYear
                }
            })
            processed++
        }

        return { success: true, processed, errors }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// --- Import Students ---
export async function importStudents(csvData: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        const rows = parseCSV(csvData)
        let processed = 0
        let errors: string[] = []

        // Campuses map
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.campusName.toLowerCase(), c.id]))

        // Keep track of ambassadors to update stats for
        const ambassadorsToUpdate = new Set<number>()

        for (const [index, row] of rows.entries()) {
            // Flexible Headers
            const parentMobile = row.parentMobile || row['Parent Mobile']
            const parentName = row.parentName || row['Parent Name']
            const fullName = row.fullName || row['Student Name'] || row['Full Name']
            const grade = row.grade || row['Grade']
            const campusName = row.campusName || row['Campus Name Studying'] || row['Campus Name']
            const section = row.section || row['Section'] || null
            const admissionNumber = row.admissionNumber || row['ERP Number'] || row['ERP No'] || row['ERP No.'] || null
            const rollNumber = row.rollNumber || row['Roll Number'] || null
            const ambassadorMobile = row.ambassadorMobile || row['Ambassador Mobile'] || null

            if (!parentMobile || !fullName || !grade || !campusName) {
                errors.push(`Row ${index + 2}: Missing required fields`)
                continue
            }

            // Find or Create Parent
            let parent = await prisma.user.findUnique({ where: { mobileNumber: parentMobile } })
            if (!parent) {
                if (!parentName) {
                    errors.push(`Row ${index + 2}: Parent not found and 'Parent Name' missing. Cannot create account.`)
                    continue
                }
                // Auto-create Parent
                const newCode = await generateSmartReferralCode('Parent', row.academicYear || '2025-2026')
                parent = await prisma.user.create({
                    data: {
                        fullName: parentName,
                        mobileNumber: parentMobile,
                        role: 'Parent',
                        referralCode: newCode,
                        status: 'Active',
                        assignedCampus: campusName, // Assign to student's campus
                        childEprNo: admissionNumber || null, // Link ERP if available
                        academicYear: row.academicYear || '2025-2026',
                        isFiveStarMember: false, // Default to false until they register/upgrade
                        childInAchariya: true
                    }
                })
            }

            // Find Campus
            const campusId = campusMap.get(campusName.toLowerCase())
            if (!campusId) {
                errors.push(`Row ${index + 2}: Campus '${campusName}' not found`)
                continue
            }

            // Find Ambassador
            let ambassadorId: number | null = null
            if (ambassadorMobile) {
                const amb = await prisma.user.findUnique({ where: { mobileNumber: ambassadorMobile } })
                if (amb) ambassadorId = amb.userId
            }

            // Check admission number uniqueness
            if (admissionNumber) {
                const exists = await prisma.student.findUnique({ where: { admissionNumber } })
                if (exists) {
                    errors.push(`Row ${index + 2}: ERP/Admission no ${admissionNumber} already exists`)
                    continue
                }
            }

            // Handle Referral Logic (Create/Update Confirmed Lead)
            let leadId: number | null = null
            if (ambassadorId) {
                const existingLead = await prisma.referralLead.findFirst({
                    where: { userId: ambassadorId, parentMobile: parentMobile }
                })

                if (existingLead) {
                    // Start Update
                    const updateData: any = {
                        studentName: fullName,
                        gradeInterested: grade,
                        campusId,
                        campus: campusName,
                    }
                    if (existingLead.leadStatus !== 'Confirmed') {
                        updateData.leadStatus = 'Confirmed'
                        updateData.confirmedDate = new Date()
                        ambassadorsToUpdate.add(ambassadorId) // Mark for stat update
                    }
                    const updatedLead = await prisma.referralLead.update({
                        where: { leadId: existingLead.leadId },
                        data: updateData
                    })
                    leadId = updatedLead.leadId
                } else {
                    // Create New Confirmed Lead
                    const newLead = await prisma.referralLead.create({
                        data: {
                            userId: ambassadorId,
                            parentName: parent.fullName,
                            parentMobile,
                            studentName: fullName,
                            gradeInterested: grade,
                            campusId,
                            campus: campusName,
                            leadStatus: 'Confirmed',
                            confirmedDate: new Date(),
                            admittedYear: row.academicYear || '2025-2026'
                        }
                    })
                    leadId = newLead.leadId
                    ambassadorsToUpdate.add(ambassadorId) // Mark for stat update
                }
            }

            // Create Student
            await prisma.student.create({
                data: {
                    fullName,
                    parentId: parent.userId,
                    campusId,
                    grade,
                    studentId: undefined,
                    section,
                    rollNumber,
                    admissionNumber,
                    ambassadorId, // Link directly
                    referralLeadId: leadId, // Link to referral lead
                    baseFee: row.baseFee ? parseInt(row.baseFee) : 60000,
                    academicYear: row.academicYear || row['Academic Year'] || '2025-2026',
                    status: 'Active'
                }
            })
            processed++
        }

        // --- Post-Processing: Update Ambassador Stats ---
        // (Replicating logic from campus-dashboard-actions.ts updateLeadStatus)
        if (ambassadorsToUpdate.size > 0) {
            const defaultSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }

            for (const userId of ambassadorsToUpdate) {
                const count = await prisma.referralLead.count({
                    where: { userId, leadStatus: 'Confirmed' } // 'Confirmed' matches LeadStatus enum string
                })

                const lookupCount = Math.min(count, 5)
                const slab = await prisma.benefitSlab.findFirst({
                    where: { referralCount: lookupCount } // Assuming 1-5 mapping
                })

                const yearFeeBenefit = slab ? slab.yearFeeBenefitPercent : (defaultSlabs[lookupCount] || 0)

                await prisma.user.update({
                    where: { userId },
                    data: {
                        confirmedReferralCount: count,
                        yearFeeBenefitPercent: yearFeeBenefit,
                        benefitStatus: count >= 1 ? 'Active' : 'Inactive',
                        lastActiveYear: 2025
                    }
                })
            }
        }

        return { success: true, processed, errors }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
// --- Import Campuses ---
export async function importCampuses(csvData: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        const rows = parseCSV(csvData)
        let processed = 0
        let errors: string[] = []

        for (const [index, row] of rows.entries()) {
            const campusName = row.campusName
            const campusCode = row.campusCode
            const location = row.location
            const grades = row.grades // Expected as "Pre-Mont, Mont-1, Grade 1" etc.
            const maxCapacity = row.maxCapacity ? parseInt(row.maxCapacity) : 500

            // Validation
            if (!campusName || !campusCode || !location) {
                errors.push(`Row ${index + 2}: Missing required fields`)
                continue
            }

            // Check existing
            const existing = await prisma.campus.findFirst({
                where: { OR: [{ campusName }, { campusCode }] }
            })

            if (existing) {
                errors.push(`Row ${index + 2}: Campus ${campusName} (${campusCode}) already exists`)
                continue
            }

            await prisma.campus.create({
                data: {
                    campusName,
                    campusCode,
                    location,
                    grades: grades || '',
                    maxCapacity,
                    currentEnrollment: 0,
                    isActive: true
                }
            })
            processed++
        }

        return { success: true, processed, errors }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
