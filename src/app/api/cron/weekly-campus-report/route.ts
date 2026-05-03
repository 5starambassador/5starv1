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

            // 1. Fetch ALL enriched referrals for this campus using the high-fidelity financial engine
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

            // 2. Filter for DAILY confirmed referrals
            const dailyReferrals = allCampusReferrals.filter((ref: any) => {
                const date = ref.confirmedDate ? new Date(ref.confirmedDate) : null
                return date && date >= dailyStart && date <= now
            })

            masterDailyReferrals.push(...dailyReferrals)

            // 2. DISPATCH DAILY REPORT (Always send, even if 0 leads)
            const dailyCSV = generateReferralStudentDetailsCSV(dailyReferrals)
            const dailyFilename = `Daily_Report_${campusName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.csv`
            
            for (const email of campusEmails) {
                await EmailService.sendEmailWithAttachment(
                    email,
                    `Daily Referral Report - ${campusName} (${now.toLocaleDateString()})`,
                    `<p>Dear Campus Head,</p>
                     <p>Please find attached the daily report of students confirmed through the Ambassador Program for today.</p>
                     <p><strong>Total Confirmed Today:</strong> ${dailyReferrals.length}</p>
                     <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                    { filename: dailyFilename, content: dailyCSV },
                    [DIRECTOR_EMAIL]
                )
            }

            await logAction('AUTOMATED_REPORT', 'SYSTEM', `Sent Daily Report to ${campusName} (Count: ${dailyReferrals.length})`, campus.id.toString())

            if (dailyReferrals.length > 0 && campus.contactPhone) {
                await whatsappService.sendFreeTextMessage(
                    campus.contactPhone,
                    `📢 Daily Report Alert: ${dailyReferrals.length} new confirmed referrals for ${campusName} today. Detailed CSV sent to email.`,
                    'SYSTEM'
                )
            }

            // 3. DISPATCH WEEKLY REPORT (Only on Fridays)
            if (isFriday) {
                // Filter for WEEKLY confirmed referrals from the already fetched enriched set
                const weeklyReferrals = allCampusReferrals.filter((ref: any) => {
                    const date = ref.confirmedDate ? new Date(ref.confirmedDate) : null
                    return date && date >= weeklyStart && date <= now
                })

                const weeklyCSV = generateReferralStudentDetailsCSV(weeklyReferrals)
                const weeklyFilename = `Weekly_Summary_${campusName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.csv`

                for (const email of campusEmails) {
                    await EmailService.sendEmailWithAttachment(
                        email,
                        `WEEKLY Performance Summary - ${campusName}`,
                        `<p>Dear Campus Head,</p>
                         <p>Attached is the <strong>Weekly Summary</strong> of all referrals confirmed for your campus over the last 7 days.</p>
                         <p><strong>Total Confirmed This Week:</strong> ${weeklyReferrals.length}</p>
                         <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                        { filename: weeklyFilename, content: weeklyCSV },
                        [DIRECTOR_EMAIL]
                    )
                }
                
                await logAction('AUTOMATED_REPORT', 'SYSTEM', `Sent Weekly Report to ${campusName} (Count: ${weeklyReferrals.length})`, campus.id.toString())
            }
        }

        // 4. DAILY Master Report (To Director)
        if (masterDailyReferrals.length > 0) {
            const masterCSV = generateReferralStudentDetailsCSV(masterDailyReferrals)
            const masterFilename = `DAILY_Master_Report_${now.toISOString().split('T')[0]}.csv`
            await EmailService.sendEmailWithAttachment(
                DIRECTOR_EMAIL,
                `DAILY Master Referral Report - All Campuses (${now.toLocaleDateString()})`,
                `<p>Dear Director,</p>
                 <p>Attached is the <strong>Daily Master Report</strong> covering all referrals across all campuses for today.</p>
                 <p><strong>Total Confirmed Today:</strong> ${masterDailyReferrals.length}</p>
                 <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                { filename: masterFilename, content: masterCSV }
            )
        }

        return NextResponse.json({ success: true, message: 'Daily/Weekly reports processed and shared.' })
    } catch (error: any) {
        console.error('Report Automation Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
