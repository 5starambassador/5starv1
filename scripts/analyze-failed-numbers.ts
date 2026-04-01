import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
    const campaignId = 28;

    // Get all recipients for campaign 28
    const recipients = await prisma.campaignRecipient.findMany({
        where: { campaignId },
        select: {
            mobile: true,
            status: true,
            errorCode: true
        }
    });

    const failed = recipients.filter(r => r.status === 'FAILED');
    const successful = recipients.filter(r => r.status !== 'FAILED');

    console.log(`--- Campaign #28 Analysis ---`);
    console.log(`Total Recipients: ${recipients.length}`);
    console.log(`Total Failed: ${failed.length}`);
    console.log(`Total Successful: ${successful.length}`);

    const analyzeNumbers = (list: any[]) => {
        const stats: any = {
            len10: 0,
            len12: 0,
            lenOther: 0,
            startsWith91: 0,
            samples: []
        };
        list.forEach(r => {
            const m = r.mobile;
            if (m.length === 10) stats.len10++;
            else if (m.length === 12) stats.len12++;
            else stats.lenOther++;

            if (m.startsWith('91')) stats.startsWith91++;
            
            if (stats.samples.length < 5) stats.samples.push(m);
        });
        return stats;
    };

    const failedStats = analyzeNumbers(failed);
    const successStats = analyzeNumbers(successful);

    console.log(`\nFAILED Numbers Stats:`);
    console.log(JSON.stringify(failedStats, null, 2));

    console.log(`\nSUCCESSFUL Numbers Stats:`);
    console.log(JSON.stringify(successStats, null, 2));
}

analyze()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
