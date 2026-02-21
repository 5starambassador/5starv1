'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-service"
import { generateSmartReferralCode } from "@/lib/referral-service"
import { UserRole, Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { logAction } from "@/lib/audit-logger"
import { syncUserStats, revalidateDashboard } from "./sync-actions"

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

// --- Helper: Normalize Grade Names for Matching ---
function normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return ''

    let normalized = grade
        .toUpperCase()                    // Convert to uppercase
        .replace(/\s+/g, ' ')             // Normalize multiple spaces to single space
        .replace(/\s*-\s*/g, '-')         // Remove spaces around hyphens
        .trim()

    // Convert Roman numerals to Arabic numbers
    const romanMap: { [key: string]: string } = {
        'I': '1',
        'II': '2',
        'III': '3',
        'IV': '4',
        'V': '5',
        'VI': '6',
        'VII': '7',
        'VIII': '8',
        'IX': '9',
        'X': '10',
        'XI': '11',
        'XII': '12'
    }

    // Replace roman numerals at the end of grade names
    // e.g., "MONT-II" -> "MONT-2", "GRADE-XII" -> "GRADE-12"
    Object.keys(romanMap).forEach(roman => {
        const regex = new RegExp(`-${roman}$`, 'g')
        normalized = normalized.replace(regex, `-${romanMap[roman]}`)
        // Also handle space separator
        const spaceRegex = new RegExp(` ${roman}$`, 'g')
        normalized = normalized.replace(spaceRegex, `-${romanMap[roman]}`)
    })

    return normalized
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
            // Mapping additional fields for parity with export
            const aadharNo = row.aadharno || row['aadhar no'] || null
            const address = row.address || row['address'] || null
            const bankName = row.bankname || row['bank name'] || null
            const accountNumber = row.accountnumber || row['account number'] || null
            const ifscCode = row.ifsccode || row['ifsc code'] || null
            const bankAccountDetails = row.bankaccountdetails || row['bank account details'] || null
            const grade = row.grade || row['grade'] || null
            const childName = row.childname || row['child name'] || null
            const isFiveStarMember = (row.isfivestarmember || row['is 5-star member'])?.toLowerCase() === 'yes'
            const yearFeeBenefitPercent = parseFloat(row.yearfeebenefitpercent || row['year benefit %'] || row['year_benefit']) || 0
            const longTermBenefitPercent = parseFloat(row.longtermbenefitpercent || row['long term benefit %'] || row['long_term_benefit']) || 0

            // Basic Validation
            if (!fullName || !mobileNumber || !role) {
                const msg = `Missing required fields`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Generate Code if not provided
            const finalReferralCode = referralCode || await generateSmartReferralCode(role, academicYear)

            // Upsert User
            const userData = {
                fullName,
                mobileNumber,
                role,
                email,
                assignedCampus,
                referralCode: finalReferralCode,
                empId,
                childEprNo,
                childInAchariya: childInAchariya,
                childName,
                grade,
                benefitStatus: benefitStatus as any,
                password: password || null,
                academicYear,
                aadharNo,
                address,
                bankName,
                accountNumber,
                ifscCode,
                bankAccountDetails,
                isFiveStarMember,
                yearFeeBenefitPercent,
                longTermBenefitPercent
            }

            await prisma.user.upsert({
                where: { mobileNumber },
                update: userData,
                create: userData
            })

            // Re-sync if it was an update to ensure stats are fresh
            const existing = await prisma.user.findUnique({ where: { mobileNumber } })
            if (existing) {
                await syncUserStats(existing.userId)
            }

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
        let autoVerifiedCount = 0
        const usersToSync = new Set<number>()

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
                const fullName = row.studentname || row.fullname || row['student name'] || row['full name']
                const grade = row.grade || row['grade']
                const campusName = row.campusname || row['campus name studying'] || row['campus name']
                const section = row.section || row['section'] || null
                const admissionNumber = row.admissionnumber || row.admissionNumber || row['erp number'] || row['erp no'] || row['erp no.'] || row['admission number'] || null
                const rollNumber = row.rollnumber || row['roll number'] || null
                const ambassadorMobile = row.ambassadormobile || row['ambassador mobile'] || null

                // Read Feeplan from CSV (support both 'feeplan' and 'feetype' columns)
                const feeplanRaw = row.feeplan || row.Feeplan || row.feetype || row['fee type'] || row['fee plan'] || ''
                const selectedFeeType = feeplanRaw.toString().trim().toUpperCase() === 'OTP' ? 'OTP' : 'WOTP'

                const studentStatus = row.status || row['status'] || 'Active'
                const academicYearForRecord = row.academicyear || row['academic year'] || row.academicYear || '2025-2026'

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
                    // Auto-create Parent as PASSIVE record (No referral code, Pending status)
                    parent = await prisma.user.create({
                        data: {
                            fullName: parentName,
                            mobileNumber: parentMobile,
                            role: 'Parent',
                            referralCode: null, // No code = must pay registration fee to become ambassador
                            assignedCampus: campusName,
                            childEprNo: admissionNumber || null,
                            academicYear: academicYearForRecord,
                            isFiveStarMember: false,
                            childInAchariya: true,
                            status: 'Pending', // Pending payment of registration fee
                            benefitStatus: 'Pending'
                        }
                    })
                }

                if (parent) usersToSync.add(parent.userId)

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


                // Fetch Fee from GradeFee table based on selected plan
                let annualFeeAmount = 0
                let baseFeeValue = 0

                // Normalize the student's grade for matching
                const normalizedStudentGrade = normalizeGrade(grade)

                // Find GradeFee with normalized grade matching
                const allGradeFees = await prisma.gradeFee.findMany({
                    where: {
                        campusId,
                        academicYear: academicYearForRecord
                    }
                })

                // Find matching GradeFee by normalized grade
                const feeRule = allGradeFees.find(gf =>
                    normalizeGrade(gf.grade) === normalizedStudentGrade
                )

                if (feeRule) {
                    const rule = feeRule as any
                    // Get the fee based on OTP or WOTP plan
                    annualFeeAmount = selectedFeeType === 'OTP'
                        ? (rule.annualFee_otp || 0)
                        : (rule.annualFee_wotp || 0)
                    baseFeeValue = annualFeeAmount
                    console.log(`[IMPORT] Matched GradeFee: Student grade "${grade}" -> GradeFee grade "${feeRule.grade}" -> Fee: ${annualFeeAmount}`)
                } else {
                    // No GradeFee found - leave as 0 to show N/A
                    console.log(`[IMPORT] No GradeFee found for Campus ${campusId}, Grade ${grade} (normalized: ${normalizedStudentGrade}), Year ${academicYearForRecord}`)
                    annualFeeAmount = 0
                    baseFeeValue = 0
                }

                // --- AUTO-VERIFICATION Check ---
                // If parent exists and child record found, we mark for sync which handles activation
                // Also auto-verify 'Pending' parents who haven't claimed child yet
                if (parent) {
                    const needsVerification = parent.benefitStatus === 'PendingVerification'
                    const isPending = parent.status === 'Pending' || parent.benefitStatus === 'Pending'

                    if (needsVerification || isPending) {
                        // Auto-populate/Correct parent details from student record
                        // We trust ERP Import Data over User Input for unverified users
                        await prisma.user.update({
                            where: { userId: parent.userId },
                            data: {
                                childInAchariya: true,
                                childName: fullName, // Use student name from import
                                childEprNo: admissionNumber, // Overwrite with correct ERP No
                                grade: grade, // Overwrite with correct Grade
                                campusId: campusId, // Overwrite with correct Campus ID
                                benefitStatus: 'PendingVerification' // Mark as ready for sync/activation
                            }
                        })
                        console.log(`[IMPORT] Auto-corrected/Updated Parent: ${parent.mobileNumber} linked to ${fullName} (${admissionNumber})`)

                        usersToSync.add(parent.userId)
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
                            usersToSync.add(ambassadorId) // Mark for stat update
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
                        usersToSync.add(ambassadorId) // Mark for stat update
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
                        referralLeadId: leadId,
                        baseFee: baseFeeValue,
                        academicYear: academicYearForRecord,
                        selectedFeeType: selectedFeeType,
                        annualFee: annualFeeAmount,
                        status: studentStatus
                    } as any
                })
                processed++
                results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported' })
            } catch (err: any) {
                errors.push(`Row ${index + 2}: ${err.message}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: err.message })
            }
        }

        // --- Post-Processing: Decentralized Sync Stat Updates ---
        if (usersToSync.size > 0) {
            for (const userId of usersToSync) {
                await syncUserStats(userId)
            }
        }

        await revalidateDashboard()

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

// --- Import CRM Leads (Blacklist) ---
export async function importCrmLeads(csvData: string) {
    const admin = await getCurrentUser()
    if (!admin || !admin.role.includes('Admin')) return { success: false, error: 'Unauthorized' }

    try {
        const rows = parseCSV(csvData)
        let processed = 0
        let errors: string[] = []
        let results: any[] = []

        for (const [index, row] of rows.entries()) {
            const mobileNumber = row.mobilenumber || row.mobileNumber || row['mobile number'] || row['phone']
            const parentName = row.parentname || row.parentName || row['parent name'] || row['name']

            // New Fields for Context & Logic
            const studentName = row.studentname || row.studentName || row['student name'] || null
            const grade = row.grade || row.grade || null
            const campus = row.campus || row['campus name'] || null

            // Date Parsing - Try to parse 'visitDate' or 'date', default to NOW if missing
            let visitDate = new Date()
            const dateStr = row.visitdate || row.visitDate || row['visit date'] || row['date']
            if (dateStr) {
                const parsed = new Date(dateStr)
                if (!isNaN(parsed.getTime())) visitDate = parsed
            }

            const source = row.source || row['source'] || 'Walk-in'


            if (!mobileNumber) {
                const msg = `Mobile Number is required`
                errors.push(`Row ${index + 2}: ${msg}`)
                results.push({ row: index + 2, data: row, status: 'Failed', reason: msg })
                continue
            }

            // Upsert: If exists, just update name/source (idempotent)
            const crmEntry = await prisma.crmLead.upsert({
                where: { mobileNumber },
                update: {
                    parentName: parentName || undefined,
                    studentName: studentName || undefined,
                    grade: grade || undefined,
                    campus: campus || undefined,
                    visitDate: visitDate, // Update date to latest CRM record
                    source: source
                },
                create: {
                    mobileNumber,
                    parentName: parentName || null,
                    studentName: studentName || null,
                    grade: grade || null,
                    campus: campus || null,
                    visitDate: visitDate,
                    source
                }
            })

            // --- RETROACTIVE ENFORCEMENT (First Source Wins) ---
            // If this parent already has a Pending Referral, check who was first.
            const pendingReferral = await prisma.referralLead.findFirst({
                where: {
                    parentMobile: mobileNumber,
                    leadStatus: { in: ['New', 'Interested', 'Follow_up', 'Contacted'] } // Only Open leads
                }
            })

            if (pendingReferral) {
                // If CRM Visit was BEFORE the Referral was created -> CRM Wins
                if (visitDate < pendingReferral.createdAt) {
                    await prisma.referralLead.update({
                        where: { leadId: pendingReferral.leadId },
                        data: {
                            leadStatus: 'Rejected',
                            rejectionReason: `Duplicate: Parent visited school directly on ${visitDate.toDateString()} (First Source Wins)`
                        }
                    })
                    results.push({ row: index + 2, data: row, status: 'Warning', reason: 'Retroactively Rejected an existing Referral (First Source Wins)' })
                    processed++
                    continue
                }
            }

            processed++
            results.push({ row: index + 2, data: row, status: 'Success', reason: 'Imported/Updated' })
        }

        return { success: true, processed, errors, results }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// --- BACKFILL: Populate Annual Fees for Existing Students ---
export async function backfillStudentFees() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const studentsToUpdate = await prisma.student.findMany({
            where: {
                OR: [
                    { annualFee: null },
                    { annualFee: 0 },
                    { selectedFeeType: null }
                ]
            },
            include: { campus: true }
        })

        console.log(`[BACKFILL] Found ${studentsToUpdate.length} students to process`)

        let updated = 0
        let failed = 0
        const failures: any[] = []

        for (const student of studentsToUpdate) {
            try {
                const currentYearRecord = await prisma.academicYear.findFirst({
                    where: { isCurrent: true }
                })
                const currentYear = currentYearRecord?.year || student.academicYear || "2025-2026"

                console.log(`[BACKFILL] Processing: ${student.fullName} - Campus: ${student.campusId}, Grade: ${student.grade}, Year: ${currentYear}`)

                // Normalize the student's grade for matching
                const normalizedStudentGrade = normalizeGrade(student.grade)

                // Find GradeFee with normalized grade matching
                const allGradeFees = await prisma.gradeFee.findMany({
                    where: {
                        campusId: student.campusId,
                        academicYear: currentYear
                    }
                })

                // Find matching GradeFee by normalized grade
                const gradeFee = allGradeFees.find(gf =>
                    normalizeGrade(gf.grade) === normalizedStudentGrade
                )

                if (!gradeFee) {
                    console.log(`[BACKFILL] No GradeFee found for ${student.fullName} - Grade "${student.grade}" (normalized: ${normalizedStudentGrade})`)
                    failures.push({
                        student: student.fullName,
                        reason: `No GradeFee for Campus ${student.campusId}, Grade ${student.grade}, Year ${currentYear}`
                    })
                    failed++
                    continue
                }

                const feeType = student.selectedFeeType || 'WOTP'
                const annualFee = feeType === 'OTP'
                    ? (gradeFee.annualFee_otp || 0)
                    : (gradeFee.annualFee_wotp || 0)

                console.log(`[BACKFILL] Matched! Student grade "${student.grade}" -> GradeFee grade "${gradeFee.grade}" -> FeeType=${feeType}, AnnualFee=${annualFee}`)

                await prisma.student.update({
                    where: { studentId: student.studentId },
                    data: {
                        selectedFeeType: feeType,
                        annualFee: annualFee
                    }
                })

                updated++
            } catch (err: any) {
                console.error(`[BACKFILL] Error processing ${student.fullName}:`, err.message)
                failures.push({
                    student: student.fullName,
                    reason: err.message
                })
                failed++
            }
        }

        console.log(`[BACKFILL] Complete: Updated=${updated}, Failed=${failed}`)
        console.log('[BACKFILL] Failures:', failures)

        await revalidateDashboard()
        return { success: true, updated, failed, total: studentsToUpdate.length }
    } catch (error: any) {
        console.error('[BACKFILL] Error:', error)
        return { success: false, error: error.message }
    }
}

// --- DIAGNOSTIC: Generate Missing GradeFee Report ---
export async function generateMissingGradeFeeReport() {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    { annualFee: null },
                    { annualFee: 0 }
                ]
            },
            include: {
                campus: true
            },
            orderBy: [
                { campusId: 'asc' },
                { grade: 'asc' }
            ]
        })

        // Group by campus and grade
        const missingCombinations = new Map<string, {
            campusName: string
            campusId: number
            grade: string
            academicYear: string
            studentCount: number
            students: { name: string, admissionNumber: string }[]
        }>()

        for (const student of students) {
            const currentYearRecord = await prisma.academicYear.findFirst({
                where: { isCurrent: true }
            })
            const currentYear = currentYearRecord?.year || student.academicYear || "2025-2026"

            // Check if GradeFee exists
            const gradeFee = await prisma.gradeFee.findFirst({
                where: {
                    campusId: student.campusId,
                    grade: student.grade,
                    academicYear: currentYear
                }
            })

            if (!gradeFee) {
                const key = `${student.campusId}-${student.grade}-${currentYear}`
                if (!missingCombinations.has(key)) {
                    missingCombinations.set(key, {
                        campusName: student.campus?.campusName || 'Unknown',
                        campusId: student.campusId,
                        grade: student.grade,
                        academicYear: currentYear,
                        studentCount: 0,
                        students: []
                    })
                }
                const combo = missingCombinations.get(key)!
                combo.studentCount++
                combo.students.push({
                    name: student.fullName,
                    admissionNumber: student.admissionNumber || `ID-${student.studentId}`
                })
            }
        }

        // Generate report text
        let report = '# Missing GradeFee Report\n\n'
        report += `Generated: ${new Date().toLocaleString()}\n\n`
        report += `Total Students Missing Fees: ${students.length}\n\n`
        report += `## Missing Grade/Campus Combinations\n\n`

        for (const [key, combo] of missingCombinations.entries()) {
            report += `### ${combo.campusName} - ${combo.grade} (${combo.academicYear})\n`
            report += `- **Campus ID**: ${combo.campusId}\n`
            report += `- **Students Affected**: ${combo.studentCount}\n`
            report += `- **Reason**: No GradeFee record configured for Grade "${combo.grade}" at "${combo.campusName}" campus for academic year ${combo.academicYear}\n`
            report += `- **Action Required**: Add GradeFee entry with annualFee_otp and annualFee_wotp values for this combination\n`
            report += `- **Students**: ${combo.students.map(s => `${s.name} (${s.admissionNumber})`).join(', ')}\n\n`
        }

        report += `## Summary\n\n`
        report += `Total missing combinations: ${missingCombinations.size}\n`
        report += `Total students affected: ${students.length}\n\n`
        report += `## Next Steps\n\n`
        report += `1. Navigate to Fee Management in SuperAdmin\n`
        report += `2. Add GradeFee entries for each missing combination above\n`
        report += `3. Run "Backfill Fees" again to populate student fees\n`

        return {
            success: true,
            report,
            totalAffected: students.length,
            missingCombinations: Array.from(missingCombinations.values())
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
