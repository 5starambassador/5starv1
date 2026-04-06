import 'dotenv/config'
import prisma from '@/lib/prisma'

interface WhatsAppResponse {
    success: boolean
    messageId?: string
    error?: string
}

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_WHATSAPP_AUTH_KEY || ""
const MSG91_WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_NUMBER || ""
const MSG91_API_URL = process.env.MSG91_API_URL || "https://control.msg91.com/api/v5"
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
                const config = {
                    templateName: c.templateName,
                    isEnabled: c.isEnabled,
                    requiredVariablesCount: c.requiredVariablesCount
                }
                this.configCache.set(c.eventKey, config)
                this.configCache.set(c.templateName, config) // Also index by templateName for direct campaign lookups
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
        refId?: string,
        headerUrl?: string,
        buttonVariables: string[] = []
    ): Promise<WhatsAppResponse> {
        if (!MSG91_AUTH_KEY || WHATSAPP_PROVIDER === 'mock') {
            return this.sendMock(mobile, templateName, variables, type)
        }

        try {
            await this.refreshConfigCache()
            const sanitizedMobile = this.sanitizeMobile(mobile)
            const integratedNumber = this.sanitizeMobile(MSG91_WHATSAPP_NUMBER)
            const url = `${MSG91_API_URL}/whatsapp/whatsapp-outbound-message/bulk/`
            const trackingRef = refId || `AUT_${Date.now()}_${Math.random().toString(36).substring(7)}`

            const payload: any = {
                integrated_number: MSG91_WHATSAPP_NUMBER,
                content_type: "template",
                CRQID: trackingRef,
                payload: {
                    messaging_product: "whatsapp",
                    type: "template",
                    template: {
                        name: templateName,
                        namespace: MSG91_WHATSAPP_NAMESPACE,
                        language: {
                            policy: "deterministic",
                            code: "en"
                        },
                        to_and_components: [
                            {
                                 to: [this.sanitizeMobile(mobile)],
                                 components: this.prepareComponents(templateName, variables, headerUrl, buttonVariables),
                                 CRQID: trackingRef
                             }
                        ]
                    }
                }
            }

            console.log(`[WhatsApp] Sending SINGLE message to ${sanitizedMobile} via Proven Bulk API`)

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            
            // Diagnostic metadata for ALL outcomes
            const diagnosticMetadata = { 
                sentAt: new Date().toISOString(),
                apiPayload: payload,
                apiResponse: data 
            }

            if (response.ok && data.status === 'success') {
                const messageId = (data.message_id || data.request_id || '').toString()
                const metadata = { 
                    ...diagnosticMetadata,
                    messageId
                }
                await this.logMessage(mobile, templateName, variables.join(', '), type, 'SENT', messageId, undefined, trackingRef, metadata, headerUrl)
                return { success: true, messageId }
            } else {
                const errorMsg = data.message || JSON.stringify(data) || 'WhatsApp API Error'
                await this.logMessage(mobile, templateName, variables.join(', '), type, 'FAILED', undefined, errorMsg, trackingRef, diagnosticMetadata, headerUrl)
                console.error('WhatsApp API Error detailed:', JSON.stringify(data, null, 2))
                return { success: false, error: errorMsg }
            }
        } catch (error: any) {
            // Use refId from params or generate a fallback for the error log if trackingRef wasn't reached
            const errRef = refId || `ERR_${Date.now()}`
            await this.logMessage(mobile, templateName, variables.join(', '), type, 'FAILED', undefined, error.message, errRef, undefined, headerUrl)
            console.error('WhatsApp Service Exception:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Sends a template-based WhatsApp message to multiple recipients in a single API call.
     * Splitting into chunks of 100 for safety and to avoid API timeout/payload limits.
     */
    async sendBulkTemplateMessage(
        recipients: { mobile: string, variables: string[] }[],
        templateName: string,
        type: string = 'SYSTEM',
        refId?: string,
        headerUrl?: string,
        buttonVariables: { [mobile: string]: string[] } = {}
    ): Promise<WhatsAppResponse> {
        if (!MSG91_AUTH_KEY || WHATSAPP_PROVIDER === 'mock') {
            const results = await Promise.all(recipients.map(r => this.sendMock(r.mobile, templateName, r.variables, type)))
            return results[0]
        }

        try {
            await this.refreshConfigCache()

            // Filter out recipients with fundamentally invalid numbers that would result in `to: [""]`
            const validRecipients = recipients.filter(r => this.sanitizeMobile(r.mobile) !== '')

            if (validRecipients.length === 0) {
                return { success: false, error: 'No valid mobile numbers in batch' }
            }

            const CHUNK_SIZE = 10 // Expert-level safety Batching
            const url = `${MSG91_API_URL}/whatsapp/whatsapp-outbound-message/bulk/`
            let mainResponse: WhatsAppResponse = { success: true }
            
            // ✅ CRITICAL FIX: Generate a base batch reference if not provided
            const batchRefId = refId || `AUT_BATCH_${Date.now()}`

            console.log(`[WhatsApp] Starting Campaign Send: ${validRecipients.length} messages. Rate Limit: 3s delay per 10 messages.`)

            for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
                const chunk = validRecipients.slice(i, i + CHUNK_SIZE)
                
                const to_and_components = chunk.map((r, idx) => {
                    return {
                        to: [this.sanitizeMobile(r.mobile)],
                        components: this.prepareComponents(templateName, r.variables, headerUrl, buttonVariables[r.mobile]),
                        // Pass unique refId per recipient within the batch if possible, 
                        // or at least ensure the batch ID is shared.
                        CRQID: `${batchRefId}_${i + idx}`
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
                            language: { code: "en", policy: "deterministic" },
                            to_and_components
                        }
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
                
                // Diagnostic metadata (Shared across chunk members)
                const diagnosticMetadata = { 
                    sentAt: new Date().toISOString(),
                    apiPayload: payload,
                    apiResponse: data 
                }

                if (response.ok && data.status === 'success') {
                    const messageId = (data.message_id || data.request_id || '').toString()
                    await Promise.all(chunk.map((r, idx) => {
                        const trackingRef = `${batchRefId}_${i + idx}`
                        
                        // ✅ Log Sincerity: Log the variables exactly as they were prepared for the API
                        const preparedComponents = this.prepareComponents(templateName, r.variables, headerUrl, buttonVariables[r.mobile])
                        const preparedVars = Object.entries(preparedComponents)
                            .filter(([key, val]: [string, any]) => val.type === 'text' || val.type === 'url')
                            .map(([key, val]: [string, any]) => `[${key}]: ${val.value}`)
                            .join(', ')

                        const metadata = { ...diagnosticMetadata, messageId }
                        return this.logMessage(r.mobile, templateName, preparedVars, type, 'SENT', messageId, undefined, trackingRef, metadata, headerUrl)
                    }))
                    if (i === 0) mainResponse = { success: true, messageId }
                } else {
                    const errorMsg = data.message || JSON.stringify(data) || 'WhatsApp API Error'
                    await Promise.all(chunk.map((r, idx) =>
                        this.logMessage(r.mobile, templateName, r.variables.join(', '), type, 'FAILED', undefined, errorMsg, `${batchRefId}_${i + idx}`, diagnosticMetadata, headerUrl)
                    ))
                    console.error('WhatsApp Bulk API Error detailed:', JSON.stringify(data, null, 2))
                    if (i === 0) mainResponse = { success: false, error: errorMsg }
                }

                // Senior Expert Level Safety: 3 second delay between batches
                if (i + CHUNK_SIZE < validRecipients.length) {
                    await new Promise(r => setTimeout(r, 3000))
                }
            }

            return mainResponse
        } catch (error: any) {
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
    async sendFreeTextMessage(mobile: string, text: string, type: string = 'CHATBOT', refId?: string): Promise<WhatsAppResponse> {
        if (!MSG91_AUTH_KEY || WHATSAPP_PROVIDER === 'mock') {
            console.log(`\n💬 [WHATSAPP MOCK TXT] To: ${mobile} | Message: ${text}\n`)
            await this.logMessage(mobile, null, text, type, 'SENT')
            return { success: true, messageId: 'mock-wa-txt-' + Date.now() }
        }

        try {
            const sanitizedMobile = this.sanitizeMobile(mobile)
            const url = `${MSG91_API_URL}/whatsapp/whatsapp-outbound-message/`
            const trackingRef = refId || `AUT_TXT_${Date.now()}_${Math.random().toString(36).substring(7)}`

            // Winners format: Flat structure for MSG91 Session Messages
            const payload: any = {
                integrated_number: this.sanitizeMobile(MSG91_WHATSAPP_NUMBER),
                recipient_number: sanitizedMobile,
                content_type: "text",
                text: text,
                CRQID: trackingRef
            }
            console.log('[WhatsApp] Sending free-text payload:', JSON.stringify(payload))

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            
            const diagnosticMetadata = { 
                sentAt: new Date().toISOString(),
                apiPayload: payload,
                apiResponse: data 
            }

            if (response.ok && data.status === 'success') {
                const messageId = (data.message_id || data.request_id || '').toString()
                await this.logMessage(mobile, null, text, type, 'SENT', messageId, undefined, trackingRef, { ...diagnosticMetadata, messageId })
                return { success: true, messageId }
            } else {
                const errorMsg = data.message || 'WhatsApp API Error'
                await this.logMessage(mobile, null, text, type, 'FAILED', undefined, errorMsg, trackingRef, diagnosticMetadata)
                console.error('WhatsApp API Error:', data)
                return { success: false, error: errorMsg }
            }
        } catch (error: any) {
            const errRef = refId || `ERR_TXT_${Date.now()}`
            await this.logMessage(mobile, null, text, type, 'FAILED', undefined, error.message, errRef)
            console.error('WhatsApp Service Exception:', error)
            return { success: false, error: error.message }
        }
    }

    public async logMessage(
        mobile: string,
        template: string | null,
        content: string,
        type: string,
        status: string,
        messageId?: string,
        error?: string,
        refId?: string,
        metadata?: any,
        waHeaderUrl?: string
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
                    waHeaderUrl: waHeaderUrl || null,
                    refId: refId || null,
                    metadata: {
                        ...(metadata || {}),
                        messageId: messageId || (metadata?.messageId) || null,
                        loggedAt: new Date().toISOString()
                    } as any
                }
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

    private prepareComponents(templateName: string, variables: string[], headerUrl?: string, buttonVariables: string[] = []): any {
        const components: any = {}

        if (headerUrl && headerUrl.trim() !== '') {
            const url = encodeURI(headerUrl.trim())
            // Detect media type: Default to image, but switch to video/document based on extension
            const isVideo = url.match(/\.(mp4|mov|3gp|m4v|avi)$/i)
            const isDocument = url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i)
            const mediaType = isVideo ? "video" : isDocument ? "document" : "image"
            
            components[`header_1`] = { type: mediaType, value: url }
        }

        const config = this.configCache.get(templateName)
        
        // Strictly trim or pad to match requiredVariablesCount if known
        let finalVars = [...variables]
        if (config && config.requiredVariablesCount !== undefined) {
            if (finalVars.length > config.requiredVariablesCount) {
                finalVars = finalVars.slice(0, config.requiredVariablesCount)
            } else while (finalVars.length < config.requiredVariablesCount) {
                finalVars.push("") // Pad with empty strings if missing
            }
        }

        finalVars.forEach((v, i) => {
            const cleanValue = (v || '').toString().replace(/[\r\n]+/g, ' ').trim()
            components[`body_${i + 1}`] = { type: "text", value: cleanValue }
        })

        // 4. Button Variables (button_1, button_2, etc.)
        if (buttonVariables && buttonVariables.length > 0) {
            buttonVariables.forEach((v, i) => {
                const cleanValue = (v || '').toString().trim()
                if (cleanValue) {
                    components[`button_${i + 1}`] = { type: "text", value: cleanValue }
                }
            })
        }

        return components
    }

    private sanitizeMobile(mobile: string): string {
        if (!mobile) return ''
        let sanitized = mobile.toString().replace(/\D/g, '')
        
        // Basic validation: must be at least 10 digits
        if (sanitized.length < 10) return ''

        if (sanitized.length === 10) {
            return `91${sanitized}`
        } else if (sanitized.length > 10 && sanitized.startsWith('0')) {
            sanitized = '91' + sanitized.substring(1)
        }
        return sanitized
    }
}

export const whatsappService = new WhatsAppService()
