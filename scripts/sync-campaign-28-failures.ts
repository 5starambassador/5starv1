import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const campaignId = 28;
    const refId = 'camp_28_1774921776848';

    console.log(`🚀 Starting backfill for Campaign #${campaignId}...`);

    // 1. Fetch all FAILED WhatsApp logs for this run
    const failedLogs = await prisma.whatsAppLog.findMany({
        where: {
            refId,
            status: 'FAILED'
        },
        select: {
            mobile: true,
            metadata: true
        }
    });

    console.log(`🔍 Found ${failedLogs.length} failed messages in WhatsAppLog.`);

    if (failedLogs.length === 0) {
        console.log('✅ No failures to sync.');
        return;
    }

    let updatedCount = 0;
    let skipCount = 0;

    // 2. Iterate and update CampaignRecipient
    for (const log of failedLogs) {
        const mobile = log.mobile;
        const error = (log.metadata as any)?.moEngageErrorCode || (log.metadata as any)?.reason || '7004';

        // Update the recipient record
        const updateResult = await (prisma as any).campaignRecipient.updateMany({
            where: {
                campaignId,
                mobile,
                channel: 'WHATSAPP',
                status: 'SENT' // Only update if still in SENT state to be safe
            },
            data: {
                status: 'FAILED',
                errorCode: `Error Code: ${error} (Undeliverable)`
            }
        });

        if (updateResult.count > 0) {
            updatedCount += updateResult.count;
        } else {
            // Check if it's already updated or mobile format is different
            skipCount++;
        }
    }

    console.log(`✅ Backfill complete.`);
    console.log(`   - Recipient Records Updated: ${updatedCount}`);
    console.log(`   - Records Skipped (already updated or no match): ${skipCount}`);
}

run()
    .catch(e => console.error('❌ Backfill Error:', e))
    .finally(() => prisma.$disconnect());
