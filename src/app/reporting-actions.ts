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
        if (reportId === 'users' || reportId === 'ambassador-perf' || reportId === 'top-performers') {
            const users = await prisma.user.findMany({
                where: {
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { assignedCampus: user.assignedCampus } : {})
                },
                include: { referrals: true },
                orderBy: { confirmedReferralCount: 'desc' },
                take: 50
            })

            subject = `Ambassador Leaderboard - ${new Date().toLocaleDateString()}`
            title = 'Top Performance'

            const rows = users.map(u => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;"><strong>${u.fullName}</strong><br/><small>${u.role}</small></td>
                    <td style="padding: 12px;">${u.assignedCampus || 'N/A'}</td>
                    <td style="padding: 12px; text-align: center;">${u.referrals.length}</td>
                    <td style="padding: 12px; text-align: center;">${u.confirmedReferralCount >= 5 ? '⭐⭐⭐⭐⭐' : u.confirmedReferralCount >= 4 ? '⭐⭐⭐⭐' : u.confirmedReferralCount >= 3 ? '⭐⭐⭐' : u.confirmedReferralCount >= 2 ? '⭐⭐' : u.confirmedReferralCount >= 1 ? '⭐' : 'None'}</td>
                    <td style="padding: 12px; font-weight: bold; color: #059669;">${u.yearFeeBenefitPercent}%</td>
                </tr>
            `).join('')

            htmlContent = `
                <h3 style="color: #333;">Top 50 Ambassadors</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white;">
                    <thead>
                        <tr style="background: #f8f9fa; color: #444; text-align: left;">
                            <th style="padding: 12px;">Ambassador</th>
                            <th style="padding: 12px;">Campus</th>
                            <th style="padding: 12px; text-align: center;">Leads</th>
                            <th style="padding: 12px; text-align: center;">Rank</th>
                            <th style="padding: 12px;">Benefit</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `
        }
        else if (reportId === 'star-milestones') {
            const users = await prisma.user.findMany({
                where: {
                    confirmedReferralCount: { in: [0, 1, 2, 3, 4] },
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { assignedCampus: user.assignedCampus } : {})
                },
                take: 50,
                orderBy: { confirmedReferralCount: 'desc' }
            })

            subject = `Star Milestone Alert - ${new Date().toLocaleDateString()}`
            title = 'Milestone Proximity'

            const rows = users.map(u => {
                const current = u.confirmedReferralCount
                const next = current + 1
                return `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${u.fullName}</td>
                        <td style="padding: 12px;">${u.assignedCampus || 'N/A'}</td>
                        <td style="padding: 12px; text-align: center;"><strong>${current}</strong></td>
                        <td style="padding: 12px; color: #D97706; font-weight: bold;">1 referral away from Star ${next}</td>
                    </tr>
                `
            }).join('')

            htmlContent = `
                <p>These ambassadors are just <strong>one referral away</strong> from their next star tier.</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #FFFBEB; color: #92400E; text-align: left;">
                            <th style="padding: 12px;">Ambassador</th>
                            <th style="padding: 12px;">Campus</th>
                            <th style="padding: 12px; text-align: center;">Current Stars</th>
                            <th style="padding: 12px;">Next Step</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `
        }
        else if (reportId === 'pipeline-lifecycle' || reportId === 'full-pipeline' || reportId === 'pipeline') {
            const leads = await prisma.referralLead.findMany({
                where: {
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { campus: user.assignedCampus } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            })

            subject = `Lead Pipeline Snapshot - ${new Date().toLocaleDateString()}`
            title = 'Lead Lifecycle'

            const rows = leads.map(l => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${l.parentName}<br/><small>${l.studentName || 'N/A'}</small></td>
                    <td style="padding: 12px;">${l.campus || 'N/A'}</td>
                    <td style="padding: 12px;"><span style="background: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${l.leadStatus}</span></td>
                    <td style="padding: 12px;">${new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
            `).join('')

            htmlContent = `
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #F3E8FF; color: #6B21A8; text-align: left;">
                            <th style="padding: 12px;">Lead Name</th>
                            <th style="padding: 12px;">Campus</th>
                            <th style="padding: 12px;">Status</th>
                            <th style="padding: 12px;">Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `
        }
        else if (reportId === 'campus' || reportId === 'campus-dist') {
            const campuses = await prisma.campus.findMany({
                where: {
                    isActive: true,
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { campusName: user.assignedCampus } : {})
                }
            })

            subject = `Campus Overview - ${new Date().toLocaleDateString()}`
            title = 'Campus Management'

            const rows = campuses.map(c => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${c.campusName}</td>
                    <td style="padding: 12px;">${c.location}</td>
                    <td style="padding: 12px;">${c.currentEnrollment} / ${c.maxCapacity}</td>
                    <td style="padding: 12px; font-weight: bold; color: #B91C1C;">${c.maxCapacity - c.currentEnrollment} slots left</td>
                </tr>
            `).join('')

            htmlContent = `
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f8f9fa; color: #444; text-align: left;">
                            <th style="padding: 12px;">Campus</th>
                            <th style="padding: 12px;">Location</th>
                            <th style="padding: 12px;">Enrollment</th>
                            <th style="padding: 12px;">Availability</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `
        }
        else if (reportId === 'monthly-trends') {
            const registrations = await prisma.user.count({
                where: {
                    createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { assignedCampus: user.assignedCampus } : {})
                }
            })
            const leads = await prisma.referralLead.count({
                where: {
                    createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { campus: user.assignedCampus } : {})
                }
            })

            subject = `Monthly Growth Summary - ${new Date().toLocaleDateString()}`
            title = 'Monthly Snapshot'

            htmlContent = `
                <div style="display: flex; gap: 15px; margin-bottom: 25px;">
                    <div style="flex: 1; background: #EEF2FF; padding: 20px; border-radius: 12px; border: 1px solid #C3DAFE;">
                        <h4 style="margin: 0; color: #4338CA; font-size: 12px; text-transform: uppercase;">New Ambassadors</h4>
                        <h2 style="margin: 5px 0 0 0; color: #1E1B4B;">+${registrations}</h2>
                    </div>
                    <div style="flex: 1; background: #ECFDF5; padding: 20px; border-radius: 12px; border: 1px solid #A7F3D0;">
                        <h4 style="margin: 0; color: #065F46; font-size: 12px; text-transform: uppercase;">New Leads</h4>
                        <h2 style="margin: 5px 0 0 0; color: #064E3B;">+${leads}</h2>
                    </div>
                </div>
            `
        }
        else if (reportId === 'admins') {
            const admins = await prisma.admin.findMany({
                where: {
                    ...(user.role !== 'Super Admin' && user.assignedCampus ? { assignedCampus: user.assignedCampus } : {})
                },
                orderBy: { createdAt: 'desc' }
            })

            subject = `Admin List - ${new Date().toLocaleDateString()}`
            title = 'Administration'

            const rows = admins.map(a => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${a.adminName}</td>
                    <td style="padding: 12px;">${a.role}</td>
                    <td style="padding: 12px;">${a.assignedCampus || 'All'}</td>
                </tr>
            `).join('')

            htmlContent = `
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f8f9fa; color: #444; text-align: left;">
                            <th style="padding: 12px;">Name</th>
                            <th style="padding: 12px;">Role</th>
                            <th style="padding: 12px;">Campus</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `
        }
        else if (['churn-risk', 'benefit-tiers', 'new-registrations', 'segment-comparison'].includes(reportId)) {
            subject = `Report Ready: ${reportId} - ${new Date().toLocaleDateString()}`
            title = 'Report Alert'
            htmlContent = `<p>The <strong>${reportId.toUpperCase()}</strong> report is now available. Please download the CSV from your dashboard for the full filtered data.</p>`
        }
        else {
            return { success: false, error: 'Report type not recognized or access denied' }
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
