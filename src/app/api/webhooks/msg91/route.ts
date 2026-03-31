import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
            const rawId = event.CRQID || event.request_id || event.requestId || event.custom_ref || event.ref_id || event.externalId || event.messageId
            const rawStatus = event.status || event.eventName || event.event || ''
            const status = rawStatus.toUpperCase()
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
            // RACE CONDITION FIX: MSG91 fires webhooks so fast, they often beat our background 
            // database inserts. If not found, wait and retry up to 3 times (max 2 seconds).
            let log: any = null;
            
            for (let retry = 0; retry < 3; retry++) {
                // First try to find by refId directly
                log = await prisma.whatsAppLog.findFirst({
                    where: { refId: refStr },
                    orderBy: { createdAt: 'desc' }
                })

                // If MSG91 omitted the refId and returned the request_id, 
                // search recent logs by mobile and match inside the JSON metadata memory
                if (!log && mobile) {
                    const recentLogs = await prisma.whatsAppLog.findMany({
                        where: {
                            OR: [
                                { mobile: mobile },
                                { mobile: '91' + mobile }
                            ]
                        },
                        take: 30, // Increased scope for higher volume sends
                        orderBy: { createdAt: 'desc' }
                    })
                    log = recentLogs.find((l: any) => l.metadata && l.metadata.messageId === refStr) || null
                }
                
                if (log) break;
                // Wait 800ms before retrying to give the sending thread time to save to DB
                await new Promise(r => setTimeout(r, 800));
            }

            // Determine the true reference string. If MSG91 only sent request_id, 
            // we use the refId from the matched database log to find the campaign.
            const actualRefStr = log?.refId || refStr

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
                        metadata: updatedMetadata
                    } as any
                })
                console.log(`[MSG91 Webhook] Updated WhatsAppLog ${log.id} to ${normalizedStatus}`)
            }

            // --- 2. Campaign Specific Logic ---
            if (actualRefStr.startsWith('AUT_')) {
                continue // Skip campaign-specific processing for automation messages
            }

            let campaignId: number | null = null

            if (actualRefStr.startsWith('camp_')) {
                const parts = actualRefStr.split('_')
                campaignId = parseInt(parts[1])
            } else if (!isNaN(parseInt(actualRefStr))) {
                campaignId = parseInt(actualRefStr)
            }

            if (!campaignId && !actualRefStr.startsWith('camp_')) {
                console.warn('[MSG91 Webhook] Could not determine campaign ID from ref:', actualRefStr)
                continue
            }

            // Build dynamic where clause to satisfy TypeScript strict requirements
            const campaignLogWhere: any = {};
            if (actualRefStr.startsWith('camp_')) {
                campaignLogWhere.refId = actualRefStr;
            } else if (campaignId) {
                campaignLogWhere.campaignId = campaignId;
            }

            // Find the specific log by refId, or fall back to the latest log for this campaign
            const campaignLog = await prisma.campaignLog.findFirst({
                where: campaignLogWhere,
                orderBy: { runAt: 'desc' }
            })

            if (campaignLog) {
                const updateData: any = {}
                if (normalizedStatus === 'DELIVERED') updateData.whatsappDelivered = { increment: 1 }
                if (normalizedStatus === 'READ') updateData.whatsappRead = { increment: 1 }
                if (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED') updateData.failedCount = { increment: 1 }

                await prisma.campaignLog.update({
                    where: { id: campaignLog.id },
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
                            errorCode: error ? error.toString() : undefined,
                            ...(normalizedStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
                            ...(normalizedStatus === 'READ' ? { readAt: new Date() } : {})
                        }
                    }).catch((e: any) => console.error('[MSG91 Webhook] Recipient update error:', e.message))
                }
            } else {
                console.warn(`[MSG91 Webhook] CampaignLog not found for ID: ${campaignId}`)
            }
        }

        revalidatePath('/superadmin')
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('MSG91 Webhook Exception:', error)
        return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 })
    }
}
