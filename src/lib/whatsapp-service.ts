import prisma from '@/lib/prisma'

interface WhatsAppResponse {
    success: boolean
    messageId?: string
    error?: string
}

const MSG91_AUTH_KEY = process.env.MSG91_WHATSAPP_AUTH_KEY || process.env.MSG91_AUTH_KEY || ""
const MSG91_WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_NUMBER || ""
const MSG91_API_URL = process.env.MSG91_API_URL || "https://api.msg91.com/api/v5"
const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'mock'

const MSG91_WHATSAPP_NAMESPACE = process.env.MSG91_WHATSAPP_NAMESPACE || "a4fe4058_eaa9_45d8_91d6_df10d082de80"

/**
 * WhatsApp Service using MSG91 WhatsApp API
 */
class WhatsAppService {
    private configCache: Map<string, { templateName: string, isEnabled: boolean, requiredVariablesCount: number }> = new Map()
    private lastSentTime: Map<string, number> = new Map() // Rate limiting buffer
    private lastCacheUpdate: number = 0
    private CACHE_TTL = 60 * 1000 // 1 minute
    private RATE_LIMIT_MS = 2000 // 2 seconds between messages to same number

    /**
     * Refreshes the local configuration cache from the database
     */
    private async refreshConfigCache() {
        const now = Date.now()
        if (now - this.lastCacheUpdate < this.CACHE_TTL && this.configCache.size > 0) return

        try {
            const configs = await prisma.whatsAppConfig.findMany()
            this.configCache.clear()
            configs.forEach(c => {
                this.configCache.set(c.eventKey, {
                    templateName: c.templateName,
                    isEnabled: c.isEnabled,
                    requiredVariablesCount: (c as any).requiredVariablesCount
                })
            })
            this.lastCacheUpdate = now
        } catch (error) {
            console.error('Failed to refresh WhatsApp config cache:', error)
        }
    }

    /**
     * Sends a WhatsApp message based on a system Event Key.
     * Use this for all automated system triggers.
     */
    async sendByEvent(
        mobile: string,
        eventKey: string,
        variables: string[] = [],
        type: string = 'SYSTEM',
        refId?: string
    ): Promise<WhatsAppResponse> {
        // 1. Rate Limiting Safety Buffer (Except for OTPs which might need retry)
        if (eventKey !== 'REFERRAL_OTP') {
            const lastSent = this.lastSentTime.get(mobile)
            const now = Date.now()
            if (lastSent && (now - lastSent < this.RATE_LIMIT_MS)) {
                console.warn(`[WhatsApp] Rate limit hit for ${mobile}. Skipping ${eventKey}.`)
                return { success: false, error: 'Rate limit exceeded. Please wait.' }
            }
            this.lastSentTime.set(mobile, now)
        }

        await this.refreshConfigCache()
        let config = this.configCache.get(eventKey)

        // 2. Resilient Fallback for Critical Events (in case DB/Cache fails)
        if (!config && eventKey === 'REFERRAL_OTP') {
            config = { templateName: 'referral_otp', isEnabled: true, requiredVariablesCount: 1 }
        }



        if (!config) {
            console.warn(`[WhatsApp] No config found for event: ${eventKey}`)
            return { success: false, error: `Event ${eventKey} not configured` }
        }

        if (!config.isEnabled) {
            console.log(`[WhatsApp] Skipping ${eventKey} for ${mobile} (Disabled in settings)`)
            return { success: false, error: 'Event disabled' }
        }

        // 3. Variable Count Validation
        if (variables.length !== config.requiredVariablesCount) {
            console.error(`[WhatsApp] Variable mismatch for ${eventKey}. Expected ${config.requiredVariablesCount}, got ${variables.length}.`)
            // We still try to send but log a major error
        }

        // Global override check
        const settings = await prisma.notificationSettings.findFirst()
        if (!settings?.whatsappNotifications) {
            return { success: false, error: 'WhatsApp notifications are disabled globally' }
        }

        return this.sendTemplateMessage(mobile, config.templateName, variables, type, refId)
    }

    /**
     * Sends a template-based WhatsApp message
     */
    async sendTemplateMessage(
        mobile: string,
        templateName: string,
        variables: string[] = [],
        type: string = 'SYSTEM',
        refId?: string
    ): Promise<WhatsAppResponse> {
        if (!MSG91_AUTH_KEY || WHATSAPP_PROVIDER === 'mock') {
            return this.sendMock(mobile, templateName, variables, type)
        }

        try {
            const sanitizedMobile = this.sanitizeMobile(mobile)
            const integratedNumber = this.sanitizeMobile(MSG91_WHATSAPP_NUMBER)
            const url = `${MSG91_API_URL}/whatsapp/whatsapp-outbound-message/bulk/`

            console.log(`[WhatsApp] Sending to ${sanitizedMobile} via integrated number: ${integratedNumber || 'EMPTY'}`)
            console.log(`[WhatsApp] Using Namespace: ${MSG91_WHATSAPP_NAMESPACE}`)

            const components: any = {}
            variables.forEach((v, i) => {
                // MSG91 does NOT allow newlines in variable values — strip them
                const cleanValue = (v || '').replace(/[\r\n]+/g, ' ').trim()
                components[`body_${i + 1}`] = {
                    type: "text",
                    value: cleanValue
                }
            })

            const payload: any = {
                integrated_number: this.sanitizeMobile(MSG91_WHATSAPP_NUMBER),
                content_type: "template",
                payload: {
                    messaging_product: "whatsapp",
                    type: "template",
                    template: {
                        name: templateName,
                        namespace: MSG91_WHATSAPP_NAMESPACE,
                        language: {
                            code: "en",
                            policy: "deterministic"
                        },
                        to_and_components: [
                            {
                                to: [sanitizedMobile],
                                components
                            }
                        ]
                    }
                }
            }

            if (refId) {
                payload.CRQID = refId
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (response.ok && data.status === 'success') {
                const messageId = (data.message_id || data.request_id || '').toString()
                const trackingRef = refId || `AUT_${Date.now()}_${Math.random().toString(36).substring(7)}`
                const metadata = { 
                    messageId, 
                    sentAt: new Date().toISOString(),
                    apiResponse: data 
                }
                await this.logMessage(mobile, templateName, variables.join(', '), type, 'SENT', undefined, undefined, trackingRef, metadata)
                return { success: true, messageId }
            } else {
                const errorMsg = data.message || JSON.stringify(data) || 'WhatsApp API Error'
                await this.logMessage(mobile, templateName, variables.join(', '), type, 'FAILED', undefined, errorMsg, refId)
                console.error('WhatsApp API Error detailed:', JSON.stringify(data, null, 2))
                return { success: false, error: errorMsg }
            }
        } catch (error: any) {
            await this.logMessage(mobile, templateName, variables.join(', '), type, 'FAILED', undefined, error.message, refId)
            console.error('WhatsApp Service Exception:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Sends a template-based WhatsApp message to multiple recipients in a single API call
     */
    async sendBulkTemplateMessage(
        recipients: { mobile: string, variables: string[] }[],
        templateName: string,
        type: string = 'SYSTEM',
        refId?: string
    ): Promise<WhatsAppResponse> {
        if (!MSG91_AUTH_KEY || WHATSAPP_PROVIDER === 'mock') {
            const results = await Promise.all(recipients.map(r => this.sendMock(r.mobile, templateName, r.variables, type)))
            return results[0] // Return first success for consistent API
        }

        try {
            const url = `${MSG91_API_URL}/whatsapp/whatsapp-outbound-message/bulk/`
            const to_and_components = recipients.map(r => {
                const components: any = {}
                r.variables.forEach((v, i) => {
                    // MSG91 does NOT allow newlines in variable values — strip them
                    const cleanValue = (v || '').replace(/[\r\n]+/g, ' ').trim()
                    components[`body_${i + 1}`] = {
                        type: "text",
                        value: cleanValue
                    }
                })
                return {
                    to: [this.sanitizeMobile(r.mobile)],
                    components
                }
            })

            const payload: any = {
                integrated_number: this.sanitizeMobile(MSG91_WHATSAPP_NUMBER),
                content_type: "template",
                payload: {
                    messaging_product: "whatsapp",
                    type: "template",
                    template: {
                        name: templateName,
                        namespace: MSG91_WHATSAPP_NAMESPACE,
                        language: {
                            code: "en",
                            policy: "deterministic"
                        },
                        to_and_components
                    }
                }
            }

            if (refId) {
                payload.CRQID = refId
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (response.ok && data.status === 'success') {
                const messageId = (data.message_id || data.request_id || '').toString()
                // Log all recipients as sent with unique tracking refs if needed
                await Promise.all(recipients.map(r => {
                    const trackingRef = refId || `AUT_${Date.now()}_${Math.random().toString(36).substring(7)}`
                    return this.logMessage(r.mobile, templateName, r.variables.join(', '), type, 'SENT', messageId, undefined, trackingRef)
                }))
                return { success: true, messageId }
            } else {
                const errorMsg = data.message || JSON.stringify(data) || 'WhatsApp API Error'
                await Promise.all(recipients.map(r =>
                    this.logMessage(r.mobile, templateName, r.variables.join(', '), type, 'FAILED', undefined, errorMsg, refId)
                ))
                console.error('WhatsApp Bulk API Error detailed:', JSON.stringify(data, null, 2))
                return { success: false, error: errorMsg }
            }
        } catch (error: any) {
            await Promise.all(recipients.map(r =>
                this.logMessage(r.mobile, templateName, r.variables.join(', '), type, 'FAILED', undefined, error.message, refId)
            ))
            console.error('WhatsApp Bulk Service Exception:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Sends a notification only if the user has WhatsApp alerts enabled
     */
    async notifyIfEnabled(
        mobile: string,
        templateName: string,
        variables: string[] = [],
        type: string = 'SYSTEM',
        refId?: string
    ): Promise<WhatsAppResponse> {
        try {
            const settings = await prisma.notificationSettings.findFirst()
            if (!settings?.whatsappNotifications) {
                return { success: false, error: 'WhatsApp notifications are disabled globally' }
            }

            return this.sendTemplateMessage(mobile, templateName, variables, type, refId)
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Sends a free-form text message (use within 24h window of user message)
     */
    async sendFreeTextMessage(mobile: string, text: string, type: string = 'CHATBOT'): Promise<WhatsAppResponse> {
        if (!MSG91_AUTH_KEY || WHATSAPP_PROVIDER === 'mock') {
            console.log(`\n💬 [WHATSAPP MOCK TXT] To: ${mobile} | Message: ${text}\n`)
            await this.logMessage(mobile, null, text, type, 'SENT')
            return { success: true, messageId: 'mock-wa-txt-' + Date.now() }
        }

        try {
            const sanitizedMobile = this.sanitizeMobile(mobile)
            const url = `${MSG91_API_URL}/whatsapp/whatsapp-outbound-message/`

            const payload: any = {
                integrated_number: this.sanitizeMobile(MSG91_WHATSAPP_NUMBER),
                content_type: "text",
                payload: {
                    messaging_product: "whatsapp",
                    to: sanitizedMobile,
                    type: "text",
                    text: text
                }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (response.ok && data.status === 'success') {
                const messageId = (data.message_id || data.request_id || '').toString()
                const trackingRef = `AUT_${Date.now()}_${Math.random().toString(36).substring(7)}`
                await this.logMessage(mobile, null, text, type, 'SENT', messageId, undefined, trackingRef)
                return { success: true, messageId }
            } else {
                const errorMsg = data.message || 'WhatsApp API Error'
                await this.logMessage(mobile, null, text, type, 'FAILED', undefined, errorMsg)
                console.error('WhatsApp API Error:', data)
                return { success: false, error: errorMsg }
            }
        } catch (error: any) {
            await this.logMessage(mobile, null, text, type, 'FAILED', undefined, error.message)
            console.error('WhatsApp Service Exception:', error)
            return { success: false, error: error.message }
        }
    }

    private async logMessage(
        mobile: string,
        template: string | null,
        content: string,
        type: string,
        status: string,
        messageId?: string,
        error?: string,
        refId?: string,
        metadata?: any
    ) {
        try {
            await prisma.whatsAppLog.create({
                data: {
                    mobile,
                    template,
                    content,
                    type,
                    status,
                    errorMessage: error || null,
                    refId: refId || null,
                    metadata: metadata || (messageId ? { messageId } : undefined)
                } as any
            })
        } catch (logErr) {
            console.error('Failed to log WhatsApp message to DB:', logErr)
        }
    }

    private async sendMock(mobile: string, template: string, vars: string[], type: string = 'SYSTEM'): Promise<WhatsAppResponse> {
        console.log(`\n💬 [WHATSAPP MOCK] To: ${mobile} | Template: ${template} | Type: ${type} | Vars: ${vars.join(', ')}\n`)
        await this.logMessage(mobile, template, vars.join(', '), type, 'SENT')
        return { success: true, messageId: 'mock-wa-' + Date.now() }
    }

    private sanitizeMobile(mobile: string): string {
        let sanitized = mobile.replace(/\D/g, '')
        if (sanitized.length === 10) {
            sanitized = '91' + sanitized
        } else if (sanitized.length > 10 && sanitized.startsWith('0')) {
            sanitized = '91' + sanitized.substring(1)
        }
        return sanitized
    }
}

export const whatsappService = new WhatsAppService()
