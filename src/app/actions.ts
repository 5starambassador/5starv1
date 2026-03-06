'use server'


import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { generateSmartReferralCode } from '@/lib/referral-service'
import { syncUserStats } from './sync-actions'
import { encrypt, decrypt } from '@/lib/encryption'
import { createSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

import { smsService } from '@/lib/sms-service'
import { whatsappService } from '@/lib/whatsapp-service'
import { getCurrentUser } from '@/lib/auth-service'
import { UserRole, AccountStatus, LeadStatus } from '@prisma/client'
import { mapUserRole, mapAdminRole, mapAccountStatus } from '@/lib/enum-utils'
import { logAction } from '@/lib/audit-logger'
import { transactionIdSchema } from '@/lib/validators'
import { normalizeScientificNotation } from '@/lib/utils'

export async function checkSession() {
    const user = await getCurrentUser()
    if (user) {
        const redirectPath = await getLoginRedirect(user.mobileNumber)
        return { authenticated: true, redirect: redirectPath, user }
    }
    return { authenticated: false }
}

import { OTPFlow } from '@/lib/sms-service'

// Helper for consistent sanitization
function sanitizeMobile(input: string): string {
    let mobile = input.replace(/\D/g, '')
    if (mobile.length > 10 && mobile.startsWith('91')) {
        mobile = mobile.slice(2)
    }
    return mobile
}

export async function sendOtp(mobileInput: string, forceOtp: boolean = false, flow: OTPFlow = 'registration') {
    const mobile = sanitizeMobile(mobileInput)
    console.log('[DEBUG] sendOtp input:', mobileInput, 'Sanitized:', mobile)

    try {
        // Check User & Admin existence with resilience
        const [user, admin] = await Promise.all([
            prisma.user.findUnique({ where: { mobileNumber: mobile } }).catch(() => null),
            prisma.admin.findUnique({ where: { adminMobile: mobile } }).catch(() => null)
        ])

        // Check Rate Limit (1 OTP every 30 seconds)
        const rateLimitKey = `otp:${mobile}`
        const now = new Date()
        const rateLimit = await prisma.rateLimit.findUnique({ where: { key: rateLimitKey } })

        if (rateLimit && rateLimit.resetAt > now) {
            const timeLeft = Math.ceil((rateLimit.resetAt.getTime() - now.getTime()) / 1000)
            return { success: false, exists: false, error: `Please wait ${timeLeft}s before requesting new OTP` }
        }

        // Set Rate Limit
        const resetAt = new Date(now.getTime() + 30 * 1000)
        await prisma.rateLimit.upsert({
            where: { key: rateLimitKey },
            update: { resetAt, count: { increment: 1 } },
            create: { key: rateLimitKey, resetAt, count: 1 }
        })

        const exists = !!user || !!admin
        const hasPassword = (!!user?.password) || (!!admin?.password)

        if (!exists) {
            const settings = await prisma.systemSettings.findFirst()
            if (!settings?.allowNewRegistrations) {
                return { success: false, exists: false, error: 'New registrations are currently disabled.' }
            }
        }

        if (exists && hasPassword && !forceOtp) {
            return { success: true, exists: true, hasPassword: true }
        }

        // IDEMPOTENT OTP GENERATION
        let finalOtp: string

        // 1. Try to find existing valid OTP first (READ optimized)
        const existingRecord = await prisma.otpVerification.findUnique({ where: { mobile } })

        // Smart Sticky: Reuse if valid for at least 60 more seconds
        if (existingRecord && existingRecord.expiresAt > new Date(Date.now() + 60000)) {
            console.log('[DEBUG] Smart Sticky: Reusing existing OTP', existingRecord.otp)
            finalOtp = existingRecord.otp
        } else {
            // 2. Generate New
            finalOtp = Math.floor(1000 + Math.random() * 9000).toString()
            const expiresAt = new Date(Date.now() + 3 * 60 * 1000) // 3 Minutes

            // 3. Upsert (Atomic Update) - This handles the "Delete then Create" raciness implicitly
            await prisma.otpVerification.upsert({
                where: { mobile },
                update: { otp: finalOtp, expiresAt },
                create: { mobile, otp: finalOtp, expiresAt }
            })
            console.log('[DEBUG] Generated New OTP:', finalOtp)
        }

        // Send SMS
        const smsResult = await smsService.sendOTP(mobile, finalOtp, flow)

        // Parallel/Alternative: WhatsApp (If enabled)
        try {
            const settings = await prisma.notificationSettings.findFirst()
            if (settings?.whatsappNotifications) {
                // We use a generic OTP template name. User will need to ensure this exists in MSG91.
                // Template: "Your Achariya OTP is {{1}}. Valid for 3 minutes."
                // await whatsappService.sendTemplateMessage(mobile, "otp_verification", [finalOtp])
                console.log('💬 [Action] WhatsApp OTP triggered for:', mobile, '(ON HOLD)')
            }
        } catch (waError) {
            console.error('⚠️ [Action] WhatsApp OTP failed (silent):', waError)
        }

        if (!smsResult.success) {
            console.error('[Action] SMS Failed:', smsResult.error)
            // CRITICAL FIX: DO NOT DELETE RECORD ON FAILURE!
            // This prevents "Phantom OTPs" where the user got the SMS but we deleted the record.
            // If they click "Resend", we will just pick up the Sticky OTP above and try sending again.
            return { success: false, error: 'SMS delivery failed. Please click Resend.' }
        }

        return {
            success: true,
            exists,
            hasPassword,
            otp: process.env.NODE_ENV === 'development' || !process.env.SMS_PROVIDER ? finalOtp : undefined
        }

    } catch (error: any) {
        console.error('sendOtp error:', error)
        return { success: false, exists: false, error: `System error: ${error.message}` }
    }
}

export async function verifyOtpAndResetPassword(mobileInput: string, otp: string, newPassword: string) {
    if (!mobileInput || !otp || !newPassword) return { success: false, error: 'Missing information' }

    let mobile = mobileInput.replace(/\D/g, '')
    if (mobile.length > 10 && mobile.startsWith('91')) {
        mobile = mobile.slice(2)
    }

    // 1. Verify OTP
    const record = await prisma.otpVerification.findUnique({
        where: { mobile }
    })

    if (!record) return { success: false, error: 'Request expired. Please try again.' }

    if (record.otp !== otp || new Date() > record.expiresAt) {
        return { success: false, error: 'Invalid or expired OTP' }
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 3. Update User or Admin
    const user = await prisma.user.findUnique({ where: { mobileNumber: mobile } })
    if (user) {
        await prisma.user.update({
            where: { userId: user.userId },
            data: { password: hashedPassword }
        })
        await prisma.otpVerification.delete({ where: { mobile } })
        return { success: true }
    }

    const admin = await prisma.admin.findUnique({ where: { adminMobile: mobile } })
    if (admin) {
        await prisma.admin.update({
            where: { adminId: admin.adminId },
            data: { password: hashedPassword }
        })
        await prisma.otpVerification.delete({ where: { mobile } })
        return { success: true }
    }

    return { success: false, error: 'User record not found' }
}

export async function verifyOtpOnly(otp: string, mobileInput?: string) {
    if (!mobileInput) return { success: false, error: 'Mobile number required' }

    // Standardized Sanitization
    let mobile = mobileInput.replace(/\D/g, '')
    if (mobile.length > 10 && mobile.startsWith('91')) {
        mobile = mobile.slice(2)
    }

    console.log('[DEBUG] verifyOtpOnly called:', { otp, mobileInput, sanitized: mobile })

    const verifyLimitKey = `verify:otp:${mobile}`
    const verifyLimit = await prisma.rateLimit.findUnique({ where: { key: verifyLimitKey } })
    const now = new Date()

    if (verifyLimit && verifyLimit.resetAt > now && verifyLimit.count >= 5) {
        const timeLeft = Math.ceil((verifyLimit.resetAt.getTime() - now.getTime()) / 60000)
        return { success: false, error: `Too many failed attempts. Please try again in ${timeLeft} minutes.` }
    }

    const record = await prisma.otpVerification.findUnique({
        where: { mobile }
    })

    if (!record) {
        console.log('[DEBUG] No OTP record found for mobile:', mobile)
        return { success: false, error: 'OTP request expired or invalid. Try again.' }
    }

    const isExpired = now > record.expiresAt
    const isMatch = record.otp === otp

    console.log('[DEBUG] OTP Verification:', {
        serverTime: now,
        expiresAt: record.expiresAt,
        isExpired,
        isMatch,
        recordOtp: record.otp,
        receivedOtp: otp
    })

    if (isExpired) {
        return { success: false, error: 'OTP has expired. Please request a new one.' }
    }

    if (!isMatch) {
        // Increment failed attempt counter
        await prisma.rateLimit.upsert({
            where: { key: verifyLimitKey },
            update: { count: { increment: 1 } },
            create: { key: verifyLimitKey, count: 1, resetAt: new Date(now.getTime() + 15 * 60 * 1000) }
        })

        await logAction('OTP_VERIFY_FAILURE', 'auth', `Incorrect OTP attempt for ${mobile}`, mobile)
        return { success: false, error: 'Incorrect OTP. Please check and try again.' }
    }

    // Success: Clear throttling counter
    await prisma.rateLimit.delete({ where: { key: verifyLimitKey } }).catch(() => null)
    await logAction('OTP_VERIFY_SUCCESS', 'auth', `OTP verified successfully for ${mobile}`, mobile)

    return { success: true }

    // Backdoor: Only allow in development OR if explicitly using mock provider
    // const isMockMode = process.env.NODE_ENV === 'development' && process.env.SMS_PROVIDER !== 'msg91'
    // if (otp === '1234' && isMockMode) return { success: true }

}

export async function loginWithPassword(mobileInput: string, password: string) {
    const mobile = sanitizeMobile(mobileInput)

    // Check User
    const user = await prisma.user.findUnique({
        where: { mobileNumber: mobile }
    })

    if (user) {
        if (user.status === 'Deleted') {
            await logAction('LOGIN_DELETED_ACCOUNT', 'auth', `Login attempt for deleted account: ${mobile}`, user.userId.toString(), user.userId, { isUser: true })
            return { success: false, error: 'This account has been deleted.' }
        }
        if (user.password) {
            const isValid = await bcrypt.compare(password, user.password)
            if (isValid) {
                const securitySettings = await prisma.securitySettings.findFirst() as any
                const isSuperAdmin = mapUserRole(user.role) === 'Super Admin'
                const is2faRequired = isSuperAdmin && securitySettings?.twoFactorAuthEnabled

                await createSession(user.userId, 'user', mapUserRole(user.role), !is2faRequired, user.status)
                await logAction('LOGIN', 'auth', `User logged in: ${mobile}`, user.userId.toString(), user.userId, { isUser: true })
                return { success: true }
            }
        }
        // Failed user login attempt — audit trail for security monitoring
        await logAction('FAILED_LOGIN', 'auth', `Failed login attempt for user: ${mobile}`, user.userId.toString(), user.userId, { isUser: true })
        return { success: false, error: 'Incorrect password' }
    }

    // Check Admin
    const admin = await prisma.admin.findUnique({
        where: { adminMobile: mobile }
    })

    if (admin) {
        if (admin.password) {
            const isValid = await bcrypt.compare(password, admin.password)
            if (isValid) {
                const securitySettings = await prisma.securitySettings.findFirst() as any
                const isAdminRole = mapAdminRole(admin.role) === 'Super Admin'
                const is2faRequired = isAdminRole && securitySettings?.twoFactorAuthEnabled

                await createSession(admin.adminId, 'admin', mapAdminRole(admin.role), !is2faRequired, admin.status)
                await logAction('LOGIN', 'auth', `Admin logged in: ${mobile}`, admin.adminId.toString(), admin.adminId, { isAdmin: true })
                return { success: true }
            }
        }
        // Failed admin login attempt
        await logAction('FAILED_LOGIN', 'auth', `Failed Admin login attempt for: ${mobile}`, admin.adminId.toString(), admin.adminId, { isAdmin: true })
        return { success: false, error: 'Incorrect password' }
    }

    // NEW: Log attempt for non-existent user/admin
    await logAction('LOGIN_USER_NOT_FOUND', 'auth', `Login attempt for non-existent mobile: ${mobile}`, mobile)
    return { success: false, error: 'User not found' }
}

export async function loginUser(mobile: string) {
    // Only used for OTP flow fallback
    return await loginWithPassword(mobile, '1234') // Fallback logic if needed, or deprecate
}

export async function getLoginRedirect(mobile: string) {
    // Check if admin
    const admin = await prisma.admin.findUnique({
        where: { adminMobile: mobile }
    })

    if (admin) {
        const adminRole = mapAdminRole(admin.role)
        // IMPORTANT: Check Super Admin FIRST (before generic Admin check)
        if (adminRole === 'Super Admin') {
            return '/superadmin'
        }
        // Finance Admin
        else if (adminRole === 'Finance Admin') {
            return '/finance'
        }
        // Then check Campus Head & Campus Admin
        else if (adminRole === 'Campus Head' || adminRole === 'Campus Admin') {
            return '/campus'
        }
        // Finally, regular admins (like "Admission Admin")
        else if (adminRole.includes('Admin')) {
            return '/admin'
        }
    }

    // Check for Regular User
    const user = await prisma.user.findUnique({
        where: { mobileNumber: mobile }
    })

    if (user && user.status === 'Pending') {
        return '/?step=payment'
    }

    // Default to dashboard for regular users
    return '/dashboard'
}

export async function getRegistrationCampuses() {
    try {
        const campuses = await prisma.campus.findMany({
            where: { isActive: true },
            select: { id: true, campusName: true, grades: true },
            orderBy: { campusName: 'asc' }
        })
        return { success: true, campuses }
    } catch (error) {
        console.error('Error fetching campuses for registration:', error)
        return { success: false, error: 'Failed to load campuses' }
    }
}

export async function registerUser(formData: any) {
    const { fullName, mobileNumber, password, role, childInAchariya, childName, bankAccountDetails, campusId, grade, childEprNo, empId, aadharNo, email, childCampusId } = formData
    const transactionId = normalizeScientificNotation(formData.transactionId)

    // Secure Password Policy Check
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
        return { success: false, error: 'Password must be at least 8 chars with 1 uppercase, 1 special char, and 1 number.' }
    }

    if (transactionId) {
        const validation = transactionIdSchema.safeParse(transactionId)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }
    } else {
        return { success: false, error: 'Transaction ID is required' }
    }

    // Fetch current academic year
    const currentYearRecord = await prisma.academicYear.findFirst({
        where: { isCurrent: true }
    })
    const currentYear = currentYearRecord?.year || "2025-2026"

    // Safety check: Is registration still open?
    const settings = await prisma.systemSettings.findFirst()
    if (!settings?.allowNewRegistrations) {
        return { success: false, error: 'Registration is currently closed.' }
    }

    // Mandatory campus validation for specific roles
    // Others role is allowed to register without campus
    if ((role === 'Parent' || role === 'Staff' || role === 'Alumni') && !campusId) {
        return {
            success: false,
            error: `Campus selection is mandatory for ${role} role. Please select a campus to continue.`
        }
    }

    // Fetch fee based on campus and grade
    let studentFee = 60000
    let assignedCampusName = null

    if (campusId) {
        const campus = await prisma.campus.findUnique({
            where: { id: parseInt(campusId) }
        })
        if (campus) {
            assignedCampusName = campus.campusName

            // Calculate Fee if Child in Achariya
            if (childInAchariya === 'Yes' && grade) {
                const gradeFee = await prisma.gradeFee.findFirst({
                    where: {
                        campusId: parseInt(campusId),
                        grade: grade,
                        academicYear: currentYear
                    }
                })
                if (gradeFee) {
                    studentFee = gradeFee.annualFee_otp || 0
                }
            }
        }
    }

    // RETRY LOOP for Collision Handling
    let attempts = 0
    const MAX_RETRIES = 3

    while (attempts < MAX_RETRIES) {
        try {
            // Generate Smart Referral Code based on Role (with offset for retries)
            // Attempt 0: offset 0 (Count + 1)
            // Attempt 1: offset 1 (Count + 2) etc.
            const referralCode = await generateSmartReferralCode(role, undefined, attempts)

            const userRole = (role === 'Parent' ? UserRole.Parent :
                role === 'Staff' ? UserRole.Staff :
                    role === 'Alumni' ? UserRole.Alumni : UserRole.Others)

            const user = await prisma.user.create({
                data: {
                    fullName,
                    mobileNumber,
                    password: await bcrypt.hash(password || '123456', 10), // Hash password
                    role: userRole,
                    childInAchariya: childInAchariya === 'Yes',
                    childName: childName || null,
                    grade: grade || null,
                    campusId: campusId ? parseInt(campusId) : null,
                    assignedCampus: assignedCampusName, // Save the resolved name
                    bankAccountDetails: encrypt(bankAccountDetails) || null,
                    referralCode,
                    benefitStatus: childInAchariya === 'Yes' ? ('PendingVerification' as any as AccountStatus) : AccountStatus.Inactive,
                    studentFee,
                    academicYear: currentYearRecord?.year || '2025-2026',
                    // New Role Fields
                    email: email || null,
                    childEprNo: childEprNo || null,
                    empId: empId || null,
                    aadharNo: encrypt(aadharNo) || null,
                    // Payment Info
                    status: AccountStatus.Pending, // Gatekeeper: All registrations start Pending
                    paymentStatus: transactionId ? 'Success' : 'Pending',
                    transactionId: transactionId || null,
                    paymentAmount: transactionId ? 25 : 0
                }
            })

            // If immediately active (paid during registration), sync benefits and create student record
            if (transactionId) {
                await syncUserStats(user.userId)
            }

            const securitySettings = await prisma.securitySettings.findFirst() as any
            const isSuperAdmin = role === 'Super Admin'
            const is2faRequired = isSuperAdmin && securitySettings?.twoFactorAuthEnabled

            await createSession(user.userId, 'user', mapUserRole(user.role), !is2faRequired)

            // Sync: Notify Admin Verification Queue
            if (childInAchariya === 'Yes') {
                revalidatePath('/superadmin/verification')
            }
            revalidatePath('/superadmin/users')
            revalidatePath('/superadmin')
            revalidatePath('/finance')
            revalidatePath('/campus')
            revalidatePath('/admin')
            revalidatePath('/dashboard') // Ensure their own dashboard is fresh

            // In-App Welcome Notification
            import('@/lib/notification-helper').then(({ notifyWelcome }) => {
                notifyWelcome(user.userId, fullName)
            })

            // WhatsApp Welcome Message (Day 0)
            if (mobileNumber) {
                // Using dynamic import to avoid circular dep issues in server actions
                import('@/lib/whatsapp-service').then(({ whatsappService }) => {
                    // Template: welcome_message (ReferralCode) -> Event: WELCOME_MESSAGE
                    whatsappService.sendByEvent(mobileNumber, 'WELCOME_MESSAGE', [referralCode || 'PENDING'], 'ALERT')
                        .catch(err => console.error('Failed to send welcome whatsapp:', err))
                })
            }

            return { success: true }

        } catch (e: any) {
            console.error(`Registration attempt ${attempts + 1} failed:`, e.message)

            // Handle Prisma Unique Constraint Violation
            if (e.code === 'P2002') {
                // If it's a Referral Code collision, we retry
                if (e.meta?.target?.includes('referralCode')) {
                    console.warn(`Referral Code Collision (Attempt ${attempts + 1}). Retrying...`)
                    attempts++
                    continue // Try loop again with higher offset
                }

                // If it's Mobile Number, fail immediately (no retry)
                if (e.meta?.target?.includes('mobileNumber')) {
                    // CHECK FOR UPGRADE: If user exists but has NO referral code (Student Parent), upgrade them to Ambassador
                    // Use a transaction to ensure atomicity
                    const result = await prisma.$transaction(async (tx) => {
                        const existingUser = await tx.user.findUnique({ where: { mobileNumber } })
                        if (existingUser && !existingUser.referralCode) {
                            const upgradeCode = await generateSmartReferralCode(role)
                            const updatedUser = await tx.user.update({
                                where: { userId: existingUser.userId },
                                data: {
                                    referralCode: upgradeCode,
                                    password: await bcrypt.hash(password, 10),
                                    bankAccountDetails: bankAccountDetails ? encrypt(bankAccountDetails) : existingUser.bankAccountDetails,
                                    benefitStatus: 'Active' as any // Use string for safety if enum desyncs
                                }
                            })

                            // Audit Upgrade
                            await logAction(
                                'USER_UPGRADE',
                                'auth',
                                `User ${mobileNumber} upgraded to Ambassador with code ${upgradeCode}`,
                                updatedUser.userId.toString(),
                                updatedUser.userId,
                                { oldRole: existingUser.role, newRole: updatedUser.role, upgradeCode }
                            )

                            return { success: true, userId: updatedUser.userId, role: updatedUser.role }
                        }
                        return null
                    })

                    if (result?.success) {
                        // Create session and log them in (outside transaction for side-effect safety)
                        await createSession(result.userId, 'user', mapUserRole(result.role as any), false)
                        return { success: true }
                    }
                    return { success: false, error: 'This mobile number is already registered. Please login.' }
                }
            }
            // Other errors -> Fail immediately
            return { success: false, error: e.message || 'Registration failed due to a system error.' }
        }
    }

    return { success: false, error: 'System busy (Ref Code collision). Please try again.' }
}

export async function createPendingUser(formData: any) {
    const { fullName, mobileNumber, password, role, childInAchariya, childName, bankAccountDetails, campusId, grade, childEprNo, empId, aadharNo, email } = formData

    // Secure Password Policy Check
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
        return { success: false, error: 'Password must be at least 8 chars with 1 uppercase, 1 special char, and 1 number.' }
    }

    // Fetch current academic year
    const currentYearRecord = await prisma.academicYear.findFirst({
        where: { isCurrent: true }
    })
    const currentYear = currentYearRecord?.year || "2025-2026"

    // Safety check: Is registration still open?
    const settings = await prisma.systemSettings.findFirst()
    if (!settings?.allowNewRegistrations) {
        return { success: false, error: 'Registration is currently closed.' }
    }

    let studentFee = 60000
    let assignedCampusName = null

    if (campusId) {
        const campus = await prisma.campus.findUnique({
            where: { id: parseInt(campusId) }
        })
        if (campus) {
            assignedCampusName = campus.campusName
            if (childInAchariya === 'Yes' && grade) {
                const gradeFee = await prisma.gradeFee.findFirst({
                    where: {
                        campusId: parseInt(campusId),
                        grade: grade,
                        academicYear: currentYear
                    }
                })
                if (gradeFee) {
                    studentFee = gradeFee.annualFee_otp || 0
                }
            }
        }
    }

    let attempts = 0
    const MAX_RETRIES = 3

    while (attempts < MAX_RETRIES) {
        try {
            const referralCode = await generateSmartReferralCode(role, undefined, attempts)
            const userRole = (role === 'Parent' ? UserRole.Parent :
                role === 'Staff' ? UserRole.Staff :
                    role === 'Alumni' ? UserRole.Alumni : UserRole.Others)

            const user = await prisma.user.create({
                data: {
                    fullName,
                    mobileNumber,
                    password: await bcrypt.hash(password || '123456', 10),
                    role: userRole,
                    childInAchariya: childInAchariya === 'Yes',
                    childName: childName || null,
                    grade: grade || null,
                    campusId: campusId ? parseInt(campusId) : null,
                    assignedCampus: assignedCampusName,
                    bankAccountDetails: bankAccountDetails ? encrypt(bankAccountDetails) : null,
                    referralCode,
                    status: AccountStatus.Pending, // Brand new user, needs payment
                    benefitStatus: AccountStatus.Pending,
                    studentFee,
                    academicYear: currentYear,
                    email: email || null,
                    childEprNo: childEprNo || null,
                    empId: empId || null,
                    aadharNo: aadharNo ? encrypt(aadharNo) : null,
                    paymentStatus: 'Pending',
                    paymentAmount: 0 // Will be updated after payment
                }
            })

            const securitySettings = await prisma.securitySettings.findFirst() as any
            const isSuperAdmin = role === 'Super Admin'
            const is2faRequired = isSuperAdmin && securitySettings?.twoFactorAuthEnabled

            await createSession(user.userId, 'user', mapUserRole(user.role), !is2faRequired, user.status)

            return { success: true, userId: user.userId }

        } catch (e: any) {
            if (e.code === 'P2002') {
                if (e.meta?.target?.includes('referralCode')) {
                    attempts++
                    continue
                }
                if (e.meta?.target?.includes('mobileNumber')) {
                    // Upgrade logic could go here, but for simplicity returning error
                    return { success: false, error: 'Mobile number already registered.' }
                }
            }
            return { success: false, error: e.message || 'Registration failed.' }
        }
    }
    return { success: false, error: 'System busy. Please try again.' }
}

// --- DEV ONLY: Simulate Payment ---
export async function simulatePayment(userId: number) {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error("Simulation only available in development mode");
    }

    try {
        await prisma.user.update({
            where: { userId: userId },
            data: {
                paymentStatus: 'Success',
                status: 'Active' // Activate the user too
            }
        });

        await syncUserStats(userId)

        // Also create a fake payment record for consistency
        // @ts-ignore: Payment property exists but IDE cache is stale
        await prisma.payment.create({
            data: {
                orderId: `SIM_${Date.now()}`,
                paymentSessionId: `SIM_SESSION_${Date.now()}`,
                orderAmount: 25,
                userId: userId,
                orderStatus: "SUCCESS",
                paymentStatus: "SUCCESS",
                paymentMethod: "SIMULATION",
                transactionId: `SIM_TXN_${Date.now()}`,
                bankReference: `SIM_REF_${Date.now()}`,
                paidAt: new Date(),
                settlementDate: new Date() // Simulate immediate settlement
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Simulation failed:", error);
        return { success: false, error: "Simulation failed" };
    }

}

export async function submitManualPayment(formData: FormData) {
    const rawUtr = formData.get('utr') as string
    const utr = normalizeScientificNotation(rawUtr?.trim().toUpperCase())
    const amount = parseFloat(formData.get('amount') as string)
    const userId = parseInt(formData.get('userId') as string)

    if (!utr || !amount || !userId) {
        return { success: false, error: 'Missing required fields' }
    }

    // Strict 12-character alphanumeric validation
    const utrRegex = /^[A-Z0-9]{12}$/
    if (!utrRegex.test(utr)) {
        return { success: false, error: 'Invalid UTR format. Must be exactly 12 alphanumeric characters.' }
    }

    try {
        // Reuse Payment Table - No Schema Change
        // Prefixed Order ID for uniqueness
        const orderId = `MANUAL_${Date.now()}_${userId}`

        // Check for duplicate UTR (Strict Uniqueness)
        const existingPayment = await prisma.payment.findFirst({
            where: {
                transactionId: utr
            }
        });

        if (existingPayment) {
            return { success: false, error: 'This UTR / Transaction ID has already been submitted.' }
        }

        await prisma.payment.create({
            data: {
                orderId: orderId,
                paymentSessionId: `MANUAL_SESSION_${utr}`, // Placeholder
                orderAmount: amount,
                userId: userId,
                orderStatus: "PENDING_APPROVAL", // Using existing string field
                paymentStatus: "Pending Approval",
                paymentMethod: "MANUAL_QR",
                transactionId: utr,
                bankReference: utr,
                paidAt: new Date() // User claims they paid now
            }
        });

        // Update User Status
        await prisma.user.update({
            where: { userId: userId },
            data: {
                paymentStatus: 'Pending Approval',
                transactionId: utr
            }
        });

        // Log Action
        await logAction(
            'PAYMENT_SUBMITTED',
            'finance',
            `User submitted manual payment proof for ₹${amount}. UTR: ${utr}`,
            orderId,
            userId,
            { amount, utr, isUser: true }
        )

        return { success: true }
    } catch (error: any) {
        console.error("Manual Payment Error:", error)
        // Handle unique constraint if user re-submits same UTR?
        // For now, simple error
        return { success: false, error: "Failed to submit. Please try again or contact support." }
    }
}
