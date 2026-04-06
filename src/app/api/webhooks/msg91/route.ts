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
        // Log payload structure for debugging (if we could see logs)
        if (process.env.NODE_ENV === 'development') {
            console.log('[MSG91 Webhook] Payload:', JSON.stringify(body, null, 2))
        }

        const events = Array.isArray(body) ? body : [body]

        for (const event of events) {
            // MSG91 sends varied field names - check ALL possibilities (case-insensitive)
            const rawId = event.CRQID || event.crqid || event.Crqid || 
                          event.request_id || event.requestId || 
                          event.custom_ref || event.ref_id || 
                          event.externalId || event.messageId || 
                          event.wamid || event.id

            const rawStatus = event.status || event.eventName || event.event || event.state || ''
            const status = rawStatus.toUpperCase()
            const rawMobile = event.mobile || event.customerNumber || event.destination || event.recipient_number || event.to || event.receiver
            const error = event.error || event.reason || event.message || null

            // Normalize mobile: remove +, remove 91 prefix if it exists
            const mobile = rawMobile ? rawMobile.toString().replace(/^\+/, '').replace(/^91/, '').trim() : ''

            console.log(`[MSG91 Webhook] Extracted: ID=${rawId}, Status=${status}, Mobile=${mobile}`)

            if (!rawId && !mobile) {
                console.warn('[MSG91 Webhook] Missing BOTH ID and Mobile. Skipping event.')
                continue
            }

            const refStr = rawId ? rawId.toString().trim() : ''
            const normalizedStatus = status === 'DELIVERED' || status === 'DELIVERY' || status === 'COMPLETED' ? 'DELIVERED' 
                : (status === 'READ' ? 'READ' : (status === 'SENT' ? 'SENT' : status))

            // --- 1. Universal Update for WhatsAppLog (Unified Feed) ---
            // RACE CONDITION FIX: MSG91 fires webhooks so fast, they often beat our background 
            // database inserts. If not found, wait and retry up to 3 times (total 5 seconds).
            let log: any = null;
            
            for (let retry = 0; retry < 4; retry++) {
                // First try to find by refId directly (our generated AUT_... ID)
                if (refStr && refStr !== 'undefined') {
                    log = await prisma.whatsAppLog.findFirst({
                        where: { 
                            refId: refStr,
                            OR: [
                                { mobile: mobile },
                                { mobile: '91' + mobile }
                            ].filter(c => c.mobile !== '')
                        },
                        orderBy: { createdAt: 'desc' }
                    })
                }

                // SECONDARY FALLBACK: Match by mobile number AND recent timestamp
                // This is crucial if MSG91 only returns a internal message_id (wamid) 
                // and omits our CRQID in the callback.
                if (!log && mobile) {
                    const recentLogs = await prisma.whatsAppLog.findMany({
                        where: {
                            OR: [
                                { mobile: mobile },
                                { mobile: '91' + mobile }
                            ],
                            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h window
                        },
                        take: 5,
                        orderBy: { createdAt: 'desc' }
                    })
                    
                    // Priority 1: Match by exact messageId if we stored it in metadata
                    log = recentLogs.find((l: any) => l.metadata?.messageId === refStr || l.metadata?.request_id === refStr)
                    
                    // Priority 2: Match by prefix (e.g. if we have a batch ID)
                    if (!log && refStr) {
                        log = recentLogs.find((l: any) => l.refId && refStr.startsWith(l.refId))
                    }

                    // Priority 3: Fallback to the absolute most recent log for this mobile
                    if (!log) {
                        log = recentLogs[0]
                    }
                }
                
                if (log) break;
                // Exponential backoff or simple delay
                await new Promise(r => setTimeout(r, 1200));
            }

            if (log) {
                const currentMetadata = (log.metadata as any) || {}
                const updatedMetadata = {
                    ...currentMetadata,
                    [`${status.toLowerCase()}At`]: new Date().toISOString(),
                    lastWebhookEvent: event // Store the FULL RAW EVENT in metadata for diagnostics
                }

                await prisma.whatsAppLog.update({
                    where: { id: log.id },
                    data: {
                        status: normalizedStatus,
                        metadata: updatedMetadata,
                        errorMessage: error || log.errorMessage
                    } as any
                })
                console.log(`[MSG91 Webhook] Updated WhatsAppLog ${log.id} to ${normalizedStatus}`)
            } else {
                console.warn(`[MSG91 Webhook] NO MATCH FOUND for: Mobile=${mobile}, Ref=${refStr}. Skipping campaign logic.`)
            }

            // Determine the true reference string for campaign logic
            const actualRefStr = log?.refId || refStr

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

            // WAMID FALLBACK: For bulk sends, MSG91 fires delivery callbacks with the
            // individual per-message wamid, NOT our custom CRQID. So we look up the
            // recipient by mobile number to find which campaign they belong to.
            let recipient: any = null
            if (!campaignId && mobile && (refStr.startsWith('wamid.') || refStr.startsWith('camp_') || refStr.startsWith('crq_'))) {
                recipient = await (prisma as any).campaignRecipient.findFirst({
                    where: {
                        OR: [{ mobile: mobile }, { mobile: '91' + mobile }],
                        sentAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } // 48h window
                    },
                    orderBy: { sentAt: 'desc' }
                })
                if (recipient) {
                    campaignId = recipient.campaignId
                    console.log(`[MSG91 Webhook] WAMID/Camp fallback: found campaign ${campaignId} for mobile ${mobile}`)
                }
            }

            if (!campaignId) {
                console.warn('[MSG91 Webhook] Could not determine campaign ID from ref:', actualRefStr)
                continue
            }

            // Build dynamic where clause to satisfy TypeScript strict requirements
            const campaignLogWhere: any = {};
            if (actualRefStr.startsWith('camp_')) {
                // If refStr is camp_30_123_0, strip the final tag to get the batch refId
                const parts = actualRefStr.split('_');
                const batchRef = parts.slice(0, 3).join('_');
                
                campaignLogWhere.OR = [
                    { refId: batchRef },
                    { refId: { startsWith: batchRef } },
                    { campaignId: campaignId }
                ];
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

                // ✅ EXPERT FINAL SYNC: Update the Individual Activity Log (WhatsAppLog)
                // This ensures the dashboard UI shows "DELIVERED" checkmarks for this specific student.
                if (mobile) {
                    // Normalize mobile for lookup
                    const cleanMobile = mobile.replace(/\D/g, '').slice(-10)
                    
                    // Match by either exact refId OR mobile within local time window
                    await prisma.whatsAppLog.updateMany({
                        where: {
                            mobile: { contains: cleanMobile },
                            OR: [
                                { refId: actualRefStr },
                                { refId: { startsWith: actualRefStr.split('_').slice(0, 3).join('_') } }, // Match parent batch
                                { createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } } // Within last 12h
                            ]
                        },
                        data: {
                            status: normalizedStatus,
                            errorMessage: error ? error.toString() : undefined,
                            metadata: {
                                ...(normalizedStatus === 'DELIVERED' ? { deliveredAt: new Date().toISOString() } : {}),
                                ...(normalizedStatus === 'READ' ? { readAt: new Date().toISOString() } : {}),
                                providerResponse: log
                            } as any
                        }
                    }).catch((e: any) => console.error('[MSG91 Webhook] Individual WhatsAppLog update error:', e.message))

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
