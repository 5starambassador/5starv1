import { z } from 'zod'

// Shared schemas
export const mobileSchema = z.string().length(10, 'Mobile must be exactly 10 digits').regex(/^\d+$/, 'Mobile must contain only digits')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Missing uppercase letter').regex(/[0-9]/, 'Missing number').regex(/[!@#$%^&*]/, 'Missing special character')

// Auth schemas
export const loginSchema = z.object({
    mobile: mobileSchema,
    password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
    fullName: z.string().min(2, 'Name is too short'),
    mobileNumber: mobileSchema,
    password: passwordSchema,
    email: z.string().email('Invalid email address'),
    role: z.enum(['Parent', 'Staff', 'Alumni', 'Other']),
    campusId: z.string().optional(),
    childEprNo: z.string().optional(),
    empId: z.string().optional(),
    aadharNo: z.string().optional(),
    transactionId: z.string().min(1, 'Transaction ID is required')
})

// Admin schemas
export const campusSchema = z.object({
    campusName: z.string().min(2, 'Campus name is required'),
    campusCode: z.string().min(2, 'Campus code is required'),
    location: z.string().min(2, 'Location is required'),
    grades: z.string().min(1, 'Grades are required'),
})

export const studentSchema = z.object({
    fullName: z.string().min(2, 'Name is too short'),
    parentId: z.number().int(),
    campusId: z.number().int(),
    grade: z.string().min(1, 'Grade is required'),
})

// Referral schema
export const referralSchema = z.object({
    parentName: z.string().min(2, 'Parent name is required'),
    parentMobile: mobileSchema,
    studentName: z.string().min(1, 'Student name is required'),
    campus: z.string().optional(),
    gradeInterested: z.string().optional(),
})
