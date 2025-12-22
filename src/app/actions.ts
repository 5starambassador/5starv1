'use server'

import prisma from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { redirect } from 'next/navigation'

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

        return { success: true, exists }
    } catch (error: any) {
        console.error('sendOtp error:', error)
        return {
            success: false,
            exists: false,
            error: `Database error: ${error.message || 'Connection failed'}`
        }
    }
}

export async function verifyOtpOnly(otp: string) {
    // Mock OTP
    if (otp === '123') return true
    return false
}

export async function loginUser(mobile: string) {
    // Check User
    const user = await prisma.user.findUnique({
        where: { mobileNumber: mobile }
    })

    if (user) {
        await createSession(user.userId, 'user')
        return { success: true }
    }

    // Check Admin
    const admin = await prisma.admin.findUnique({
        where: { adminMobile: mobile }
    })

    if (admin) {
        await createSession(admin.adminId, 'admin')
        return { success: true }
    }

    return { success: false, error: 'User not found' }
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
        // Then check Campus Head
        else if (admin.role === 'CampusHead') {
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
    const { fullName, mobileNumber, role, childInAchariya, childName, bankAccountDetails, campusId, grade } = formData

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
                role,
                childInAchariya: childInAchariya === 'Yes',
                childName: childName || null,
                grade: grade || null,
                campusId: campusId ? parseInt(campusId) : null,
                bankAccountDetails: bankAccountDetails || null,
                referralCode,
                benefitStatus: 'Inactive',
                studentFee,
                academicYear: settings?.currentAcademicYear || '2025-2026'
            }
        })

        await createSession(user.userId, 'user')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: 'Registration failed. Mobile might be taken.' }
    }
}
