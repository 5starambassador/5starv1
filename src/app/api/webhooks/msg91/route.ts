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
        console.log('[MSG91 Webhook] Full Payload:', JSON.stringify(body, null, 2))

        const events = Array.isArray(body) ? body : [body]

        for (const event of events) {
            // MSG91 sends varied field names for references
            const rawId = event.CRQID || event.custom_ref || event.ref_id || event.externalId
            const status = event.status ? event.status.toUpperCase() : ''
            const rawMobile = event.mobile || event.customerNumber || event.destination

            // Normalize mobile: remove +, remove 91 prefix if it exists
            const mobile = rawMobile ? rawMobile.toString().replace(/^\+/, '').replace(/^91/, '') : ''

            console.log(`[MSG91 Webhook] Extracted: ID=${rawId}, Status=${status}, Mobile=${mobile}`)

            if (!rawId) {
                console.warn('[MSG91 Webhook] Missing Campaign Reference ID. Event:', JSON.stringify(event))
                continue
            }

            const campaignId = parseInt(rawId.toString())
            if (isNaN(campaignId)) {
                console.error('[MSG91 Webhook] Invalid numeric ID:', rawId)
                continue
            }

            // Status Map for normalization
            const normalizedStatus = status === 'DELIVERED' || status === 'DELIVERY' ? 'DELIVERED' : status

            if (normalizedStatus === 'DELIVERED' || normalizedStatus === 'READ') {
                const latestLog = await prisma.campaignLog.findFirst({
                    where: { campaignId: campaignId },
                    orderBy: { runAt: 'desc' }
                })

                if (latestLog) {
                    const updateData: any = {}
                    if (normalizedStatus === 'DELIVERED') updateData.whatsappDelivered = { increment: 1 }
                    if (normalizedStatus === 'READ') updateData.whatsappRead = { increment: 1 }

                    await prisma.campaignLog.update({
                        where: { id: latestLog.id },
                        data: updateData
                    })

                    // Update recipient status with normalized mobile matching
                    if (mobile) {
                        // We check for both exactly mobile and mobile with prefix in DB
                        await (prisma as any).campaignRecipient.updateMany({
                            where: {
                                campaignId: campaignId,
                                mobile: { contains: mobile }, // More flexible matching
                                channel: 'WHATSAPP'
                            },
                            data: {
                                status: normalizedStatus,
                                [normalizedStatus === 'DELIVERED' ? 'deliveredAt' : 'readAt']: new Date()
                            }
                        }).catch((e: any) => console.error('[MSG91 Webhook] Recipient update error:', e.message))
                    }
                } else {
                    console.warn(`[MSG91 Webhook] CampaignLog not found for ID: ${campaignId}`)
                }
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('MSG91 Webhook Exception:', error)
        return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 })
    }
}
