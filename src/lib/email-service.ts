import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123'); // Default for dev safety

export const EmailService = {
    async sendWelcomeEmail(to: string, name: string, role: string) {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[DEV MODE] Email Service: Sending Welcome Email to ${to}`);
            return { success: true, id: 'mock-id' };
        }

        try {
            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Achariya Ambassador <onboarding@resend.dev>',
                to: [to],
                subject: 'Welcome to Achariya Ambassador Program! 🌟',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #B91C1C;">Welcome, ${name}!</h1>
                        <p>Thank you for joining as a <strong>${role}</strong>.</p>
                        <p>You can now log in and start referring students to earn rewards.</p>
                        <br/>
                        <a href="https://ambassador.achariya.in" style="background: #D97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
                    </div>
                `
            });

            if (error) {
                console.error('Resend Error:', error);
                return { success: false, error };
            }

            return { success: true, data };
        } catch (error) {
            console.error('Email Service Error:', error);
            return { success: false, error };
        }
    },

    async sendLeadAssignedEmail(to: string, leadName: string, campus: string) {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[DEV MODE] Email Service: Lead ${leadName} assigned to ${to}`);
            return { success: true, id: 'mock-id' };
        }

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM ? `Achariya Leads <${process.env.EMAIL_FROM.split('<')[1] || process.env.EMAIL_FROM}` : 'Achariya Leads <leads@resend.dev>',
                to: [to],
                subject: 'New Lead Assigned 🎯',
                html: `
                    <div style="font-family: sans-serif;">
                        <h2>New Lead Alert</h2>
                        <p>A new lead <strong>${leadName}</strong> has been assigned to your campus <strong>${campus}</strong>.</p>
                        <p>Please log in to review and follow up.</p>
                    </div>
                `
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    async sendPaymentConfirmation(to: string, name: string, amount: number, transactionId: string) {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[DEV MODE] Email Service: Payment Confirmation to ${to} for ₹${amount}`);
            return { success: true, id: 'mock-id' };
        }

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM ? `Achariya Accounts <${process.env.EMAIL_FROM.split('<')[1] || process.env.EMAIL_FROM}` : 'Achariya Accounts <accounts@resend.dev>',
                to: [to],
                subject: 'Payment Received ✅',
                html: `
                    <div style="font-family: sans-serif;">
                        <h2>Payment Received</h2>
                        <p>Dear ${name},</p>
                        <p>We have received your payment of <strong>₹${amount}</strong>.</p>
                        <p>Transaction ID: ${transactionId}</p>
                        <p>Your account is now active.</p>
                    </div>
                `
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    async sendSupportNewMessage(to: string, name: string, ticketSubject: string, messageSnippet: string, isFromAdmin: boolean) {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[DEV MODE] Email Service: Support Reply for ticket "${ticketSubject}" to ${to}`);
            return { success: true, id: 'mock-id' };
        }

        try {
            const subject = isFromAdmin ? `Representative replied: ${ticketSubject}` : `New reply on ticket: ${ticketSubject}`;
            const title = isFromAdmin ? 'New Response from Support' : 'New Client Reply';

            await resend.emails.send({
                from: process.env.EMAIL_FROM ? `Achariya Support <${process.env.EMAIL_FROM.split('<')[1] || process.env.EMAIL_FROM}` : 'Achariya Support <support@resend.dev>',
                to: [to],
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: ${isFromAdmin ? '#1D4ED8' : '#DC2626'};">${title}</h2>
                        <p>Hello ${name},</p>
                        <p>A new message has been posted on ticket: <strong>${ticketSubject}</strong></p>
                        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isFromAdmin ? '#1D4ED8' : '#DC2626'};">
                            <p style="margin: 0; color: #374151; font-style: italic;">"${messageSnippet}"</p>
                        </div>
                        <p>Please log in to the dashboard to view the full conversation and reply.</p>
                    </div>
                `
            });
            return { success: true };
        } catch (error) {
            console.error('Email Service Error:', error);
            // Don't block flow if email fails
            return { success: false, error };
        }
    },

    async sendReportEmail(to: string, subject: string, htmlBody: string, reportTitle: string) {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[DEV MODE] Email Service: Sending Report "${subject}" to ${to}`);
            return { success: true, id: 'mock-id' };
        }

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM ? `Achariya Reports <${process.env.EMAIL_FROM.split('<')[1] || process.env.EMAIL_FROM}` : 'Achariya Reports <reports@resend.dev>',
                to: [to],
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">
                        <div style="background: #CC0000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: white; margin: 0;">${reportTitle}</h1>
                            <p style="color: #FCD34D; margin: 5px 0 0 0;">5-Star Ambassador Program</p>
                        </div>
                        <div style="padding: 20px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
                            ${htmlBody}
                            <p style="margin-top: 30px; font-size: 12px; color: #6B7280; text-align: center;">
                                Generated automatically by Achariya Portal.
                            </p>
                        </div>
                    </div>
                `
            });
            return { success: true };
        } catch (error) {
            console.error('Send Report Error:', error);
            return { success: false, error };
        }
    }
};

