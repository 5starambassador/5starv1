import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
import { whatsappService } from '@/lib/whatsapp-service'
import { logAction } from '@/lib/audit-logger'
import { generateReferralStudentDetailsCSV } from '@/lib/report-utils'
import { getAccruedPayoutLiabilitiesInternal } from '@/app/finance-actions'

/**
 * Campus Referral Report Cron Job
 * Runs every Day at 7:00 PM IST (via vercel.json schedule)
 * 100% SAFETY: Always sends Daily Report to Campus + CC Director
 * Every Friday: Also sends Weekly Summary to Campus + CC Director
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const now = new Date()
        const isFriday = now.getDay() === 5
        
        // Date Ranges
        const dailyStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        console.log(`🚀 Starting Referral Report Automation (Day: ${now.toLocaleDateString()})`)
        console.log(`Mode: Daily Report${isFriday ? ' + Weekly Summary' : ''}`)
        
        const campuses = await prisma.campus.findMany({
            where: { isActive: true }
        })

        const masterDailyReferrals: any[] = []
        const DIRECTOR_EMAIL = 'director.la@achariya.org'

        for (const campus of campuses) {
            const campusName = campus.campusName
            const rawEmails = campus.contactEmail || ''
            const campusEmails = rawEmails.split(',').map(e => e.trim()).filter(Boolean)

            if (campusEmails.length === 0) {
                console.log(`[${campusName}] Skipping - No contact email configured.`)
                continue
            }

            // 1. Fetch Confirmed Referrals (Financials)
            const financeRes = await getAccruedPayoutLiabilitiesInternal(
                null, // System Action
                'All', // Academic Year
                undefined, // Search
                campus.id,
                1,
                10000 // Get all referrals for this campus
            )

            if (!financeRes.success || !financeRes.data) {
                console.error(`[${campusName}] Failed to fetch enriched financials:`, financeRes.error)
                continue
            }

            const allCampusReferrals = financeRes.data.flatMap((amb: any) => amb.referrals)

            // 2. Fetch NEW Leads today (to make report meaningful)
            const newLeadsCount = await prisma.referralLead.count({
                where: {
                    campusId: campus.id,
                    createdAt: { gte: dailyStart, lte: now }
                }
            })

            // 3. Filter for DAILY activity (Confirmed or Admitted today)
            const dailyReferrals = allCampusReferrals.filter((ref: any) => {
                const date = ref.confirmedDate ? new Date(ref.confirmedDate) : new Date(ref.createdAt)
                const isRecent = date >= dailyStart && date <= now
                const isSuccessStatus = ref.leadStatus === 'Confirmed' || ref.leadStatus === 'Admitted'
                return isRecent && isSuccessStatus
            })

            masterDailyReferrals.push(...dailyReferrals)

            // 4. DISPATCH DAILY REPORT
            const dailyCSV = generateReferralStudentDetailsCSV(dailyReferrals)
            const dailyFilename = `Daily_Report_${campusName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.csv`
            
            for (const email of campusEmails) {
                const res = await EmailService.sendEmailWithAttachment(
                    email,
                    `Daily Referral Report - ${campusName} (${now.toLocaleDateString()})`,
                    `<p>Dear Campus Head,</p>
                     <p>Please find attached the daily report of students <strong>Confirmed/Admitted</strong> through the Ambassador Program today.</p>
                     <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>New Leads Received Today:</strong> ${newLeadsCount}</p>
                        <p style="margin: 5px 0;"><strong>Success Today (Confirmed/Admitted):</strong> ${dailyReferrals.length}</p>
                     </div>
                     <p>Best regards,<br/>Achariya Partners</p>`,
                    { filename: dailyFilename, content: dailyCSV },
                    [DIRECTOR_EMAIL]
                )
                
                if (!res.success) {
                    console.error(`[${campusName}] Failed to send daily email to ${email}:`, res.error)
                    await logAction('EMAIL_FAILURE', 'SYSTEM', `Failed to send Daily Report to ${campusName} (${email})`, campus.id.toString())
                }
            }

            await logAction('AUTOMATED_REPORT', 'SYSTEM', `Daily Report processed for ${campusName} (Confirmed: ${dailyReferrals.length}, New: ${newLeadsCount})`, campus.id.toString())

            if (dailyReferrals.length > 0 && campus.contactPhone) {
                await whatsappService.sendFreeTextMessage(
                    campus.contactPhone,
                    `📢 Daily Report Alert: ${dailyReferrals.length} new confirmed referrals for ${campusName} today. Detailed CSV sent to email.`,
                    'SYSTEM'
                )
            }

            // 5. DISPATCH WEEKLY REPORT (Only on Fridays)
            if (isFriday) {
                const weeklyReferrals = allCampusReferrals.filter((ref: any) => {
                    const date = ref.confirmedDate ? new Date(ref.confirmedDate) : new Date(ref.createdAt)
                    const isRecent = date >= weeklyStart && date <= now
                    const isSuccessStatus = ref.leadStatus === 'Confirmed' || ref.leadStatus === 'Admitted'
                    return isRecent && isSuccessStatus
                })

                const weeklyCSV = generateReferralStudentDetailsCSV(weeklyReferrals)
                const weeklyFilename = `Weekly_Summary_${campusName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.csv`

                for (const email of campusEmails) {
                    const res = await EmailService.sendEmailWithAttachment(
                        email,
                        `WEEKLY Performance Summary - ${campusName}`,
                        `<p>Dear Campus Head,</p>
                         <p>Attached is the <strong>Weekly Summary</strong> of all referrals <strong>Confirmed or Admitted</strong> for your campus over the last 7 days.</p>
                         <p><strong>Total Success (Confirmed/Admitted):</strong> ${weeklyReferrals.length}</p>
                         <p>Best regards,<br/>Achariya Partners</p>`,
                        { filename: weeklyFilename, content: weeklyCSV },
                        [DIRECTOR_EMAIL]
                    )
                    
                    if (!res.success) {
                        console.error(`[${campusName}] Failed to send weekly email to ${email}:`, res.error)
                        await logAction('EMAIL_FAILURE', 'SYSTEM', `Failed to send Weekly Report to ${campusName} (${email})`, campus.id.toString())
                    }
                }
                
                await logAction('AUTOMATED_REPORT', 'SYSTEM', `Weekly Report processed for ${campusName} (Count: ${weeklyReferrals.length})`, campus.id.toString())
            }
        }

        // 6. DAILY Master Report (To Director)
        if (masterDailyReferrals.length > 0) {
            const masterCSV = generateReferralStudentDetailsCSV(masterDailyReferrals)
            const masterFilename = `DAILY_Master_Report_${now.toISOString().split('T')[0]}.csv`
            const res = await EmailService.sendEmailWithAttachment(
                DIRECTOR_EMAIL,
                `DAILY Master Referral Report - All Campuses (${now.toLocaleDateString()})`,
                `<p>Dear Director,</p>
                 <p>Attached is the <strong>Daily Master Report</strong> covering all referrals across all campuses for today.</p>
                 <p><strong>Total Confirmed Today:</strong> ${masterDailyReferrals.length}</p>
                 <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                { filename: masterFilename, content: masterCSV }
            )
            
            if (!res.success) {
                console.error(`[SYSTEM] Failed to send Master Report to Director:`, res.error)
                await logAction('EMAIL_FAILURE', 'SYSTEM', `Failed to send Master Report to Director`, 'MASTER')
            }
        }

        return NextResponse.json({ success: true, message: 'Daily/Weekly reports processed.' })
    } catch (error: any) {
        console.error('Report Automation Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
