import prisma from '../src/lib/prisma'

async function main() {
    // 1. Check the CampaignLog refId for campaign 29
    const log = await prisma.campaignLog.findFirst({
        where: { campaignId: 29 },
        orderBy: { runAt: 'desc' }
    })
    console.log('\n=== CampaignLog #53 ===')
    console.log(`refId stored   : "${(log as any)?.refId}"`)
    console.log(`whatsappSent   : ${log?.whatsappSent}`)
    console.log(`whatsappDelivered: ${log?.whatsappDelivered}`)
    console.log(`whatsappRead   : ${log?.whatsappRead}`)

    // 2. Check if webhook-updated WhatsApp logs exist (DELIVERED/READ status for CAMPAIGN type)
    const deliveredLogs = await prisma.whatsAppLog.count({
        where: {
            type: 'CAMPAIGN',
            status: { in: ['DELIVERED', 'READ'] },
            createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } // last 12h
        }
    })
    console.log(`\n=== WhatsApp Log Delivery Report (last 12h) ===`)
    console.log(`CAMPAIGN logs with DELIVERED/READ status: ${deliveredLogs}`)

    // 3. Check recent WhatsApp logs for campaign type
    const recent = await prisma.whatsAppLog.findMany({
        where: {
            type: 'CAMPAIGN',
            createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, mobile: true, status: true, refId: true, createdAt: true }
    })
    console.log('\nRecent CAMPAIGN WhatsApp logs:')
    for (const r of recent) {
        console.log(`  #${r.id} | ${r.mobile} | ${r.status} | refId: ${r.refId} | ${new Date(r.createdAt).toLocaleString('en-IN')}`)
    }

    // 4. Check if webhook has been HIT at all today (look for any delivery reports)
    const anyDelivered = await prisma.whatsAppLog.count({
        where: {
            status: { in: ['DELIVERED', 'READ'] },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
    })
    console.log(`\nTotal webhook delivery updates received (all types, last 24h): ${anyDelivered}`)

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
