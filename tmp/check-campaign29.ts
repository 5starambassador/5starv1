import prisma from '../src/lib/prisma'

async function main() {
    // Campaign #29 = Referral follow-up 02
    const log = await prisma.campaignLog.findFirst({
        where: { campaignId: 29 },
        orderBy: { runAt: 'desc' }
    })

    console.log('\n=== CAMPAIGN #29 — Referral follow-up 02 ===')
    if (!log) { console.log('No dispatch logs found.'); await prisma.$disconnect(); return }

    console.log(`\nLatest Dispatch Log #${log.id}:`)
    console.log(`  Status         : ${log.status}`)
    console.log(`  Run At         : ${new Date(log.runAt).toLocaleString('en-IN')}`)
    console.log(`  Total Recipients: ${log.recipientCount}`)
    console.log(`  WhatsApp Sent  : ${log.whatsappSent}`)
    console.log(`  WhatsApp Delivered: ${log.whatsappDelivered}`)
    console.log(`  WhatsApp Read  : ${log.whatsappRead}`)
    console.log(`  WhatsApp Failed: ${log.whatsappFailed}`)
    console.log(`  Overall Failed : ${log.failedCount}`)
    if (log.errorLog) console.log(`  Error Log      : ${JSON.stringify(log.errorLog)}`)

    // Recipient status breakdown
    const stats = await prisma.campaignRecipient.groupBy({
        by: ['status'],
        where: { campaignId: 29 },
        _count: { status: true }
    })
    console.log('\n--- Recipient Status Breakdown ---')
    for (const s of stats) console.log(`  ${s.status}: ${s._count.status}`)

    // Show failed recipients
    const failed = await prisma.campaignRecipient.findMany({
        where: { campaignId: 29, status: 'FAILED' },
        select: { mobile: true, status: true, errorCode: true, sentAt: true }
    })
    console.log(`\n--- Failed Recipients (${failed.length}) ---`)
    for (const f of failed) {
        console.log(`  Mobile: ${f.mobile} | ErrorCode: ${f.errorCode || 'none'} | SentAt: ${new Date(f.sentAt).toLocaleString('en-IN')}`)
    }

    // Delivery rate analysis
    const totalSent = log.whatsappSent
    const delivered = log.whatsappDelivered
    const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0'
    console.log(`\n--- Analysis ---`)
    console.log(`  Delivery Rate  : ${deliveryRate}% (${delivered}/${totalSent})`)
    if (delivered === 0 && totalSent > 0) {
        const hoursSince = (Date.now() - new Date(log.runAt).getTime()) / (1000 * 60 * 60)
        console.log(`  Time Since Dispatch: ${hoursSince.toFixed(1)} hours ago`)
        if (hoursSince < 24) {
            console.log(`  ℹ️  Delivery receipts from MSG91 arrive via webhook — may still be processing`)
        } else {
            console.log(`  ⚠️  No deliveries after ${hoursSince.toFixed(0)}h — webhook may not be firing`)
        }
    }

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
