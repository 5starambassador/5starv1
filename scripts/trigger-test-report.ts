import { PrismaClient } from '@prisma/client'
import { EmailService } from '../src/lib/email-service'
import { getSpecialBonusRate } from '../src/lib/reward-constants'
import { decrypt } from '../src/lib/encryption'

const prisma = new PrismaClient()

async function sendTestReport() {
    const campusName = "ASM - VILLIANUR"
    console.log(`🚀 Starting Test Report Send for: ${campusName}`)

    const campus = await prisma.campus.findUnique({
        where: { campusName }
    })

    if (!campus || !campus.contactEmail) {
        console.error(`❌ Campus ${campusName} not found or has no email.`)
        return
    }

    const now = new Date()
    const lastFriday = new Date()
    lastFriday.setDate(now.getDate() - 7)

    const referrals = await prisma.referralLead.findMany({
        where: {
            campus: campusName,
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            confirmedDate: { gte: lastFriday, lte: now }
        },
        include: { user: true }
    })

    // If no referrals this week, grab last 5 just for testing
    const testReferrals = referrals.length > 0 ? referrals : await prisma.referralLead.findMany({
        where: {
            campus: campusName,
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        },
        include: { user: true },
        take: 5
    })

    if (testReferrals.length === 0) {
        console.error("❌ No data found to send in report.")
        return
    }

    const headers = [
        'Campus', 'List', 'Academic Year', 'Student Name', 'ERP Number', 'Grade',
        'Admission Fee Total', 'Admission Fee Paid', 'Donation Fee Total', 'Donation Fee Paid',
        'Ambassador Code', 'Ambassador Name', 'Ambassador Mobile', 'Role',
        'Bank Name', 'Account Number', 'IFSC Code',
        'Admission Share', 'Donation Share', 'Special Campus Share', 'Total Payment'
    ]

    const rows = [headers.join(',')]

    testReferrals.forEach((ref: any) => {
        const user = ref.user
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
        rows.push(row.map(val => `"${val}"`).join(','))
    })

    const csvContent = rows.join('\n')
    const filename = `TEST_Referral_Report_${campusName.replace(/\s+/g, '_')}.csv`

    console.log(`📧 Sending email to: ${campus.contactEmail} (and CC to Director)`)

    await EmailService.sendEmailWithAttachment(
        campus.contactEmail,
        `[TEST] Weekly Referral Student Details - ${campusName}`,
        `<p>Dear Campus Head,</p>
         <p>This is a <strong>TEST</strong> of the automated Weekly Referral Report.</p>
         <p>Attached you will find the referral details for your campus.</p>
         <p>Best regards,<br/>Achariya 5-Star Ambassador Program</p>`,
        { filename, content: csvContent }
    )

    console.log('✅ Test Report Dispatched Successfully!')
}

sendTestReport()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
