import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const templateName = 'nudge_for_active_users_with_0_referrals';
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName }
    });

    if (!config) {
        console.log(`Config for ${templateName} not found.`);
        return;
    }

    console.log(`TEMPLATE NAME: ${config.templateName}`);
    console.log(`DESCRIPTION: ${config.description}`);
    console.log(`METADATA/CONTENT (from WhatsAppConfig): \n${JSON.stringify(config.ruleConfig, null, 2)}\n`);

    // Fetch the last sent log to show variables
    const lastLog = await prisma.whatsAppLog.findFirst({
        where: { template: templateName },
        orderBy: { createdAt: 'desc' }
    });

    if (lastLog) {
        console.log(`LAST SENT TO: ${lastLog.mobile}`);
        console.log(`VARIABLES USED: ${lastLog.content}`);
    }
}

main().finally(() => prisma.$disconnect());
