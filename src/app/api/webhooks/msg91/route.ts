import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * MSG91 Webhook Handler
 * Receives 'delivery' and 'read' events.
 * Updates CampaignLog based on 'CRQID' which contains our campaignLog ID (or campaign ID).
 * 
 * Note: MSG91 sends an array of items in the payload.
 */

export async function POST(request: Request) {
    try {
        // SECURITY: Check for webhook secret/authkey to prevent spoofing
        const authKey = request.headers.get('authkey') || new URL(request.url).searchParams.get('secret')
        const EXPECTED_SECRET = process.env.MSG91_WEBHOOK_SECRET

        if (EXPECTED_SECRET && authKey !== EXPECTED_SECRET) {
            console.error('❌ [MSG91 Webhook] Unauthorized access attempt')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        console.log('🚀 [MSG91 Webhook] HIT at:', new Date().toISOString())
        console.log('[MSG91 Webhook] Payload:', JSON.stringify(body, null, 2))

        const events = Array.isArray(body) ? body : [body]

        for (const event of events) {
            // MSG91 sends varied field names for references
            const rawId = event.CRQID || event.custom_ref || event.ref_id || event.externalId
            const status = event.status ? event.status.toUpperCase() : ''
            const rawMobile = event.mobile || event.customerNumber || event.destination
            const error = event.error || event.reason || event.message || null

            // Normalize mobile: remove +, remove 91 prefix if it exists
            const mobile = rawMobile ? rawMobile.toString().replace(/^\+/, '').replace(/^91/, '') : ''

            console.log(`[MSG91 Webhook] Extracted: ID=${rawId}, Status=${status}, Mobile=${mobile}, Error=${error}`)

            if (!rawId) {
                console.warn('[MSG91 Webhook] Missing Reference ID. Event:', JSON.stringify(event))
                continue
            }

            const refStr = rawId.toString()
            const normalizedStatus = status === 'DELIVERED' || status === 'DELIVERY' ? 'DELIVERED' 
                : (status === 'READ' ? 'READ' : status)

            // --- 1. Universal Update for WhatsAppLog (Unified Feed) ---
            // We update for ANY status update now, not just success
            const log = await prisma.whatsAppLog.findFirst({
                where: {
                    refId: refStr,
                    ...(refStr.startsWith('AUT_') ? {} : { mobile: mobile })
                },
                orderBy: { createdAt: 'desc' }
            })

            if (log) {
                const currentMetadata = (log.metadata as any) || {}
                const updatedMetadata = {
                    ...currentMetadata,
                    [`${status.toLowerCase()}At`]: new Date().toISOString(),
                    lastStatusDetails: event
                }

                await prisma.whatsAppLog.update({
                    where: { id: log.id },
                    data: {
                        status: normalizedStatus,
                        errorMessage: error ? error.toString() : log.errorMessage,
                        metadata: updatedMetadata
                    } as any
                })
                console.log(`[MSG91 Webhook] Updated WhatsAppLog ${log.id} to ${normalizedStatus}`)
            }

            // --- 2. Campaign Specific Logic ---
            if (refStr.startsWith('AUT_')) {
                continue // Skip campaign-specific processing for automation messages
            }

            const campaignId = parseInt(refStr)
            if (isNaN(campaignId)) {
                console.error('[MSG91 Webhook] Invalid numeric ID:', rawId)
                continue
            }

            // Update recipient status for ALL incoming status changes
            const latestLog = await prisma.campaignLog.findFirst({
                where: { campaignId: campaignId },
                orderBy: { runAt: 'desc' }
            })

            if (latestLog) {
                const updateData: any = {}
                if (normalizedStatus === 'DELIVERED') updateData.whatsappDelivered = { increment: 1 }
                if (normalizedStatus === 'READ') updateData.whatsappRead = { increment: 1 }
                if (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED') updateData.failedCount = { increment: 1 }

                await prisma.campaignLog.update({
                    where: { id: latestLog.id },
                    data: updateData
                })

                // Update recipient status with normalized mobile matching
                if (mobile) {
                    await (prisma as any).campaignRecipient.updateMany({
                        where: {
                            campaignId: campaignId,
                            mobile: mobile,
                            channel: 'WHATSAPP'
                        },
                        data: {
                            status: normalizedStatus,
                            errorMessage: error ? error.toString() : undefined,
                            [normalizedStatus === 'DELIVERED' ? 'deliveredAt' : (normalizedStatus === 'READ' ? 'readAt' : 'updatedAt')]: new Date()
                        }
                    }).catch((e: any) => console.error('[MSG91 Webhook] Recipient update error:', e.message))
                }
            } else {
                console.warn(`[MSG91 Webhook] CampaignLog not found for ID: ${campaignId}`)
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('MSG91 Webhook Exception:', error)
        return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 })
    }
}
