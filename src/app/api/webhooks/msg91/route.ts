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

        // Expected payload structure from MSG91 is usually an array of objects
        // or a single object wrapped in an array.
        // E.g. [ { requestId: "...", status: "DELIVERED", custom_ref: "...", ... } ]

        const events = Array.isArray(body) ? body : [body]

        // We process events in bulk if possible, or loop.
        // Since we need to update potentially different rows, a loop is fine for now.

        for (const event of events) {
            // Extract the custom reference ID we sent (CRQID)
            // It might be in 'CRQID', 'custom_ref', or similar depending on exact API version.
            // We used 'CRQID' in the payload.
            const campaignIdStr = event.CRQID || event.custom_ref || event.ref_id

            if (!campaignIdStr) continue

            const campaignId = parseInt(campaignIdStr)
            if (isNaN(campaignId)) continue

            const status = event.status ? event.status.toUpperCase() : ''

            // Map status to our counters
            if (status === 'DELIVERED') {
                // Update Delivered Count
                // We need to find the specific CampaignLog. 
                // Issue: We passed 'campaignId' as ref. 
                // So we should find the LATEST run for this campaign? 
                // Or, did we pass 'CampaignLog.id'? 
                // In campaign-dispatcher, we passed 'campaignId: number'. 
                // So we are updating the CampaignLog associated with that campaign.
                // Ideally we should have passed CampaignLog.id, but let's stick to CampaignId for now
                // and update the *latest* log or aggregate?

                // Better approach: Update the aggregate on the CampaignLog. 
                // Let's assume we update the *latest* active log or just finding one by campaignId.
                // Use findFirst with orderBy.

                const latestLog = await prisma.campaignLog.findFirst({
                    where: { campaignId: campaignId },
                    orderBy: { runAt: 'desc' }
                })

                if (latestLog) {
                    await prisma.campaignLog.update({
                        where: { id: latestLog.id },
                        data: { whatsappDelivered: { increment: 1 } }
                    })
                }
            } else if (status === 'READ') {
                // Update Read Count
                const latestLog = await prisma.campaignLog.findFirst({
                    where: { campaignId: campaignId },
                    orderBy: { runAt: 'desc' }
                })

                if (latestLog) {
                    await prisma.campaignLog.update({
                        where: { id: latestLog.id },
                        data: { whatsappRead: { increment: 1 } }
                    })
                }
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('MSG91 Webhook Error:', error)
        return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 })
    }
}
