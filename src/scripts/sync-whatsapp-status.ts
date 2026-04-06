import 'dotenv/config'
import prisma from '../lib/prisma'
const fetch = require('node-fetch')

/**
 * 🕵️ WHATSAPP GLOBAL STATUS RECONCILER
 * This script scans ALL "SENT" messages from today and synchronizes 
 * them directly with MSG91 for 100% audit accuracy.
 */
async function syncAllToday() {
    const AUTH_KEY = process.env.MSG91_WHATSAPP_AUTH_KEY || "485538ATG9yVd1C69a4475aP1"
    const API_URL = "https://control.msg91.com/api/v5/whatsapp/report"

    console.log(`\n🚀 [Expert Global Sync] Starting reconciliation for ALL messages from the last 12 hours...`)

    try {
        // 1. Find ALL messages stuck in 'SENT' from the last 12 hours
        const logs = await prisma.whatsAppLog.findMany({
            where: {
                status: 'SENT',
                createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
            }
        })

        if (logs.length === 0) {
            console.log("✅ No stuck messages found in the current window.")
            return
        }

        console.log(`📦 Found ${logs.length} messages to check. Readiing MSG91 reports...`)

        // Group by batch for CampaignLog updates
        const campaignUpdates: Record<number, { delivered: number, read: number }> = {}

        for (const log of logs) {
            const ref = log.refId || ''
            const reportUrl = `${API_URL}?requestId=${ref}`
            
            try {
                const response = await fetch(reportUrl, {
                    headers: { 'authkey': AUTH_KEY }
                })
                const data: any = await response.json()
                
                if (data && data.status === 'success' && data.data) {
                    const report = data.data
                    const newStatus = report.status?.toUpperCase()

                    if (newStatus && newStatus !== 'SENT') {
                        console.log(`✅ MATCH! ${log.mobile} is ${newStatus}`)
                        
                        // Update individual log
                        await prisma.whatsAppLog.update({
                            where: { id: log.id },
                            data: { status: newStatus }
                        })

                        // Track campaign stats for bulk update
                        if (log.refId?.startsWith('camp_')) {
                            const campaignId = parseInt(log.refId.split('_')[1])
                            if (!isNaN(campaignId)) {
                                if (!campaignUpdates[campaignId]) campaignUpdates[campaignId] = { delivered: 0, read: 0 }
                                if (newStatus === 'DELIVERED') campaignUpdates[campaignId].delivered++
                                if (newStatus === 'READ') campaignUpdates[campaignId].read++
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error(`⚠️ Request failed for ${log.mobile}:`, err.message)
            }
            await new Promise(r => setTimeout(r, 100)) // Safety delay
        }

        // 2. Final Step: Bulk update the Campaign Dashboard stats
        for (const [campaignId, stats] of Object.entries(campaignUpdates)) {
            console.log(`📊 Finalizing Dashboard for Campaign #${campaignId}: +${stats.delivered} Delivered`)
            await (prisma as any).campaignLog.updateMany({
                where: { campaignId: parseInt(campaignId) },
                data: {
                    whatsappDelivered: { increment: stats.delivered },
                    whatsappRead: { increment: stats.read }
                }
            })
        }

        console.log("\n🏁 [Expert Global Sync] Complete. Live Site Statuses have been Updated! ✅")

    } catch (error: any) {
        console.error("❌ Sync Error:", error.message)
    }
}

syncAllToday().then(() => process.exit(0))
