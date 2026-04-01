import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyzePrefixes() {
    const recipients = await prisma.campaignRecipient.findMany({
        where: { campaignId: 28 },
        select: { mobile: true, status: true }
    });

    const failedPrefixes: any = {};
    const successPrefixes: any = {};

    recipients.forEach(r => {
        const prefix = r.mobile.substring(0, 3);
        const group = r.status === 'FAILED' ? failedPrefixes : successPrefixes;
        group[prefix] = (group[prefix] || 0) + 1;
    });

    console.log('Failed Prefixes:', JSON.stringify(failedPrefixes, null, 2));
    console.log('Success Prefixes:', JSON.stringify(successPrefixes, null, 2));
}

analyzePrefixes().finally(() => prisma.$disconnect());
