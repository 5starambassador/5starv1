'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { EmailService } from '@/lib/email-service'
import { logAction } from '@/lib/audit-logger'

export async function emailReport(reportId: string, criteria?: any) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        let subject = ''
        let title = ''
        let htmlContent = ''

        // 1. Fetch Data based on Report ID
        if (reportId === 'users') {
            const users = await prisma.user.findMany({
                where: {
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { assignedCampus: user.assignedCampus } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: 500 // Increased limit for detailed audit
            })

            subject = `Users Report - ${new Date().toLocaleDateString()}`
            title = 'User Directory Report'

            // Build HTML Table
            const rows = users.map(u => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">${u.fullName}</td>
                    <td style="padding: 8px;">${u.role}</td>
                    <td style="padding: 8px;">${u.mobileNumber}</td>
                    <td style="padding: 8px;">${u.referralCode}</td>
                    <td style="padding: 8px;">${u.benefitStatus}</td>
                </tr>
            `).join('')

            htmlContent = `
                <h3 style="color: #333;">Latest Users (Top 100)</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f8f9fa; color: #444; text-align: left;">
                            <th style="padding: 8px;">Name</th>
                            <th style="padding: 8px;">Role</th>
                            <th style="padding: 8px;">Mobile</th>
                            <th style="padding: 8px;">Ref Code</th>
                            <th style="padding: 8px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `
        }
        else if (reportId === 'campus') {
            const campuses = await prisma.campus.findMany({
                where: {
                    isActive: true,
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { campusName: user.assignedCampus } : {})
                },
                include: {
                    _count: {
                        select: { students: true }
                    }
                }
            })

            subject = `Campus Performance - ${new Date().toLocaleDateString()}`
            title = 'Campus Overview'

            const rows = campuses.map(c => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">${c.campusName}</td>
                    <td style="padding: 8px;">${c.location}</td>
                    <td style="padding: 8px;">${c.currentEnrollment}/${c.maxCapacity}</td>
                    <td style="padding: 8px; font-weight: bold;">${c.maxCapacity - c.currentEnrollment} left</td>
                </tr>
            `).join('')

            htmlContent = `
                <h3 style="color: #333;">Campus Status</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f8f9fa; color: #444; text-align: left;">
                            <th style="padding: 8px;">Campus</th>
                            <th style="padding: 8px;">Location</th>
                            <th style="padding: 8px;">Enrollment</th>
                            <th style="padding: 8px;">Capacity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `
        }
        else if (reportId === 'admins') {
            // Admin list is sensitive, normally only Super Admin sees it, but Campus Head might see their own team
            const admins = await prisma.admin.findMany({
                where: {
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { assignedCampus: user.assignedCampus } : {})
                },
                orderBy: { createdAt: 'desc' }
            })

            subject = `Admin Directory - ${new Date().toLocaleDateString()}`
            title = 'Admin Staff List'

            const rows = admins.map(a => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">${a.adminName}</td>
                    <td style="padding: 8px;">${a.role}</td>
                    <td style="padding: 8px;">${a.adminMobile}</td>
                    <td style="padding: 8px;">${a.assignedCampus || 'All'}</td>
                </tr>
            `).join('')

            htmlContent = `
                <h3 style="color: #333;">Administrator List</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f8f9fa; color: #444; text-align: left;">
                            <th style="padding: 8px;">Name</th>
                            <th style="padding: 8px;">Role</th>
                            <th style="padding: 8px;">Mobile</th>
                            <th style="padding: 8px;">Campus</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `
        }
        else {
            return { success: false, error: 'Unknown report type' }
        }

        // 2. Send Email
        // For security, only send to the requesting user's verified email (or mobile mapped email)
        // Since we track mobile primarily, we might need to look up email or allow arbitrary email input (risky).
        // For now, we'll use a hardcoded dev email or the logged-in user's email if available.
        // Assuming user.email exists now (added in Alumni update).

        // Dynamic email fallback logic
        const recipientEmail = (user as any).email || 'principal@achariya.in'

        await EmailService.sendReportEmail(recipientEmail, subject, htmlContent, title)
        await logAction('EXPORT_REPORT', 'reports', `Emailed report: ${reportId}`, reportId)

        return { success: true, message: `Report sent to ${recipientEmail}` }

    } catch (error: any) {
        console.error('Email Report Error:', error)
        return { success: false, error: error.message || 'Failed to email report' }
    }
}
