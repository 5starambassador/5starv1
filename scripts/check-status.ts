import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Checking for ANY processing or scheduled campaigns...");

    const activeLogs = await prisma.campaignLog.findMany({
        where: { status: 'PROCESSING' }
    });
    console.log('Processing Logs:', activeLogs.length);

    const activeCampaigns = await prisma.campaign.findMany({
        where: { status: { in: ['PROCESSING', 'SCHEDULED', 'ACTIVE'] } } // "ACTIVE" is normally fine but wait, if it's stuck? Wait, Campaign doesn't have PROCESSING.
    });
    console.log('Processing/Scheduled Campaigns:', activeCampaigns.filter(c => c.status === 'SCHEDULED' || c.status === 'PROCESSING').length);

    console.log("Checking Jobs...");
    const stuckJobs = await (prisma as any).job.findMany({
        where: { status: { in: ['PENDING', 'PROCESSING'] } }
    });
    console.log('Stuck/Pending Jobs:', stuckJobs.length);
}

main().finally(() => prisma.$disconnect());
