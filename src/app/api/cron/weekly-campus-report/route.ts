import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
import { whatsappService } from '@/lib/whatsapp-service'
import { decrypt } from '@/lib/encryption'
import { getSpecialBonusRate } from '@/lib/reward-constants'

/**
 * Campus Referral Report Cron Job
 * Runs every Day at 7:00 PM IST (via vercel.json schedule)
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
        console.log(`Mode: Daily Report (since ${dailyStart.toLocaleString()})${isFriday ? ' + Weekly Summary' : ''}`)
        
        const campuses = await prisma.campus.findMany({
            where: { isActive: true }
        })

        const masterDailyReferrals: any[] = []

        for (const campus of campuses) {
            // 1. Fetch DAILY confirmed referrals for this campus
            const referrals = await prisma.referralLead.findMany({
                where: {
                    campus: campus.campusName,
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    confirmedDate: { gte: dailyStart, lte: now }
                },
                include: {
                    user: true,
                    student: { include: { campus: true } }
                },
                orderBy: { confirmedDate: 'desc' }
            })

            masterDailyReferrals.push(...referrals)

            if (referrals.length === 0) {
                console.log(`[${campus.campusName}] No new referrals today.`)
                continue
            }

            // 2. Generate CSV for Campus Head
            const headers = [
                'List', 'Academic Year', 'Student Name', 'ERP Number', 'Grade', 'Campus',
                'Admission Fee Total', 'Admission Fee Paid', 'Donation Fee Total', 'Donation Fee Paid',
                'Ambassador Code', 'Ambassador Name', 'Ambassador Mobile', 'Role',
                'Bank Name', 'Account Number', 'IFSC Code',
                'Admission Share', 'Donation Share', 'Special Campus Share', 'Total Payment'
            ]
            const rows = [headers.join(',')]

            referrals.forEach((ref: any) => {
                const user = ref.user
                const campusName = ref.campus || campus.campusName
                const admFeeTotal = Number(ref.admissionFeeCollected) || 0
                const donFeeTotal = Number(ref.donationFeeCollected) || 0
                const specialBonusRate = getSpecialBonusRate(campusName)
                const hasSpecialBonus = specialBonusRate > 0
                const admShare = hasSpecialBonus ? 0 : Math.round(admFeeTotal * 0.8)
                const donShare = hasSpecialBonus ? 0 : Math.round(donFeeTotal * 0.5)
                const specialCampusShare = hasSpecialBonus ? specialBonusRate : 0
                
                let bankName = user.bankName || ''
                let accNo = user.accountNumber || ''
                let ifsc = user.ifscCode || ''

                if (!bankName && user.bankAccountDetails) {
                    const decrypted = decrypt(user.bankAccountDetails)
                    if (decrypted) {
                        const parts = decrypted.split(' - ')
                        if (parts.length >= 2) {
                            bankName = parts[0]
                            accNo = parts[1]
                        }
                    }
                }

                const totalPayment = admShare + donShare + specialCampusShare
                const row = [
                    user.role === 'Staff' ? 'List B' : 'List C',
                    ref.academicYear || '2026-2027',
                    ref.studentName,
                    ref.admissionNumber || '',
                    ref.gradeInterested || '',
                    campusName,
                    admFeeTotal, admFeeTotal, donFeeTotal, donFeeTotal,
                    user.referralCode || '',
                    user.fullName,
                    user.mobileNumber,
                    user.role,
                    bankName, `'${accNo}`, ifsc,
                    admShare, donShare, specialCampusShare, totalPayment
                ]
                rows.push(row.map(val => `"${val}"`).join(','))
            })

            const csvContent = rows.join('\n')
            const filename = `Daily_Report_${campus.campusName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.csv`
            const campusEmail = campus.contactEmail

            if (campusEmail) {
                await EmailService.sendEmailWithAttachment(
                    campusEmail,
                    `Daily Referral Report - ${campus.campusName} (${now.toLocaleDateString()})`,
                    `<p>Dear Campus Head,</p>
                     <p>Please find attached the daily report of students confirmed through the Ambassador Program for today.</p>
                     <p><strong>Total Confirmed Today:</strong> ${referrals.length}</p>
                     <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                    { filename, content: csvContent },
                    ['director.la@achariya.org']
                )
                
                if (campus.contactPhone) {
                    await whatsappService.sendFreeTextMessage(
                        campus.contactPhone,
                        `📢 Daily Report Alert: ${referrals.length} new confirmed referrals for ${campus.campusName} today. Detailed CSV sent to ${campusEmail}.`,
                        'SYSTEM'
                    )
                }
            }
        }

        // 3. Helper for Master CSV
        const generateMasterCSV = (referrals: any[]) => {
            const masterHeaders = [
                'Campus', 'List', 'Academic Year', 'Student Name', 'ERP Number', 'Grade',
                'Admission Fee Total', 'Admission Fee Paid', 'Donation Fee Total', 'Donation Fee Paid',
                'Ambassador Code', 'Ambassador Name', 'Ambassador Mobile', 'Role',
                'Bank Name', 'Account Number', 'IFSC Code',
                'Admission Share', 'Donation Share', 'Special Campus Share', 'Total Payment'
            ]
            const masterRows = [masterHeaders.join(',')]
            referrals.forEach((ref: any) => {
                const user = ref.user
                const campusName = ref.campus || 'N/A'
                const admFeeTotal = Number(ref.admissionFeeCollected) || 0
                const donFeeTotal = Number(ref.donationFeeCollected) || 0
                const specialBonusRate = getSpecialBonusRate(campusName)
                const admShare = specialBonusRate > 0 ? 0 : Math.round(admFeeTotal * 0.8)
                const donShare = specialBonusRate > 0 ? 0 : Math.round(donFeeTotal * 0.5)
                const specialCampusShare = specialBonusRate > 0 ? specialBonusRate : 0
                
                let bankName = user.bankName || ''
                let accNo = user.accountNumber || ''
                let ifsc = user.ifscCode || ''

                if (!bankName && user.bankAccountDetails) {
                    const decrypted = decrypt(user.bankAccountDetails)
                    if (decrypted) {
                        const parts = decrypted.split(' - ')
                        if (parts.length >= 2) {
                            bankName = parts[0]
                            accNo = parts[1]
                        }
                    }
                }

                const totalPayment = admShare + donShare + specialCampusShare
                const row = [
                    campusName,
                    user.role === 'Staff' ? 'List B' : 'List C',
                    ref.academicYear || '2026-2027',
                    ref.studentName,
                    ref.admissionNumber || '',
                    ref.gradeInterested || '',
                    admFeeTotal, admFeeTotal, donFeeTotal, donFeeTotal,
                    user.referralCode || '',
                    user.fullName,
                    user.mobileNumber,
                    user.role,
                    bankName, `'${accNo}`, ifsc,
                    admShare, donShare, specialCampusShare, totalPayment
                ]
                masterRows.push(row.map(val => `"${val}"`).join(','))
            })
            return masterRows.join('\n')
        }

        // 4. DAILY Master Report (To Director)
        if (masterDailyReferrals.length > 0) {
            const csvContent = generateMasterCSV(masterDailyReferrals)
            const filename = `DAILY_Master_Report_${now.toISOString().split('T')[0]}.csv`
            await EmailService.sendEmailWithAttachment(
                'director.la@achariya.org',
                `DAILY Referral Report - All Campuses (${now.toLocaleDateString()})`,
                `<p>Dear Director,</p>
                 <p>Attached is the <strong>Daily Referral Report</strong> for all campuses.</p>
                 <p><strong>Total Confirmed Today:</strong> ${masterDailyReferrals.length}</p>
                 <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                { filename, content: csvContent }
            )
        }

        // 5. WEEKLY Master Summary (To Director on Fridays)
        if (isFriday) {
            const weeklyReferrals = await prisma.referralLead.findMany({
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    confirmedDate: { gte: weeklyStart, lte: now }
                },
                include: { user: true },
                orderBy: [{ campus: 'asc' }, { confirmedDate: 'desc' }]
            })

            if (weeklyReferrals.length > 0) {
                const csvContent = generateMasterCSV(weeklyReferrals)
                const filename = `WEEKLY_Master_Summary_${now.toISOString().split('T')[0]}.csv`
                await EmailService.sendEmailWithAttachment(
                    'director.la@achariya.org',
                    `WEEKLY Referral Summary - All Campuses`,
                    `<p>Dear Director,</p>
                     <p>Attached is the <strong>Weekly Summary</strong> of all referrals across all campuses.</p>
                     <p><strong>Total Confirmed This Week:</strong> ${weeklyReferrals.length}</p>
                     <p>Best regards,<br/>Achariya 5-Star Ambassador Team</p>`,
                    { filename, content: csvContent }
                )
            }
        }

        return NextResponse.json({ success: true, message: 'Daily/Weekly reports processed' })
    } catch (error: any) {
        console.error('Report Automation Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
