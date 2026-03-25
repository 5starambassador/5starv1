import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupStuckCampaigns() {
    console.log("Finding stuck campaigns...");

    const activeLogs = await prisma.campaignLog.findMany({
        where: { status: 'PROCESSING' }
    });

    if (activeLogs.length === 0) {
        console.log("No stuck campaigns found.");
        return;
    }

    for (const log of activeLogs) {
        console.log(`Resetting Campaign ID: ${log.campaignId}`);

        await prisma.campaignLog.updateMany({
            where: { id: log.id },
            data: { status: 'FAILED', errorLog: 'Stuck process cleaned up manually' } as any
        });

        await (prisma as any).job.updateMany({
            where: {
                type: 'CAMPAIGN_BATCH',
                status: { in: ['PENDING', 'PROCESSING'] },
                payload: { path: ['campaignId'], equals: log.campaignId }
            },
            data: { status: 'FAILED', error: 'Stuck process cleaned up manually' }
        });

        await prisma.campaign.updateMany({
            where: { id: log.campaignId },
            data: { status: 'DRAFT' } 
        });
    }

    console.log("Cleanup complete!");
}

cleanupStuckCampaigns()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
