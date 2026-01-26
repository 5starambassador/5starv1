'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { EmailService } from '@/lib/email-service'
import { smsService } from '@/lib/sms-service'
import { getNotificationSettings } from './notification-actions'
import { notifyReferralSubmitted, notifyAdminNewReferral } from '@/lib/notification-helper'

import { referralSchema } from '@/lib/validators'
import { LeadStatus } from '@prisma/client'

// Helper for consistent sanitization (match main actions.ts)
function sanitizeMobile(input: string): string {
    let mobile = input.replace(/\D/g, '')
    if (mobile.length > 10 && mobile.startsWith('91')) {
        mobile = mobile.slice(2)
    }
    return mobile
}

export async function sendReferralOtp(mobileInput: string, referralCode?: string) {
    const mobile = sanitizeMobile(mobileInput)
    console.log('[DEBUG] sendReferralOtp input:', mobileInput, 'Sanitized:', mobile)

    // Check 1: Is this mobile number already a registered user?
    const existingUser = await prisma.user.findUnique({
        where: { mobileNumber: mobile }
    })

    if (existingUser) {
        return { success: false, error: 'This mobile number is already registered as an existing User.' }
    }

    // Check 2: Has this mobile number already been referred?
    const existingLead = await prisma.referralLead.findFirst({
        where: { parentMobile: mobile }
    })

    if (existingLead) {
        return { success: false, error: 'A referral with this mobile number already exists.' }
    }

    // Check 3: Determine OTP destination
    let destinationMobile = mobile
    let isAmbassadorVerified = false
    let ambassadorName = ''

    if (referralCode) {
        const ambassador = await prisma.user.findUnique({
            where: { referralCode }
        })
        if (ambassador) {
            destinationMobile = ambassador.mobileNumber
            isAmbassadorVerified = true
            ambassadorName = ambassador.fullName
        }
    }

    // IDEMPOTENT OTP GENERATION (same as main actions.ts)
    let finalOtp: string

    // Try to find existing valid OTP first
    const existingRecord = await prisma.otpVerification.findUnique({ where: { mobile } })

    // Smart Sticky: Reuse if valid for at least 60 more seconds
    if (existingRecord && existingRecord.expiresAt > new Date(Date.now() + 60000)) {
        console.log('[DEBUG] Smart Sticky (Referral): Reusing existing OTP', existingRecord.otp)
        finalOtp = existingRecord.otp
    } else {
        // Generate New - 4 digits, 3 minutes (consistent with main flow)
        finalOtp = Math.floor(1000 + Math.random() * 9000).toString()
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000) // 3 Minutes

        // Upsert (Atomic Update)
        await prisma.otpVerification.upsert({
            where: { mobile },
            update: { otp: finalOtp, expiresAt },
            create: { mobile, otp: finalOtp, expiresAt }
        })
        console.log('[DEBUG] Generated New OTP (Referral):', finalOtp)
    }

    try {
        if (process.env.NODE_ENV === 'development') {
            logger.info(`[OTP] Sending OTP ${finalOtp} to ${destinationMobile} (Ambassador: ${isAmbassadorVerified})`)
        }

        // Send SMS
        const smsResult = await smsService.sendOTP(destinationMobile, finalOtp, 'referral')

        if (!smsResult.success) {
            console.error('[Referral] SMS Failed:', smsResult.error)
            // CRITICAL FIX: DO NOT DELETE RECORD ON FAILURE (same as main flow)
            return { success: false, error: 'SMS delivery failed. Please click Resend.' }
        }

        return {
            success: true,
            isAmbassadorVerified,
            ambassadorName,
            // otp: process.env.NODE_ENV === 'development' ? finalOtp : undefined // DISABLED MOCK OTP
        }
    } catch (error) {
        logger.error('Failed to generate OTP:', error)
        return { success: false, error: 'Failed to generate OTP' }
    }
}

export async function verifyReferralOtp(mobileInput: string, otp: string) {
    const mobile = sanitizeMobile(mobileInput)
    console.log('[DEBUG] verifyReferralOtp:', { otp, mobileInput, sanitized: mobile })

    // Mock OTP for testing - DISABLED
    // if (otp === '1234') return { success: true }

    try {
        const record = await prisma.otpVerification.findUnique({ where: { mobile } })

        if (!record) {
            console.log('[DEBUG] No OTP record found for:', mobile)
            return { success: false, error: 'OTP request expired. Try again.' }
        }

        const now = new Date()
        const isExpired = now > record.expiresAt
        const isMatch = record.otp === otp

        console.log('[DEBUG] Referral OTP Check:', {
            serverTime: now,
            expiresAt: record.expiresAt,
            isExpired,
            isMatch,
            recordOtp: record.otp,
            receivedOtp: otp
        })

        if (isExpired) return { success: false, error: 'OTP has expired. Please request a new one.' }
        if (!isMatch) return { success: false, error: 'Incorrect OTP. Please check and try again.' }

        // OTP verified - clean up
        await prisma.otpVerification.delete({ where: { mobile } })
        return { success: true }
    } catch (error) {
        logger.error('OTP Verification Error:', error)
        return { success: false, error: 'Verification failed' }
    }
}

// --- Submission ---

/**
 * Submits a new referral lead.
 * @param formData - The lead details including parentName, parentMobile, studentName, campus, and gradeInterested.
 * @returns A result object with success status and optional error message.
 */
export async function submitReferral(formData: {
    parentName: string
    parentMobile: string
    studentName?: string // Changed to optional to match wrapper and allow validation to handle it
    campus?: string
    gradeInterested?: string
}, referralCode?: string) {
    const user = await getCurrentUser()
    // If no logged in user, we must have a referral code
    if (!user && !referralCode) return { success: false, error: 'Unauthorized or missing referral code' }

    // Validate Input (Strict)
    const result = referralSchema.safeParse(formData)
    if (!result.success) {
        return { success: false, error: result.error.issues[0].message }
    }

    const { parentName, parentMobile, studentName, campus, gradeInterested } = result.data

    try {
        // Check 1: Is this mobile number already a registered user?
        const existingUser = await prisma.user.findUnique({
            where: { mobileNumber: parentMobile }
        })

        if (existingUser) {
            return { success: false, error: 'This mobile number is already registered as an existing User.' }
        }

        // Check 1.5: Is this mobile number in the blocked CRM Lead list? (Lead Guard)
        const existingCrmLead = await prisma.crmLead.findUnique({
            where: { mobileNumber: parentMobile }
        })

        if (existingCrmLead) {
            return { success: false, error: 'This parent has already visited the campus directly (CRM). Cannot claim as referral.' }
        }

        // Check 2: Has this mobile number already been referred? (Strict Lead Check)
        const existingLead = await prisma.referralLead.findFirst({
            where: { parentMobile }
        })

        if (existingLead) {
            return { success: false, error: 'A referral with this mobile number already exists.' }
        }

        let referringUserId = user?.userId

        // If submitted via public link, find the ambassador by code
        if (!referringUserId && referralCode) {
            const ambassador = await prisma.user.findUnique({
                where: { referralCode }
            })
            if (!ambassador) return { success: false, error: 'Invalid referral code' }
            referringUserId = ambassador.userId
        }

        if (!referringUserId) return { success: false, error: 'Ambassador attribution failed' }

        const newLead = await prisma.referralLead.create({
            data: {
                userId: referringUserId,
                parentName,
                parentMobile,
                studentName,
                campus,
                gradeInterested,
                admittedYear: '2026-2027' // Enforce current active year for form submissions
            }
        })

        // --- Send In-App Notifications ---
        try {
            // Notify ambassador that referral was submitted successfully
            await notifyReferralSubmitted(referringUserId, {
                parentName,
                leadId: newLead.leadId
            })

            // Notify admin/campus head about new referral
            const settings = await getNotificationSettings()
            if (settings.notifyCampusHeadOnNewLeads && campus) {
                const campusData = await prisma.campus.findUnique({
                    where: { campusName: campus }
                })

                if (campusData?.campusHeadId) {
                    const ambassador = await prisma.user.findUnique({
                        where: { userId: referringUserId },
                        select: { fullName: true }
                    })

                    await notifyAdminNewReferral(
                        campusData.campusHeadId,
                        { parentName, leadId: newLead.leadId },
                        { fullName: ambassador?.fullName || 'Ambassador', userId: referringUserId }
                    )
                }
            }
        } catch (notifError) {
            console.error('In-app notification error:', notifError)
            // Don't fail the referral submission if notification fails
        }

        // --- Lead Alerting (Email) ---
        try {
            const settings = await getNotificationSettings()
            if (settings.notifyCampusHeadOnNewLeads && campus) {
                const campusData = await prisma.campus.findUnique({
                    where: { campusName: campus },
                    include: { students: false }
                })

                if (campusData && campusData.campusHeadId) {
                    const campusHead = await prisma.admin.findUnique({
                        where: { adminId: campusData.campusHeadId }
                    })

                    if (campusHead && campusHead.email) {
                        EmailService.sendLeadAssignedEmail(campusHead.email, studentName, campus)
                            .catch(e => logger.error('Failed to send lead email:', e))
                    }
                }
            }
        } catch (emailError) {
            console.error('Lead notification error:', emailError)
        }

        revalidatePath('/dashboard')
        revalidatePath('/referrals')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Failed to submit referral' }
    }
}

export async function createReferralLead(data: {
    parentName: string
    parentMobile: string
    campus: string
    gradeInterested?: string
    studentName?: string
}) {
    // Wrapper for backward compatibility if needed, or simply use submitReferral
    return submitReferral(data)
}

export async function getMyReferrals() {
    const user = await getCurrentUser()
    if (!user) return []

    return await prisma.referralLead.findMany({
        where: { userId: user.userId },
        include: {
            student: {
                include: {
                    campus: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function getMyComparisonStats() {
    const user = await getCurrentUser()
    if (!user) return null

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [currentLeads, prevLeads, currentConfirmed, prevConfirmed] = await Promise.all([
        prisma.referralLead.count({
            where: { userId: user.userId, createdAt: { gte: currentMonthStart } }
        }),
        prisma.referralLead.count({
            where: { userId: user.userId, createdAt: { gte: lastMonthStart, lt: currentMonthStart } }
        }),
        prisma.referralLead.count({
            where: { userId: user.userId, leadStatus: LeadStatus.Confirmed, confirmedDate: { gte: currentMonthStart } }
        }),
        prisma.referralLead.count({
            where: { userId: user.userId, leadStatus: LeadStatus.Confirmed, confirmedDate: { gte: lastMonthStart, lt: currentMonthStart } }
        })
    ])

    return {
        currentLeads,
        prevLeads,
        currentConfirmed,
        prevConfirmed
    }
}

/**
 * Gets the ambassador's full name from their referral code.
 * Used for public referral forms to show "You are being referred by..."
 */
export async function getAmbassadorName(referralCode: string) {
    if (!referralCode) return null
    try {
        const user = await prisma.user.findUnique({
            where: { referralCode },
            select: { fullName: true }
        })
        return user?.fullName || null
    } catch (error) {
        return null
    }
}

/**
 * Gets the dynamic fee for the user to be used in Rules Page calculations.
 * For Parents: Uses their child's Campus + Grade specific fee.
 * For Others: Uses the default or manually set studentFee.
 */
export async function getDynamicFeeForUser() {
    const user = await getCurrentUser()
    if (!user) return 60000 // Default fallback

    try {
        // 1. If Parent, try to find their student's Fee Structure
        if (user.role === 'Parent') {
            const student = await prisma.student.findFirst({
                where: { parentId: user.userId },
                select: { campusId: true, grade: true }
            })

            if (student) {
                // Find the fee for this specific campus and grade
                const feeStructure = await prisma.gradeFee.findFirst({
                    where: {
                        campusId: student.campusId,
                        grade: student.grade
                        // Optional: Filter by academicYear if needed, but usually latest 
                    },
                    orderBy: { id: 'desc' } // Get latest if multiple
                })

                if (feeStructure) {
                    return feeStructure.annualFee_otp || 0
                }
            }
        }

        // 2. If Staff/Other or no matching GradeFee found, default to user's stored fee or system default
        return (user as any).studentFee || 60000

    } catch (error) {
        console.error("Error fetching dynamic fee:", error)
        return (user as any).studentFee || 60000
    }
}
