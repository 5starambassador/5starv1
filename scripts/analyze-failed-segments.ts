import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
    const campaignId = 28;

    const recipients = await prisma.campaignRecipient.findMany({
        where: { campaignId },
        select: {
            status: true,
            role: true,
            campus: true
        }
    });

    const stats: any = {
        failed: { roles: {}, campuses: {} },
        successful: { roles: {}, campuses: {} }
    };

    recipients.forEach(r => {
        const group = r.status === 'FAILED' ? stats.failed : stats.successful;
        const role = r.role || 'Unknown';
        const campus = r.campus || 'Unknown';

        group.roles[role] = (group.roles[role] || 0) + 1;
        group.campuses[campus] = (group.campuses[campus] || 0) + 1;
    });

    console.log(`--- Campaign #28 Segment Analysis ---`);
    console.log(`\nFAILED recipients by Role:`, JSON.stringify(stats.failed.roles, null, 2));
    console.log(`SUCCESSFUL recipients by Role:`, JSON.stringify(stats.successful.roles, null, 2));

    console.log(`\nFAILED recipients by Campus:`, JSON.stringify(stats.failed.campuses, null, 2));
    console.log(`SUCCESSFUL recipients by Campus:`, JSON.stringify(stats.successful.campuses, null, 2));
}

analyze()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
