import prisma, { withRetry } from '@/lib/prisma'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-service'

// Keys to be scrubbed for PII protection
const SENSITIVE_KEYS = [
    'password', 'accountNumber', 'aadharNo', 'ifscCode',
    'mobileNumber', 'otp', 'token', 'bankAccountDetails',
    'cvv', 'card', 'pin'
]

function scrubMetadata(data: any): any {
    if (!data || typeof data !== 'object') return data

    // Create a copy to avoid mutating the original
    const scrubbed = Array.isArray(data) ? [...data] : { ...data }

    for (const key in scrubbed) {
        // Case-insensitive check for sensitive keys
        const isSensitive = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))

        if (isSensitive) {
            scrubbed[key] = '***MASKED***'
        } else if (typeof scrubbed[key] === 'object') {
            scrubbed[key] = scrubMetadata(scrubbed[key])
        }
    }
    return scrubbed
}

// Define critical actions that should trigger a Discord alert
const CRITICAL_ACTIONS = ['FAILED_LOGIN', 'DELETE', 'BAN', 'EXPORT', 'UPDATE_ROLE', 'UNAUTHORIZED_ACCESS', 'SECURITY_ALERT']
const CRITICAL_MODULES = ['SECURITY', 'AUTH', 'SETTINGS', 'FINANCE']

async function sendToDiscord(payload: {
    action: string,
    module: string,
    description: string,
    actorName: string,
    ip: string,
    requestId: string
}) {
    const webhookUrl = process.env.DISCORD_AUDIT_WEBHOOK
    if (!webhookUrl) return

    try {
        const isCritical = CRITICAL_ACTIONS.some(a => payload.action.toUpperCase().includes(a)) ||
            CRITICAL_MODULES.includes(payload.module.toUpperCase())

        // Create a pretty embed for Discord
        const embed = {
            title: `${isCritical ? '⚠️' : 'ℹ️'} Audit Alert: ${payload.action}`,
            color: isCritical ? 0xff0000 : 0x00ff00, // Red for critical, Green for info
            fields: [
                { name: 'Module', value: payload.module, inline: true },
                { name: 'Actor', value: payload.actorName, inline: true },
                { name: 'Description', value: payload.description },
                { name: 'IP Address', value: payload.ip, inline: true },
                { name: 'Request ID', value: `\`${payload.requestId}\``, inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: '5-Star Ambassador Audit Bot' }
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        })
    } catch (error) {
        console.error('Failed to send Discord alert:', error)
    }
}

async function sendToGoogleSheets(payload: {
    action: string,
    module: string,
    description: string,
    actorName: string,
    ip: string,
    requestId: string
}) {
    const googleAppUrl = process.env.GOOGLE_SHEETS_AUDIT_URL
    if (!googleAppUrl) return

    // Limit the time we wait for external logging to avoid hanging background processes
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
        await fetch(googleAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'follow',
            signal: controller.signal
        })
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.warn('Google Sheets archive timed out (5s) - skipping background logging')
        } else {
            console.error('Failed to archive log to Google Sheets:', error.message || error)
        }
    } finally {
        clearTimeout(timeoutId)
    }
}

export async function logAction(
    action: string,
    module: string,
    description: string,
    targetId?: string | null,
    actorId?: string | number | null | undefined, // support legacy calls passing null
    metadata?: any
) {
    try {
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'
        const requestId = headersList.get('x-request-id') || 'unknown'

        let adminId: number | undefined = undefined
        let userId: number | undefined = undefined
        let actorName = 'System'

        // 1. Try to use explicit actorId if provided (handling number/string conversion)
        if (actorId) {
            if (metadata?.isUser) userId = Number(actorId)
            else if (metadata?.isAdmin) adminId = Number(actorId)
        }

        // 2. Auto-detect if not explicitly set
        if (!adminId && !userId) {
            const currentUser = await getCurrentUser()
            if (currentUser) {
                if ('adminId' in currentUser) {
                    adminId = (currentUser as any).adminId
                    actorName = (currentUser as any).adminName || 'Admin'
                } else if ('userId' in currentUser) {
                    userId = (currentUser as any).userId
                    actorName = (currentUser as any).fullName || 'User'
                }
            }
        }

        // Apply PII scrubbing and inject requestId into metadata
        const processedMetadata = {
            ...(metadata ? scrubMetadata(metadata) : {}),
            requestId
        }

        // Create the DB record with retry to ensure we don't drop audit logs during pool congestion
        await withRetry(async () => {
            await (prisma.activityLog as any).create({
                data: {
                    action,
                    module,
                    description,
                    targetId: targetId || undefined,
                    adminId,
                    userId,
                    metadata: processedMetadata,
                    ipAddress: ip,
                    userAgent: userAgent
                }
            })
        }, 3, 500).catch(err => console.error('Persistent failure to log activity to DB:', err))

        // Fire-and-forget Discord alert for critical actions
        // Use a background task or just don't await to avoid blocking response
        const isCritical = CRITICAL_ACTIONS.some(a => action.toUpperCase().includes(a)) ||
            CRITICAL_MODULES.includes(module.toUpperCase())

        if (isCritical) {
            sendToDiscord({
                action,
                module,
                description,
                actorName,
                ip,
                requestId
            }).catch(err => console.error('Discord background alert failed:', err))
        }

        // Always archive to Google Sheets (fire-and-forget)
        sendToGoogleSheets({
            action,
            module,
            description,
            actorName,
            ip,
            requestId
        }).catch(err => console.error('Google Sheets background archive failed:', err))

    } catch (error) {
        console.error('Failed to log activity:', error)
    }
}

// Specific helper for security-related anomalies
export async function logSecurityAlert(description: string, metadata?: any) {
    return logAction('SECURITY_ALERT', 'SECURITY', description, null, null, { ...metadata, isCritical: true })
}
