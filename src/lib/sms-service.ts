import { headers } from 'next/headers'

type SMSProvider = 'mock' | 'twilio' | 'msg91'

interface SMSResponse {
    success: boolean
    messageId?: string
    error?: string
}

const PROVIDER: SMSProvider = (process.env.SMS_PROVIDER as SMSProvider) || 'mock'

class SMSService {
    async sendOTP(mobile: string, otp: string): Promise<SMSResponse> {
        const message = `Your Achariya OTP is ${otp}. Valid for 10 minutes. Do not share this with anyone.`
        return this.send(mobile, message)
    }

    async sendAlert(mobile: string, message: string): Promise<SMSResponse> {
        return this.send(mobile, message)
    }

    private async send(mobile: string, message: string): Promise<SMSResponse> {
        try {
            switch (PROVIDER) {
                case 'twilio':
                    return this.sendTwilio(mobile, message)
                case 'msg91':
                    return this.sendMsg91(mobile, message)
                case 'mock':
                default:
                    return this.sendMock(mobile, message)
            }
        } catch (error: any) {
            console.error('SMS Service Error:', error)
            return { success: false, error: error.message }
        }
    }

    private async sendMock(mobile: string, message: string): Promise<SMSResponse> {
        console.log(`\n📱 [MOCK SMS] To: ${mobile} | Message: "${message}"\n`)
        return { success: true, messageId: 'mock-id-' + Date.now() }
    }

    private async sendTwilio(mobile: string, message: string): Promise<SMSResponse> {
        // Placeholder for Twilio implementation
        // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        // await client.messages.create({ body: message, to: mobile, from: process.env.TWILIO_FROM });
        console.warn('Twilio provider not configured, falling back to mock')
        return this.sendMock(mobile, message)
    }

    private async sendMsg91(mobile: string, message: string): Promise<SMSResponse> {
        // Placeholder for Msg91 implementation
        console.warn('Msg91 provider not configured, falling back to mock')
        return this.sendMock(mobile, message)
    }
}

export const smsService = new SMSService()
