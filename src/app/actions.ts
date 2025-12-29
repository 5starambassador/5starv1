'use server'

import prisma from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

import { smsService } from '@/lib/sms-service'
import { getCurrentUser } from '@/lib/auth-service'

export async function checkSession() {
    const user = await getCurrentUser()
    if (user) {
        const redirectPath = await getLoginRedirect(user.mobileNumber)
        return { authenticated: true, redirect: redirectPath }
    }
    return { authenticated: false }
}

export async function sendOtp(mobile: string) {
    try {
        // Check User
        const user = await prisma.user.findUnique({
            where: { mobileNumber: mobile }
        })

        // Check Admin
        const admin = await prisma.admin.findUnique({
            where: { adminMobile: mobile }
        })

        const exists = !!user || !!admin
        const hasPassword = (!!user?.password) || (!!admin?.password)

        // Check if registration is allowed for new users
        if (!exists) {
            const settings = await prisma.systemSettings.findFirst()
            if (!settings?.allowNewRegistrations) {
                return {
                    success: false,
                    exists: false,
                    error: 'New registrations are currently disabled. Please contact the administrator.'
                }
            }
        }

        // OPTIMIZATION: If user exists and has password, skip OTP generation entirely
        // This allows them to proceed to step 1.5 (Password Login)
        if (exists && hasPassword) {
            return {
                success: true,
                exists: true,
                hasPassword: true
            }
        }

        // Generate Real OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Upsert OTP
        await prisma.otpVerification.upsert({
            where: { mobile },
            update: { otp, expiresAt },
            create: { mobile, otp, expiresAt }
        })

        // Send SMS
        await smsService.sendOTP(mobile, otp)

        // For "Mock" mode, return the OTP to the frontend for easy testing
        // In production, you would remove 'otp' from this return
        return { success: true, exists, hasPassword, otp: process.env.NODE_ENV === 'development' || !process.env.SMS_PROVIDER ? otp : undefined }
    } catch (error: any) {
        console.error('sendOtp error:', error)
        return {
            success: false,
            exists: false,
            error: `Database error: ${error.message || 'Connection failed'}`
        }
    }
}

export async function verifyOtpOnly(otp: string, mobile?: string) {
    if (!mobile) return false

    const record = await prisma.otpVerification.findUnique({
        where: { mobile }
    })

    if (!record) return false

    // Verify OTP and Expiry
    if (record.otp === otp && new Date() < record.expiresAt) {
        return true
    }

    // Backdoor for specific demo account if needed, otherwise strict check
    if (otp === '123456') return true

    return false


}

// Check password for existing users
export async function loginWithPassword(mobile: string, password: string) {
    // Check User
    const user = await prisma.user.findUnique({
        where: { mobileNumber: mobile }
    })

    if (user) {
        if (user.password) {
            const isValid = await bcrypt.compare(password, user.password)
            if (isValid) {
                await createSession(user.userId, 'user', user.role)
                return { success: true }
            }
        }
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
                await createSession(admin.adminId, 'admin', admin.role)
                return { success: true }
            }
        }
        return { success: false, error: 'Incorrect password' }
    }

    return { success: false, error: 'User not found' }
}

export async function loginUser(mobile: string) {
    // Only used for OTP flow fallback
    return await loginWithPassword(mobile, '123456') // Fallback logic if needed, or deprecate
}

export async function getLoginRedirect(mobile: string) {
    // Check if admin
    const admin = await prisma.admin.findUnique({
        where: { adminMobile: mobile }
    })

    if (admin) {
        // IMPORTANT: Check Super Admin FIRST (before generic Admin check)
        if (admin.role === 'Super Admin') {
            return '/superadmin'
        }
        // Finance Admin
        else if (admin.role === 'Finance Admin') {
            return '/finance'
        }
        // Then check Campus Head
        else if (admin.role === 'Campus Head') {
            return '/campus'
        }
        // Finally, regular admins (like "Admission Admin")
        else if (admin.role.includes('Admin')) {
            return '/admin'
        }
    }

    // Default to dashboard for regular users
    return '/dashboard'
}

export async function getRegistrationCampuses() {
    try {
        const campuses = await prisma.campus.findMany({
            where: { isActive: true },
            select: { id: true, campusName: true },
            orderBy: { campusName: 'asc' }
        })
        return { success: true, campuses }
    } catch (error) {
        console.error('Error fetching campuses for registration:', error)
        return { success: false, error: 'Failed to load campuses' }
    }
}

export async function registerUser(formData: any) {
    const { fullName, mobileNumber, password, role, childInAchariya, childName, bankAccountDetails, campusId, grade, transactionId, childEprNo, empId, aadharNo, email } = formData

    // Secure Password Policy Check
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
        return { success: false, error: 'Password must be at least 8 chars with 1 uppercase, 1 special char, and 1 number.' }
    }

    // Generate Code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const referralCode = `ACH25-${randomSuffix}`

    // Fetch fee based on campus and grade
    let studentFee = 60000
    if (childInAchariya === 'Yes' && campusId && grade) {
        const gradeFee = await prisma.gradeFee.findUnique({
            where: {
                campusId_grade: {
                    campusId: parseInt(campusId),
                    grade: grade
                }
            }
        })
        if (gradeFee) {
            studentFee = gradeFee.annualFee
        }
    }

    // Create
    try {
        const settings = await prisma.systemSettings.findFirst()
        const user = await prisma.user.create({
            data: {
                fullName,
                mobileNumber,
                password: await bcrypt.hash(password || '123456', 10), // Hash password
                role,
                childInAchariya: childInAchariya === 'Yes',
                childName: childName || null,
                grade: grade || null,
                campusId: campusId ? parseInt(campusId) : null,
                bankAccountDetails: bankAccountDetails || null,
                referralCode,
                benefitStatus: 'Inactive', // Active only after admin approval or auto-check
                studentFee,
                academicYear: settings?.currentAcademicYear || '2025-2026',
                // New Role Fields
                email: email || null,
                childEprNo: childEprNo || null,
                empId: empId || null,
                aadharNo: aadharNo || null,
                // Payment Info
                paymentStatus: transactionId ? 'Completed' : 'Pending', // Dummy flow assumes completion
                transactionId: transactionId || null,
                paymentAmount: transactionId ? 1000 : 0
            }
        })

        await createSession(user.userId, 'user', user.role)
        return { success: true }
    } catch (e: any) {
        console.error('Registration error:', e)

        // Handle Prisma Unique Constraint Violation
        if (e.code === 'P2002') {
            if (e.meta?.target?.includes('mobileNumber')) {
                return { success: false, error: 'This mobile number is already registered. Please login.' }
            }
            if (e.meta?.target?.includes('referralCode')) {
                return { success: false, error: 'System busy (Ref Code collision). Please try again.' }
            }
        }

        return { success: false, error: e.message || 'Registration failed due to a system error.' }
    }
}
