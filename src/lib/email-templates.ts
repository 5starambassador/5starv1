import { Resend } from 'resend'

// Initialize Resend client (API key from environment)
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Branded HTML Email Template
 */
function getEmailTemplate(content: {
    title: string
    preheader?: string
    greeting: string
    body: string
    ctaText?: string
    ctaUrl?: string
    footer?: string
}) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #CC0000 0%, #AA0000 100%); padding: 30px; text-align: center; }
        .header img { max-width: 150px; }
        .header h1 { color: #ffffff; margin: 10px 0 0; font-size: 24px; font-weight: 800; }
        .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 12px; }
        .content { padding: 40px 30px; }
        .content h2 { color: #CC0000; margin: 0 0 20px; font-size: 22px; }
        .content p { color: #333333; line-height: 1.6; margin: 0 0 16px; }
        .cta { display: inline-block; background: linear-gradient(135deg, #CC0000 0%, #EE4444 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 20px 0; }
        .footer { background: #1F2937; padding: 30px; text-align: center; }
        .footer p { color: #9CA3AF; font-size: 12px; margin: 5px 0; }
        .footer a { color: #FBBF24; text-decoration: none; }
        .divider { height: 4px; background: linear-gradient(90deg, #CC0000, #FFD936); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ACHARIYA</h1>
            <p>5-Star Ambassador Program • 25th Year Celebration</p>
        </div>
        <div class="divider"></div>
        <div class="content">
            <h2>${content.greeting}</h2>
            ${content.body.split('\n').map(p => `<p>${p}</p>`).join('')}
            ${content.ctaText && content.ctaUrl ? `<a href="${content.ctaUrl}" class="cta">${content.ctaText}</a>` : ''}
        </div>
        <div class="footer">
            <p>Achariya Group of Institutions</p>
            <p>Pondicherry, India</p>
            <p>${content.footer || 'This is an automated message from the Ambassador Portal.'}</p>
            <p><a href="https://achariya.in">achariya.in</a></p>
        </div>
    </div>
</body>
</html>
`
}

/**
 * Send Welcome Email to New Ambassador
 */
export async function sendWelcomeEmail(to: string, name: string, referralCode: string) {
    try {
        await resend.emails.send({
            from: 'Achariya Ambassador <noreply@ambassador.achariya.in>',
            to,
            subject: '🎉 Welcome to Achariya 5-Star Ambassador Program!',
            html: getEmailTemplate({
                title: 'Welcome to Ambassador Program',
                greeting: `Welcome, ${name}!`,
                body: `Congratulations on joining the Achariya 5-Star Ambassador Program as part of our 25th Year Celebration!

Your unique referral code is: <strong style="color: #CC0000; font-size: 18px;">${referralCode}</strong>

Share this code with friends and family to earn exclusive benefits. Every successful admission through your referral earns you rewards!`,
                ctaText: 'Start Referring Now',
                ctaUrl: 'https://ambassador.achariya.in/refer',
                footer: 'Thank you for being part of our ambassador family.'
            })
        })
        return { success: true }
    } catch (error) {
        console.error('Email failed:', error)
        return { success: false, error }
    }
}

/**
 * Send Referral Status Update Email
 */
export async function sendReferralStatusEmail(
    to: string,
    ambassadorName: string,
    studentName: string,
    newStatus: string
) {
    const statusColors: Record<string, string> = {
        'Confirmed': '#10B981',
        'Pending': '#F59E0B',
        'Rejected': '#EF4444',
        'In Progress': '#3B82F6'
    }

    try {
        await resend.emails.send({
            from: 'Achariya Ambassador <noreply@ambassador.achariya.in>',
            to,
            subject: `📋 Referral Update: ${studentName} - ${newStatus}`,
            html: getEmailTemplate({
                title: 'Referral Status Update',
                greeting: `Hi ${ambassadorName}`,
                body: `Your referral for <strong>${studentName}</strong> has been updated.

<div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${statusColors[newStatus] || '#CC0000'};">
<strong>New Status:</strong> <span style="color: ${statusColors[newStatus] || '#333'}">${newStatus}</span>
</div>

${newStatus === 'Confirmed' ? 'Congratulations! This referral has been confirmed. Your benefits will be credited accordingly.' : 'We will keep you updated on further progress.'}`,
                ctaText: 'View All Referrals',
                ctaUrl: 'https://ambassador.achariya.in/referrals'
            })
        })
        return { success: true }
    } catch (error) {
        console.error('Email failed:', error)
        return { success: false, error }
    }
}

/**
 * Send OTP Email
 */
export async function sendOTPEmail(to: string, otp: string) {
    try {
        await resend.emails.send({
            from: 'Achariya Ambassador <noreply@ambassador.achariya.in>',
            to,
            subject: `🔐 Your OTP: ${otp}`,
            html: getEmailTemplate({
                title: 'Verification Code',
                greeting: 'Verification Code',
                body: `Your one-time password for Achariya Ambassador Portal is:

<div style="background: linear-gradient(135deg, #CC0000, #FF4444); color: white; font-size: 32px; font-weight: 800; padding: 20px 40px; border-radius: 12px; text-align: center; letter-spacing: 8px; margin: 20px 0;">
${otp}
</div>

This code is valid for 10 minutes. Do not share this code with anyone.`,
                footer: 'If you did not request this code, please ignore this email.'
            })
        })
        return { success: true }
    } catch (error) {
        console.error('Email failed:', error)
        return { success: false, error }
    }
}
