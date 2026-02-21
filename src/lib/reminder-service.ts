import prisma from '@/lib/prisma'
import { whatsappService } from '@/lib/whatsapp-service'
import { EmailService } from '@/lib/email-service'

/**
 * Service to handle automated reminders for user lifecycle events.
 * Intended to be run via Cron Job (e.g. daily).
 */
export class ReminderService {

    /**
     * 1. Payment Pending Reminder
     * Target: Users who registered > 24 hours ago but status is still 'Pending' (Unpaid).
     */
    async sendPaymentReminders() {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        // Find users created before yesterday who depend on payment (Ambassadors)
        // and are still Pending
        const pendingUsers = await prisma.user.findMany({
            where: {
                status: 'Pending',
                createdAt: { lt: yesterday },
                // Avoid spamming: check if we already sent a reminder recently? 
                // For MVP, we'll just check if they have NO successful transactions.
                paymentStatus: { not: 'Success' },
                role: { in: ['Parent', 'Staff', 'Alumni', 'Others'] }
            },
            take: 50 // Batch limit to be safe
        })

        console.log(`[Reminder] Found ${pendingUsers.length} users pending payment > 24h`)

        for (const user of pendingUsers) {
            if (user.mobileNumber) {
                // Template: payment_reminder (Name, Fee)
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'PAYMENT_REMINDER',
                    [user.fullName || 'Ambassador', (user as any).studentFee?.toString() || '60000'],
                    'REMINDER'
                )
            }
        }
        return { count: pendingUsers.length }
    }

    /**
     * 2. Profile Completion Reminder (Bank Details)
     * Target: Active users (Paid) who have NO bank details.
     */
    async sendBankDetailsReminder() {
        // Find Active users with missing bank details
        const users = await prisma.user.findMany({
            where: {
                status: 'Active',
                bankAccountDetails: null,
                role: { in: ['Parent', 'Staff', 'Alumni', 'Others'] }
            },
            take: 50
        })

        console.log(`[Reminder] Found ${users.length} active users missing bank details`)

        for (const user of users) {
            if (user.mobileNumber) {
                // Template: bank_details_missing (Name)
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'BANK_DETAILS_REMINDER',
                    [user.fullName || 'Ambassador'],
                    'REMINDER'
                )
            }
        }
        return { count: users.length }
    }

    /**
     * 3. Profile Completion Reminder (Child Details)
     * Target: Active PARENTS who have not linked a Child/Campus.
     */
    async sendChildDetailsReminder() {
        // Find Active Parents with null or empty child/campus data
        const parents = await prisma.user.findMany({
            where: {
                status: 'Active',
                role: 'Parent',
                OR: [
                    { childName: null },
                    { assignedCampus: null }
                ]
            },
            take: 50
        })

        console.log(`[Reminder] Found ${parents.length} active parents missing child details`)

        for (const parent of parents) {
            if (parent.mobileNumber) {
                // Template: child_details_missing (Name)
                await whatsappService.sendByEvent(
                    parent.mobileNumber,
                    'CHILD_DETAILS_REMINDER',
                    [parent.fullName || 'Parent'],
                    'REMINDER'
                )
            }
        }
        return { count: parents.length }
    }

    /**
     * 4. Referral Activation Reminder
     * Target: Active users who registered > 7 days ago but have 0 referrals.
     */
    async sendReferralReminder() {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const users = await prisma.user.findMany({
            where: {
                status: 'Active',
                createdAt: { lt: sevenDaysAgo },
                // referralCount: 0, // REMOVED: Field does not exist
                confirmedReferralCount: 0
            },
            take: 50
        })

        console.log(`[Reminder] Found ${users.length} active users with 0 referrals > 7 days`)

        for (const user of users) {
            if (user.mobileNumber) {
                // Template: referral_reminder (Name, Code)
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'REFERRAL_REMINDER',
                    [user.fullName || 'Ambassador', user.referralCode || 'YOURCODE'],
                    'REMINDER'
                )
            }
        }
        return { count: users.length }
    }

    /**
     * 5. Referral Motivation (Gamification)
     * Target: Active users with 1 to 4 confirmed referrals (Near 5-Star).
     */
    async sendReferralMotivation() {
        const users = await prisma.user.findMany({
            where: {
                status: 'Active',
                confirmedReferralCount: { gte: 1, lt: 5 }
            },
            take: 50
        })

        console.log(`[Reminder] Found ${users.length} users with 1-4 referrals to motivate`)

        for (const user of users) {
            if (user.mobileNumber) {
                const count = user.confirmedReferralCount || 0
                const remaining = 5 - count
                // Template: referral_motivation (Name, Count, Remaining)
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'REFERRAL_MOTIVATION',
                    [user.fullName || 'Ambassador', count.toString(), remaining.toString()],
                    'REMINDER'
                )
            }
        }
        return { count: users.length }
    }

    /**
     * 6. Referral Follow-up (Lead Nurturing)
     * Target: Referrals created > 7 days ago but not yet 'Confirmed' or 'Admitted'.
     */
    async sendReferralFollowUp() {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const staleReferrals = await prisma.referralLead.findMany({
            where: {
                createdAt: { lt: sevenDaysAgo },
                leadStatus: { notIn: ['Confirmed', 'Admitted', 'Rejected'] }
            },
            include: {
                user: { select: { mobileNumber: true, fullName: true } }
            },
            take: 50
        })

        console.log(`[Reminder] Found ${staleReferrals.length} stale referrals to follow up`)

        for (const lead of staleReferrals) {
            if (lead.user?.mobileNumber) {
                // Template: referral_followup (Name, LeadName)
                await whatsappService.sendByEvent(
                    lead.user.mobileNumber,
                    'REFERRAL_FOLLOWUP',
                    [lead.user.fullName || 'Ambassador', lead.parentName],
                    'REMINDER'
                )
            }
        }
        return { count: staleReferrals.length }
    }

    /**
     * 7. External Program Nudges (Abandonment & Success)
     * Target: Program Leads.
     */
    async sendExternalProgramNudges() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        // A. Abandonment (Clicked > 1h ago, Not Registered, Created in last 24h)
        const abandonedLeads = await prisma.programLead.findMany({
            where: {
                status: 'CLICKED',
                clickedAt: { lt: oneHourAgo, gt: twentyFourHoursAgo },
                // Assuming we haven't sent it yet. 
                // Since this runs daily, the window ensures we only pick them up once per day cycle.
                // Ideally we'd flag them, but this acts as a stateless "Daily Sweep".
            },
            include: { program: true, referrer: true },
            take: 50
        })

        console.log(`[Reminder] Found ${abandonedLeads.length} abandoned program leads`)

        for (const lead of abandonedLeads) {
            // 1. Nudge the Lead (if we have their mobile)
            if (lead.visitorMobile) {
                await whatsappService.sendByEvent(
                    lead.visitorMobile,
                    'PROGRAM_BROWSE_ABANDON',
                    [lead.program.title, lead.program.publicUrl || 'Link'],
                    'DRIP'
                )
            }

            // 2. Nudge the Ambassador (Referrer)
            if (lead.referrer?.mobileNumber) {
                await whatsappService.sendByEvent(
                    lead.referrer.mobileNumber,
                    'AMBASSADOR_PROGRAM_NUDGE',
                    [lead.referrer.fullName || 'Ambassador', lead.visitorName || 'Friend', lead.program.title],
                    'ALERT'
                )
            }
        }

        // B. Success (Registered users who haven't been credited commission yet)
        // We use `commissionCredited: false` as a proxy for "Needs Processing/Notification"
        const successLeads = await prisma.programLead.findMany({
            where: {
                status: 'REGISTERED',
                commissionCredited: false
                // We'll notify them now. 
                // NOTE: Real system should probably mark something as "Notified" separate from Commission.
                // For MVP, we assume if commission isn't credited, we haven't fully processed them.
            },
            include: { program: true, referrer: true },
            take: 50
        })

        console.log(`[Reminder] Found ${successLeads.length} successful program leads to notify`)

        for (const lead of successLeads) {
            // 1. Congratulate Lead
            if (lead.visitorMobile) {
                await whatsappService.sendByEvent(
                    lead.visitorMobile,
                    'PROGRAM_REGISTRATION_SUCCESS',
                    [lead.program.title, lead.program.targetUrl || 'Link'],
                    'ALERT'
                )
            }

            // 2. Congratulate Ambassador
            if (lead.referrer?.mobileNumber) {
                await whatsappService.sendByEvent(
                    lead.referrer.mobileNumber,
                    'AMBASSADOR_PROGRAM_SUCCESS',
                    [lead.visitorName || 'Your Referral', lead.program.title],
                    'ALERT'
                )
            }
        }

        return { abandoned: abandonedLeads.length, success: successLeads.length }
    }

    /**
     * 8. Welcome Drip (Day 1 & Day 3 Education)
     * Target: New Users (Time-based windows).
     */
    async sendWelcomeDrip() {
        // Day 1 Window: Created between 24h and 48h ago
        const day1Start = new Date(Date.now() - 48 * 60 * 60 * 1000)
        const day1End = new Date(Date.now() - 24 * 60 * 60 * 1000)

        // Day 3 Window: Created between 72h and 96h ago
        const day3Start = new Date(Date.now() - 96 * 60 * 60 * 1000)
        const day3End = new Date(Date.now() - 72 * 60 * 60 * 1000)

        // Fetch Day 1 Users
        const day1Users = await prisma.user.findMany({
            where: {
                createdAt: { gte: day1Start, lte: day1End },
                role: 'Parent' // Or generic 'User' if applicable to all
            },
            select: { mobileNumber: true, fullName: true },
            take: 50
        })

        // Fetch Day 3 Users
        const day3Users = await prisma.user.findMany({
            where: {
                createdAt: { gte: day3Start, lte: day3End },
                role: 'Parent'
            },
            select: { mobileNumber: true, fullName: true },
            take: 50
        })

        console.log(`[Reminder] Welcome Drip: ${day1Users.length} Day-1 users, ${day3Users.length} Day-3 users`)

        // Send Day 1 (Video Tip)
        for (const user of day1Users) {
            if (user.mobileNumber) {
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'WELCOME_DRIP_DAY1',
                    ['https://youtu.be/example'], // Replace with actual video link
                    'DRIP'
                )
            }
        }

        // Send Day 3 (Family Group Tip)
        for (const user of day3Users) {
            if (user.mobileNumber) {
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'WELCOME_DRIP_DAY3',
                    [user.fullName || 'Ambassador'], // Variable is Name
                    'DRIP'
                )
            }
        }

        return { day1Count: day1Users.length, day3Count: day3Users.length }
    }

    /**
     * 9. Admin CEO Digest (Daily Summary)
     * Target: Super Admins
     */
    async sendAdminDigest() {
        // Time Window: Today (00:00 to Now)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        // 1. Metrics
        const [newUsers, activeSessions, newReferrals, newProgramLeads, revenue] = await Promise.all([
            // New Signups
            prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),

            // Active Users (Approx via Device Token usage)
            prisma.deviceToken.groupBy({
                by: ['userId'],
                where: { lastUsedAt: { gte: startOfDay } }
            }).then(res => res.length),

            // New Leads (Internal)
            prisma.referralLead.count({ where: { createdAt: { gte: startOfDay } } }),

            // New Leads (External)
            prisma.programLead.count({ where: { clickedAt: { gte: startOfDay } } }),

            // Revenue (Successful Payments)
            prisma.payment.aggregate({
                _sum: { orderAmount: true },
                where: {
                    paymentStatus: { in: ['Success', 'SUCCESS'] }, // Handle case variety
                    paidAt: { gte: startOfDay }
                }
            }).then(res => res._sum.orderAmount || 0)
        ])

        const totalLeads = newReferrals + newProgramLeads
        const dateStr = startOfDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

        // 2. Recipients (Super Admins)
        const admins = await prisma.admin.findMany({
            where: {
                role: 'Super_Admin',
                status: 'Active'
            }
        })

        console.log(`[Reminder] Sending Admin Digest to ${admins.length} admins. Stats: Users=${newUsers}, Active=${activeSessions}, Leads=${totalLeads}, Rev=${revenue}`)

        let sentCount = 0
        for (const admin of admins) {
            if (admin.adminMobile) {
                // Template: admin_daily_digest (Date, NewUsers, Active, Leads, Revenue)
                await whatsappService.sendByEvent(
                    admin.adminMobile,
                    'ADMIN_DAILY_DIGEST',
                    [
                        dateStr,
                        newUsers.toString(),
                        activeSessions.toString(),
                        totalLeads.toString(),
                        revenue.toLocaleString('en-IN')
                    ],
                    'ALERT'
                )
                sentCount++
            }
        }

        return { recipients: sentCount, newUsers, revenue }
    }

    /**
     * 10. KYC & Profiling Nudge
     * Target: Active users (Paid) whose benefit status is still Inactive/Pending 
     * because they haven't uploaded Aadhaar or linked a child.
     */
    async sendKYCNudge() {
        const users = await prisma.user.findMany({
            where: {
                status: 'Active',
                benefitStatus: { in: ['Inactive', 'Pending'] },
                // Only nudge if they've been around for at least 2 days
                createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
                role: 'Parent'
            },
            take: 50
        })

        console.log(`[Reminder] Found ${users.length} users to nudge for KYC/Verification`)

        for (const user of users) {
            if (user.mobileNumber) {
                // Template: kyc_reminder (Name)
                await whatsappService.sendByEvent(
                    user.mobileNumber,
                    'KYC_REMINDER',
                    [user.fullName || 'Ambassador'],
                    'REMINDER'
                )
            }
        }
        return { count: users.length }
    }

    /**
     * Master Runner
     */
    async runAll() {
        const payment = await this.sendPaymentReminders()
        const bank = await this.sendBankDetailsReminder()
        const child = await this.sendChildDetailsReminder()
        const referral = await this.sendReferralReminder()
        const motivation = await this.sendReferralMotivation()
        const followup = await this.sendReferralFollowUp()
        const programs = await this.sendExternalProgramNudges()
        const drip = await this.sendWelcomeDrip()
        const admin = await this.sendAdminDigest()
        const kyc = await this.sendKYCNudge()

        return { payment, bank, child, referral, motivation, followup, programs, drip, admin, kyc }
    }
}

export const reminderService = new ReminderService()
