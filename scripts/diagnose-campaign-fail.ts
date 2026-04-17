import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSING RECENT WHATSAPP LOG FAILURES ---');
    
    const logs = await prisma.whatsAppLog.findMany({
        where: {
            // status: 'FAILED',
            template: { contains: 'summer_camp_followup_01' },
            createdAt: {
                gte: new Date(new Date().getTime() - 2 * 60 * 60 * 1000) // Last 2 hours
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 50
    });

    if (logs.length === 0) {
        console.log('No logs found for summer_camp_followup_01 in the last 2 hours.');
    } else {
        console.log(`Found ${logs.length} logs for summer_camp_followup_01.`);
        logs.forEach(log => {
            console.log(`\nTimestamp: ${log.createdAt}`);
            console.log(`Recipient: ${log.mobile}`);
            console.log(`Status: ${log.status}`);
            console.log(`Error: ${log.errorMessage}`);
            console.log(`Ref ID: ${log.refId}`);
            console.log(`Payload Params: ${JSON.stringify((log.metadata as any)?.apiPayload?.payload?.template?.components?.find((c:any) => c.type === 'body')?.parameters)}`);
            // console.log(`Metadata: ${JSON.stringify(log.metadata)}`);
        });
    }

    // Check CampaignLog
    console.log('\n--- CAMPAIGN LOGS ---');
    const campLogs = await prisma.campaignLog.findMany({
        where: {
            runAt: {
                gte: new Date(new Date().getTime() - 2 * 60 * 60 * 1000)
            }
        },
        include: {
            campaign: true
        },
        orderBy: {
            runAt: 'desc'
        }
    });

    campLogs.forEach(cl => {
        console.log(`\nCampaign: ${cl.campaign.name}`);
        console.log(`Status: ${cl.status}`);
        console.log(`Sent: ${cl.sentCount}, Failed: ${cl.failedCount}, WA Failed: ${cl.whatsappFailed}`);
        console.log(`Error Log: ${JSON.stringify(cl.errorLog)}`);
        console.log(`Ref ID: ${cl.refId}`);
    });

    // Also check CampaignRecipient for details if template was summer_camp_followup_01
    const recipients = await prisma.campaignRecipient.findMany({
        where: {
            status: 'FAILED',
            sentAt: {
                gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
            }
        },
        orderBy: {
            sentAt: 'desc'
        },
        take: 20
    });

    if (recipients.length > 0) {
        console.log('\n--- CAMPAIGN RECIPIENT FAILURES ---');
        recipients.forEach(r => {
            console.log(`\nMobile: ${r.mobile}`);
            console.log(`Status: ${r.status}`);
            console.log(`Error Code: ${r.errorCode}`);
            console.log(`Campaign ID: ${r.campaignId}`);
        });
    }

    await prisma.$disconnect();
}

main().catch(console.error);
