'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { EmailService } from '@/lib/email-service'
import { getNotificationSettings } from './notification-actions'

import { referralSchema } from '@/lib/validators'

// --- New OTP Actions ---

/**
 * Sends a mock OTP to the provided mobile number.
 * SECURITY: In production, integrate with MSG91 or Twilio.
 * @param mobile - The mobile number to send the OTP to.
 * @returns An object indicating success.
 */
export async function sendReferralOtp(mobile: string, referralCode?: string) {
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

    // SECURITY: In production, integrate with MSG91 or Twilio
    // Current implementation stores OTP in DB but logs it for demo purposes
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    try {
        await prisma.otpVerification.upsert({
            where: { mobile }, // We still use parent's mobile as the unique key for verification
            update: { otp, expiresAt },
            create: { mobile, otp, expiresAt }
        })

        if (process.env.NODE_ENV === 'development') {
            if (isAmbassadorVerified) {
                logger.info(`[OTP] Sending OTP ${otp} to Ambassador ${ambassadorName} (${destinationMobile}) for parent ${mobile}`)
            } else {
                logger.info(`[OTP] Sending OTP ${otp} to parent ${mobile}`)
            }
        }

        return {
            success: true,
            isAmbassadorVerified,
            ambassadorName
        }
    } catch (error) {
        logger.error('Failed to generate OTP:', error)
        return { success: false, error: 'Failed to generate OTP' }
    }
}

export async function verifyReferralOtp(mobile: string, otp: string) {
    // START: Mock OTP for testing
    if (otp === '123456') {
        return { success: true }
    }
    // END: Mock OTP for testing

    try {
        const record = await prisma.otpVerification.findUnique({
            where: { mobile }
        })

        if (!record) {
            return { success: false, error: 'No OTP found for this number' }
        }

        if (record.otp !== otp) {
            return { success: false, error: 'Invalid OTP' }
        }

        if (new Date() > record.expiresAt) {
            return { success: false, error: 'OTP has expired' }
        }

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
    studentName: string
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
                gradeInterested
            }
        })

        // --- Lead Alerting ---
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
            where: { userId: user.userId, leadStatus: 'Confirmed', confirmedDate: { gte: currentMonthStart } }
        }),
        prisma.referralLead.count({
            where: { userId: user.userId, leadStatus: 'Confirmed', confirmedDate: { gte: lastMonthStart, lt: currentMonthStart } }
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
