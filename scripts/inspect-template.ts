import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const log = await prisma.whatsAppLog.findFirst({
        where: { refId: { startsWith: 'camp_' } },
        orderBy: { createdAt: 'desc' }
    });

    if (!log || !log.refId) {
        console.log('No recent campaign logs found.');
        return;
    }

    const campId = parseInt(log.refId.split('_')[1]);
    const camp = await prisma.campaign.findUnique({
        where: { id: campId }
    });

    if (!camp) {
        console.log(`Campaign ${campId} not found.`);
        return;
    }

    console.log(`CAMPAIGN: ${camp.name}`);
    console.log(`TEMPLATE: ${camp.waTemplateName}`);
    console.log('------------------------------------------');
    console.log(`RAW TEMPLATE BODY: \n${camp.templateBody}\n`);
    console.log('------------------------------------------');
    console.log(`INTERPOLATED EXAMPLE (GAYATHRI. N):`);
    
    // Variables sent were: "Gayathri. N, ACH26-P01750, ABSM - GORIMEDU, , Parent"
    // Template likely uses {{1}}, {{2}}, etc.
    const variables = log.content.split(',').map(v => v.trim());
    let interpolated = camp.templateBody;
    variables.forEach((v, i) => {
        interpolated = interpolated.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), v);
    });

    console.log(interpolated);
}

main().finally(() => prisma.$disconnect());
