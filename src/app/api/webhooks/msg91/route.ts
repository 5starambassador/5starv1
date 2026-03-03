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
        const body = await request.json()
        console.log('[MSG91 Webhook] Received Payload:', JSON.stringify(body, null, 2))

        const events = Array.isArray(body) ? body : [body]

        for (const event of events) {
            const campaignIdStr = event.CRQID || event.custom_ref || event.ref_id
            const status = event.status ? event.status.toUpperCase() : ''
            const mobile = event.mobile || event.customerNumber

            if (!campaignIdStr) {
                console.warn('[MSG91 Webhook] No CRQID found in event:', event.requestId || 'unknown')
                continue
            }

            const campaignId = parseInt(campaignIdStr)
            if (isNaN(campaignId)) {
                console.error('[MSG91 Webhook] Invalid campaignId:', campaignIdStr)
                continue
            }

            console.log(`[MSG91 Webhook] Processing ${status} for Campaign #${campaignId} (Mobile: ${mobile})`)

            if (status === 'DELIVERED' || status === 'READ') {
                const latestLog = await prisma.campaignLog.findFirst({
                    where: { campaignId: campaignId },
                    orderBy: { runAt: 'desc' }
                })

                if (latestLog) {
                    const updateData: any = {}
                    if (status === 'DELIVERED') updateData.whatsappDelivered = { increment: 1 }
                    if (status === 'READ') updateData.whatsappRead = { increment: 1 }

                    await prisma.campaignLog.update({
                        where: { id: latestLog.id },
                        data: updateData
                    })

                    // Also update the specific recipient status if available
                    if (mobile) {
                        await (prisma as any).campaignRecipient.updateMany({
                            where: {
                                campaignId: campaignId,
                                mobile: mobile,
                                channel: 'WHATSAPP'
                            },
                            data: {
                                status: status,
                                [status === 'DELIVERED' ? 'deliveredAt' : 'readAt']: new Date()
                            }
                        }).catch((e: any) => console.error('[MSG91 Webhook] Failed to update recipient status:', e.message))
                    }
                } else {
                    console.warn(`[MSG91 Webhook] No CampaignLog found for Campaign #${campaignId}`)
                }
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('MSG91 Webhook Exception:', error)
        return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 })
    }
}
