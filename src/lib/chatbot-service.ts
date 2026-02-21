import prisma from '@/lib/prisma'
import { whatsappService } from '@/lib/whatsapp-service'

/**
 * Service to handle incoming WhatsApp messages and keywords
 */
export class ChatbotService {

    /**
     * Entry point for incoming webhooks
     */
    async handleIncomingMessage(mobile: string, text: string) {
        const keyword = text.trim().toUpperCase()
        const sanitizedMobile = this.sanitizeMobile(mobile)

        // Find user by mobile
        const user = await prisma.user.findUnique({
            where: { mobileNumber: sanitizedMobile }
        })

        if (!user) {
            return whatsappService.sendFreeTextMessage(
                mobile,
                "Welcome! You are not registered as an Ambassador yet. Please sign up at https://ambassador.achariya.in to start earning rewards! 🚀",
                'CHATBOT'
            )
        }

        switch (keyword) {
            case 'STATUS':
                return this.handleStatus(user)
            case 'LEADS':
                return this.handleLeads(user)
            case 'PAYOUT':
                return this.handlePayout(user)
            case 'HELP':
                return this.handleHelp(user)
            default:
                // If it doesn't match a keyword, send a friendly help nudge
                return this.handleDefault(user)
        }
    }

    private async handleStatus(user: any) {
        const status = user.status === 'Active' ? '✅ Active' : '🟡 Pending'
        const stars = user.confirmedReferralCount >= 5 ? '🌟 5-Star' : `${user.confirmedReferralCount}-Star`

        let message = `*Account Status* 👤\n`
        message += `Name: ${user.fullName}\n`
        message += `Role: ${user.role}\n`
        message += `Status: ${status}\n`
        message += `Level: ${stars}\n\n`
        message += `Referral Code: *${user.referralCode}*\n`
        message += `Referrals: ${user.confirmedReferralCount} Confirmed`

        return whatsappService.sendFreeTextMessage(user.mobileNumber, message)
    }

    private async handleLeads(user: any) {
        const leads = await prisma.referralLead.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        })

        if (leads.length === 0) {
            return whatsappService.sendFreeTextMessage(
                user.mobileNumber,
                "You don't have any referrals yet. Start sharing your link to earn! 🚀"
            )
        }

        let message = `*Your Recent Leads* 👥\n\n`
        leads.forEach((l, i) => {
            const statusEmoji = l.leadStatus === 'Admitted' ? '🎓' : l.leadStatus === 'Confirmed' ? '✅' : '📋'
            message += `${i + 1}. ${l.parentName} (${statusEmoji} ${l.leadStatus})\n`
        })
        message += `\nView all at: https://ambassador.achariya.in/referrals`

        return whatsappService.sendFreeTextMessage(user.mobileNumber, message)
    }

    private async handlePayout(user: any) {
        const lastPayment = await prisma.payment.findFirst({
            where: { userId: user.userId, paymentStatus: 'SUCCESS' },
            orderBy: { createdAt: 'desc' }
        })

        let message = `*Payout Information* 💰\n\n`
        if (lastPayment) {
            message += `Last Payout: ₹${lastPayment.orderAmount}\n`
            message += `Status: ${lastPayment.paymentStatus}\n`
            message += `Date: ${lastPayment.paidAt?.toLocaleDateString('en-IN')}\n\n`
        } else {
            message += `No payouts processed yet.\n\n`
        }

        message += `Bank Details: ${user.bankAccountDetails ? '✅ Updated' : '⚠️ Missing'}`

        return whatsappService.sendFreeTextMessage(user.mobileNumber, message)
    }

    private async handleHelp(user: any) {
        let message = `*Achariya Bot Help* 🤖\n`
        message += `Reply with these keywords:\n\n`
        message += `👉 *STATUS*: Check account details\n`
        message += `👉 *LEADS*: Summary of referrals\n`
        message += `👉 *PAYOUT*: Check earnings\n`
        message += `👉 *HELP*: see this menu`

        return whatsappService.sendFreeTextMessage(user.mobileNumber, message)
    }

    private async handleDefault(user: any) {
        const message = `Hi ${user.fullName.split(' ')[0]}! I didn't recognize that command. Type *HELP* to see what I can do for you! 🤖`
        return whatsappService.sendFreeTextMessage(user.mobileNumber, message)
    }

    private sanitizeMobile(mobile: string): string {
        let sanitized = mobile.replace(/\D/g, '')
        // If it starts with 91 and is 12 digits, remove 91 for DB match (DB stores 10 digits usually)
        if (sanitized.length === 12 && sanitized.startsWith('91')) {
            sanitized = sanitized.substring(2)
        }
        return sanitized
    }
}

export const chatbotService = new ChatbotService()
