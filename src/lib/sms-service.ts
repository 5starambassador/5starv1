import { headers } from 'next/headers'

type SMSProvider = 'mock' | 'twilio' | 'msg91'

interface SMSResponse {
    success: boolean
    messageId?: string
    error?: string
}

const PROVIDER: SMSProvider = (process.env.SMS_PROVIDER as SMSProvider) || 'mock'


export type OTPFlow = 'registration' | 'forgot-password' | 'referral'

const MSG91_CONFIG = {
    authKey: "485538AfzLQYaH69672145P1",
    senderId: "ACHAPP",
    templates: {
        registration: "69671ce2f0f84f0363446ec4",
        "forgot-password": "69671d580b181d4b4d18d092",
        referral: "69671da09556fa4ffa1aaf28"
    }
}

class SMSService {
    async sendOTP(mobile: string, otp: string, flow: OTPFlow = 'registration'): Promise<SMSResponse> {
        const message = `Your Achariya OTP is ${otp}. Valid for 10 minutes. Do not share this with anyone.`
        return this.send(mobile, message, otp, flow)
    }

    async sendAlert(mobile: string, message: string): Promise<SMSResponse> {
        return this.send(mobile, message)
    }

    private async send(mobile: string, message: string, otp?: string, flow?: OTPFlow): Promise<SMSResponse> {
        try {
            // Priority Check: If we have MSG91 keys, use it
            if (MSG91_CONFIG.authKey) {
                return this.sendMsg91(mobile, otp, flow)
            }

            switch (PROVIDER) {
                case 'twilio':
                    return this.sendTwilio(mobile, message)
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
        console.warn('Twilio provider not configured, falling back to mock')
        return this.sendMock(mobile, message)
    }

    private async sendMsg91(mobile: string, otp?: string, flow?: OTPFlow): Promise<SMSResponse> {
        if (!otp || !flow) {
            return this.sendMock(mobile, "MSG91 Alert: " + (otp || "No OTP"))
        }

        const templateId = MSG91_CONFIG.templates[flow]

        try {
            const url = "https://control.msg91.com/api/v5/otp?" + new URLSearchParams({
                template_id: templateId,
                mobile: '91' + mobile,
                authkey: MSG91_CONFIG.authKey,
                otp: otp
                // Note: MSG91 V5 might require additional payload for variables if template uses them
                // For basic OTP templates, usually 'otp' param is enough if template has ##OTP##
            })

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (data.type === 'success') {
                return { success: true, messageId: data.message }
            } else {
                console.error('MSG91 Error:', data)
                return { success: false, error: data.message || 'MSG91 Failed' }
            }
        } catch (error: any) {
            console.error('MSG91 Fetch Error:', error)
            return { success: false, error: error.message }
        }
    }
}

export const smsService = new SMSService()
