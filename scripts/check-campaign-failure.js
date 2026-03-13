const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    // 1. Recent failed WhatsApp logs
    const logs = await p.whatsAppLog.findMany({
        where: {
            createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
            status: 'FAILED'
        },
        select: { mobile: true, template: true, errorMessage: true, createdAt: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    console.log('=== Recent Failed WhatsApp Logs ===');
    console.log(JSON.stringify(logs, null, 2));

    // 2. Campaign status
    const campaign = await p.campaign.findFirst({
        where: { name: { contains: 'Zero Referral', mode: 'insensitive' } },
        select: { id: true, name: true, status: true, sentCount: true, failedCount: true, totalRecipients: true }
    });

    console.log('\n=== Campaign Status ===');
    console.log(JSON.stringify(campaign, null, 2));

    // 3. Recent jobs
    const jobs = await p.job.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        select: { id: true, type: true, status: true, error: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log('\n=== Recent Jobs ===');
    console.log(JSON.stringify(jobs, null, 2));
}

check().catch(console.error).finally(() => p.$disconnect());
