import { NextResponse } from 'next/server'
import { chatbotService } from '@/lib/chatbot-service'
import { whatsappService } from '@/lib/whatsapp-service'

/**
 * WhatsApp Webhook Endpoint (MSG91)
 * URL: https://your-domain.com/api/webhooks/whatsapp
 */
export async function POST(req: Request) {
    try {
        // SECURITY: Check for webhook secret to prevent spoofing
        const authHeader = req.headers.get('Authorization') || new URL(req.url).searchParams.get('secret')
        const EXPECTED_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET

        if (EXPECTED_SECRET && authHeader !== EXPECTED_SECRET) {
            console.error('❌ [WhatsApp Webhook] Unauthorized access attempt')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const payload = await req.json()
        console.log('📬 [Webhook] Received WhatsApp Message:', JSON.stringify(payload, null, 2))

        // MSG91 Format (Likely):
        // { "mobile": "91...", "text": "...", "integrated_number": "..." }
        // or potentially nested under { "payload": { ... } }

        const mobile = payload.mobile || payload.payload?.mobile
        const text = payload.text || payload.payload?.text

        if (!mobile || !text) {
            console.warn('⚠️ [Webhook] Missing mobile or text in payload')
            return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 })
        }

        // Handle Logic & Log Inbound
        await Promise.all([
            chatbotService.handleIncomingMessage(mobile, text),
            whatsappService.logMessage(mobile, null, text, 'INBOUND', 'RECEIVED')
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('❌ [Webhook] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

/**
 * Handle GET for verification if needed
 */
export async function GET() {
    return NextResponse.json({ status: 'Webhook Active' })
}
