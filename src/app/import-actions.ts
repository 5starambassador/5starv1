'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { generateSmartReferralCode } from "@/lib/referral-service"
import { UserRole, Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

// --- Helper: Simple CSV Parser ---
// --- Helper: Simple CSV Parser ---
function parseCSV(csvText: string) {
    // Remove BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '')
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '')
    // if (lines.length < 2) return [] // Removed to allow empty file check later if needed, but parser needs headers
    if (lines.length < 1) return []

    // Parse Headers: Trim and Lowercase for consistent matching
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())

    if (lines.length < 2) return []

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
            let value = values[i] || ''
            // Remove quotes from value if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1)
            }
            row[h] = value
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
        let results: any[] = []

        // Fetch all campuses mapping
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.campusName.toLowerCase(), c.id]))

        for (const [index, row] of rows.entries()) {
            const campusName = row.campusname || row.campusName || row['campus name']
            const grade = row.grade
            const academicYear = row.academicyear || row.academicYear || row['academic year'] || '2025-2026'
            const annualFee_otp = parseInt(row.annualfee_otp || row.annualFee_otp || row['annual fee otp'] || row['annual fee (otp)']) || null
            const annualFee_wotp = parseInt(row.annualfee_wotp || row.annualFee_wotp || row['annual fee wotp'] || row['annual fee (wotp)']) || null

            if (!campusName || !grade || (annualFee_otp === null && annualFee_wotp === null)) {
                const msg = `Missing required fields (Campus, Grade, or at least one Fee)`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            const campusId = campusMap.get(campusName.toLowerCase())
            if (!campusId) {
                const msg = `Campus '${campusName}' not found`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
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
                update: {
                    annualFee_otp,
                    annualFee_wotp
                } as any,
                create: {
                    campusId,
                    grade,
                    academicYear,
                    annualFee_otp,
                    annualFee_wotp
                } as any
            })
            processed++
            results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported' })
        }

        return { success: true, processed, errors, results }
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
        let results: any[] = []

        for (const [index, row] of rows.entries()) {
            // Flexible Header Mapping (Support both camelCase and Human Readable)
            const fullName = row.fullname || row['full name']
            const mobileNumber = row.mobilenumber || row['mobile number']
            const roleStr = row.role || row['role']
            // Normalize Role (Capitalize first letter to match Enum)
            const roleNorm = roleStr ? (roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase()) : ''

            // Validate against Enum
            const validRoles = ['Parent', 'Staff', 'Alumni', 'Others']
            if (!validRoles.includes(roleNorm)) {
                const msg = `Invalid Role '${roleStr}'. Must be Parent, Staff, Alumni, or Others`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }
            const role = roleNorm as UserRole
            const email = row.email || row['email'] || null
            const assignedCampus = row.assignedcampus || row['campus name'] || row['campus'] || null
            const empId = row.empid || row['emp.id.'] || row['emp id'] || null
            const childEprNo = row.childeprno || row['erp no'] || row['erp no.'] || row['child erp no'] || null
            const academicYear = row.academicyear || row['academic year'] || '2025-2026'
            const password = row.password || row['password'] || null
            const referralCode = row.referralcode || row['referral code'] || null

            // New Fields for Parent Verification logic
            const childInAchariyaRaw = row.childinachariya || row['child in achariya (yes/no)'] || row['child in achariya']
            const benefitStatusRaw = row.benefitstatus || row['benefit status'] || row['status']

            const childInAchariya = (childInAchariyaRaw && childInAchariyaRaw.toLowerCase().startsWith('y')) || false

            let benefitStatus = 'Inactive'
            if (benefitStatusRaw) {
                if (benefitStatusRaw.toLowerCase().includes('pending')) benefitStatus = 'PendingVerification'
                else if (benefitStatusRaw.toLowerCase().includes('active')) benefitStatus = 'Active'
            } else {
                if (childInAchariya) benefitStatus = 'PendingVerification'
            }

            // Basic Validation
            if (!fullName || !mobileNumber || !role) {
                const msg = `Missing required fields`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Check if exists
            const existing = await prisma.user.findUnique({ where: { mobileNumber } })
            if (existing) {
                const msg = `Mobile ${mobileNumber} already exists`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
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
                    childInAchariya: childInAchariya,
                    childName: null,
                    grade: null,
                    benefitStatus: benefitStatus as any, // Cast to avoid stale enum issues
                    status: 'Active',
                    password: password || null,
                    academicYear
                }
            })
            processed++
            results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported' })
        }

        return { success: true, processed, errors, results }

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
        let results: any[] = []

        // Campuses map
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.campusName.toLowerCase(), c.id]))

        // Keep track of ambassadors to update stats for
        const ambassadorsToUpdate = new Set<number>()

        for (const [index, row] of rows.entries()) {
            try {
                // Flexible Headers
                const parentMobile = row.parentmobile || row['parent mobile']
                const parentName = row.parentname || row['parent name']
                const fullName = row.fullname || row['student name'] || row['full name']
                const grade = row.grade || row['grade']
                const campusName = row.campusname || row['campus name studying'] || row['campus name']
                const section = row.section || row['section'] || null
                const admissionNumber = row.admissionnumber || row['erp number'] || row['erp no'] || row['erp no.'] || null
                const rollNumber = row.rollnumber || row['roll number'] || null
                const ambassadorMobile = row.ambassadormobile || row['ambassador mobile'] || null
                const selectedFeeType = (row.feetype || row['fee type'] || '').toString().toUpperCase() as 'OTP' | 'WOTP' || null

                if (!parentMobile || !fullName || !grade || !campusName) {
                    const msg = `Missing required fields`
                    errors.push(`Row ${index + 2}: ${msg}`)
                    results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                    continue
                }

                // Find or Create Parent
                let parent = await prisma.user.findUnique({ where: { mobileNumber: parentMobile } })
                if (!parent) {
                    if (!parentName) {
                        const msg = `Parent not found and 'Parent Name' missing. Cannot create account.`
                        errors.push(`Row ${index + 2}: ${msg}`)
                        results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
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
                    const msg = `Campus '${campusName}' not found`
                    errors.push(`Row ${index + 2}: ${msg}`)
                    results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                    continue
                }

                // Find Ambassador
                let ambassadorId: number | null = null

                // 1. Try Mobile First (Primary Key)
                if (ambassadorMobile) {
                    const amb = await prisma.user.findUnique({ where: { mobileNumber: ambassadorMobile } })
                    if (amb) {
                        ambassadorId = amb.userId
                    }
                }

                // 2. Try Name Second (if mobile not provided or not found)
                if (!ambassadorId) {
                    const ambassadorName = row.ambassadorname || row.ambassadorName || row['ambassador name'] || null

                    if (ambassadorName) {
                        // Search by name (insensitive)
                        const matches = await prisma.user.findMany({
                            where: {
                                fullName: { equals: ambassadorName, mode: 'insensitive' },
                                role: { not: 'Parent' } // Ambassadors are usually Staff or Alumni, but definitely not students (though student role doesn't exist in UserRole enum)
                            }
                        })

                        if (matches.length === 1) {
                            ambassadorId = matches[0].userId
                        }
                        // If multiple matches, we can't safely assign. 
                    }
                }

                // Check admission number uniqueness
                if (admissionNumber) {
                    const exists = await prisma.student.findUnique({ where: { admissionNumber } })
                    if (exists) {
                        const msg = `ERP/Admission no ${admissionNumber} already exists`
                        errors.push(`Row ${index + 2}: ${msg}`)
                        results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                        continue
                    }
                }

                // Fetch Fee Snapshot if needed
                let annualFeeAmount = 0
                if (selectedFeeType) {
                    const feeRule = await prisma.gradeFee.findFirst({
                        where: {
                            campusId,
                            grade,
                            academicYear: row.academicYear || '2025-2026'
                        }
                    })
                    if (feeRule) {
                        const rule = feeRule as any
                        annualFeeAmount = selectedFeeType === 'OTP'
                            ? (rule.annualFee_otp || 0)
                            : (rule.annualFee_wotp || 0)
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
                            admissionNumber: admissionNumber,
                            selectedFeeType: selectedFeeType,
                            annualFee: annualFeeAmount || (existingLead as any).annualFee
                        }
                        if (existingLead.leadStatus !== 'Confirmed') {
                            updateData.leadStatus = 'Confirmed'
                            updateData.confirmedDate = new Date()
                            ambassadorsToUpdate.add(ambassadorId) // Mark for stat update
                        }
                        const updatedLead = await prisma.referralLead.update({
                            where: { leadId: existingLead.leadId },
                            data: updateData as any
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
                                admittedYear: row.academicYear || '2025-2026',
                                admissionNumber: admissionNumber,
                                selectedFeeType: selectedFeeType,
                                annualFee: annualFeeAmount
                            } as any
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
                        section,
                        rollNumber,
                        admissionNumber,
                        ambassadorId, // Link directly
                        referralLeadId: leadId, // Link to referral lead
                        baseFee: row.baseFee ? parseInt(row.baseFee) : 60000,
                        academicYear: row.academicYear || row['Academic Year'] || '2025-2026',
                        selectedFeeType: selectedFeeType,
                        annualFee: annualFeeAmount,
                        status: 'Active'
                    } as any
                })
                processed++
                results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported' })
            } catch (err: any) {
                errors.push(`Row ${index + 2}: ${err.message}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: err.message })
            }
        }

        // --- Post-Processing: Update Ambassador Stats ---
        if (ambassadorsToUpdate.size > 0) {
            const defaultSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }

            for (const userId of ambassadorsToUpdate) {
                const count = await prisma.referralLead.count({
                    where: { userId, leadStatus: 'Confirmed' }
                })

                const lookupCount = Math.min(count, 5)
                const slab = await prisma.benefitSlab.findFirst({
                    where: { referralCount: lookupCount }
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

        return { success: true, processed, errors, results }
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
        let results: any[] = []

        for (const [index, row] of rows.entries()) {
            const campusName = row.campusname || row.campusName || row['campus name']
            const campusCode = row.campuscode || row.campusCode || row['campus code']
            const location = row.location
            const grades = row.grades // Expected as "Pre-Mont, Mont-1, Grade 1" etc.
            const maxCapacity = parseInt(row.maxcapacity || row.maxCapacity || row['max capacity']) || 500

            // Validation
            if (!campusName || !campusCode || !location) {
                const msg = `Missing required fields`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Check existing
            const existing = await prisma.campus.findFirst({
                where: { OR: [{ campusName }, { campusCode }] }
            })

            if (existing) {
                const msg = `Campus ${campusName} (${campusCode}) already exists`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
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
            results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported' })
        }

        return { success: true, processed, errors, results }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// --- Import Referrals (Leads Only) ---
export async function importReferrals(csvData: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        const rows = parseCSV(csvData)
        let processed = 0
        let errors: string[] = []
        let results: any[] = []

        // Campuses map
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.campusName.toLowerCase(), c.id]))

        // Keep track of ambassadors to update stats for
        const ambassadorsToUpdate = new Set<number>()

        // Debug Log
        if (rows.length > 0) {
            console.log('First Row Keys:', Object.keys(rows[0]))
        }

        for (const [index, row] of rows.entries()) {
            const parentName = row.parentname || row.parentName || row['parent name']
            const parentMobile = row.parentmobile || row.parentMobile || row['parent mobile']
            const grade = row.grade || row['grade']
            const section = row.section || row['section'] || null
            const campusName = row.campusname || row.campusName || row['campus name'] || row['campus']
            const ambassadorMobile = row.ambassadormobile || row.ambassadorMobile || row['ambassador mobile']
            const ambassadorName = row.ambassadorname || row.ambassadorName || row['ambassador name'] || null
            const admissionNumber = row.admissionnumber || row.admissionNumber || row['erp no'] || row['admission number'] || null

            // Auto-confirm if ERP number is present, otherwise default to status column or 'Confirmed'
            let status = row.status || row['status'] || 'Confirmed'
            if (admissionNumber && !row.status) {
                status = 'Confirmed'
            }

            if (!parentName || !parentMobile || !grade || !campusName) {
                const missing = []
                if (!parentName) missing.push('Parent Name')
                if (!parentMobile) missing.push('Parent Mobile')
                if (!grade) missing.push('Grade')
                if (!campusName) missing.push('Campus Name')

                // Debugging: Show what keys were found
                const foundKeys = Object.keys(row).join(', ')
                const msg = `Missing required fields: ${missing.join(', ')}. Found keys: [${foundKeys}]`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Find Campus
            const campusId = campusMap.get(campusName.toLowerCase())
            if (!campusId) {
                const msg = `Campus '${campusName}' not found`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Find Ambassador
            let ambassadorId: number | null = null

            // 1. Try Mobile First
            if (ambassadorMobile) {
                const amb = await prisma.user.findUnique({ where: { mobileNumber: ambassadorMobile } })
                if (amb) ambassadorId = amb.userId
            }

            // 2. Try Name Second
            if (!ambassadorId) {
                const ambassadorName = row.ambassadorName || row['Ambassador Name'] || null
                if (ambassadorName) {
                    const matches = await prisma.user.findMany({
                        where: {
                            fullName: { equals: ambassadorName, mode: 'insensitive' },
                            role: { not: 'Parent' }
                        }
                    })
                    if (matches.length === 1) ambassadorId = matches[0].userId
                }
            }

            if (!ambassadorId) {
                const msg = `Ambassador not found (provide valid Mobile or Unique Name)`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Check if Lead Exists
            let existingLead = null

            if (admissionNumber) {
                // Strict check: If ERP number provided, that is the unique identifier for a confirmed referral
                // We check globally to ensure no one else has claimed this ERP
                existingLead = await prisma.referralLead.findFirst({
                    where: { admissionNumber }
                })
            } else {
                // Fallback for New Leads (No ERP): Ambassador + Parent + Student Name
                const studentName = row.studentname || row.studentName || row['student name'] || null
                const whereClause: any = {
                    userId: ambassadorId,
                    parentMobile: parentMobile
                }
                if (studentName) {
                    whereClause.studentName = { equals: studentName, mode: 'insensitive' }
                }
                existingLead = await prisma.referralLead.findFirst({ where: whereClause })
            }

            if (existingLead) {
                const msg = admissionNumber
                    ? `Referral with ERP No ${admissionNumber} already exists specified`
                    : `Referral already exists for this Parent + Ambassador + Student`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            const selectedFeeType = (row.feetype || row.feeType || row['fee type'] || '').toString().toUpperCase() as 'OTP' | 'WOTP' || null

            // Enforce ERP and Fee selection for confirmed leads
            if (status === 'Confirmed') {
                if (!admissionNumber) {
                    const msg = `ERP Number is mandatory for Confirmed status`
                    errors.push(`Row ${index + 2}: ${msg}`)
                    results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                    continue
                }
                if (!selectedFeeType || !['OTP', 'WOTP'].includes(selectedFeeType)) {
                    const msg = `Fee Type (OTP or WOTP) is mandatory for Confirmed status`
                    errors.push(`Row ${index + 2}: ${msg}`)
                    results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                    continue
                }
            }

            // Fetch Fee Snapshot if needed
            let annualFeeAmount = 0
            if (status === 'Confirmed') {
                const feeRule = await prisma.gradeFee.findFirst({
                    where: {
                        campusId,
                        grade,
                        academicYear: row.academicYear || '2025-2026'
                    }
                })
                if (feeRule) {
                    const rule = feeRule as any
                    annualFeeAmount = selectedFeeType === 'OTP' ? (rule.annualFee_otp || 0) : (rule.annualFee_wotp || 0)
                }
            }

            // Create Referral Lead
            await prisma.referralLead.create({
                data: {
                    userId: ambassadorId,
                    parentName,
                    parentMobile,
                    studentName: row.studentname || row.studentName || row['student name'] || null, // Optional
                    gradeInterested: grade,
                    section: section,
                    campusId,
                    campus: campusName,
                    leadStatus: status, // Typically 'Confirmed'
                    confirmedDate: status === 'Confirmed' ? new Date() : null,
                    admittedYear: row.academicyear || row.academicYear || row['academic year'] || '2025-2026',
                    admissionNumber: admissionNumber, // Storing ERP No
                    selectedFeeType: selectedFeeType,
                    annualFee: annualFeeAmount
                } as any
            })

            if (status === 'Confirmed') {
                ambassadorsToUpdate.add(ambassadorId)
            }

            processed++
            results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported' })
        }

        // --- Post-Processing: Update Ambassador Stats ---
        if (ambassadorsToUpdate.size > 0) {
            const defaultSlabs: Record<number, number> = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 }

            for (const userId of ambassadorsToUpdate) {
                const count = await prisma.referralLead.count({
                    where: { userId, leadStatus: 'Confirmed' }
                })

                const lookupCount = Math.min(count, 5)
                const slab = await prisma.benefitSlab.findFirst({
                    where: { referralCount: lookupCount }
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

        return { success: true, processed, errors, results }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
