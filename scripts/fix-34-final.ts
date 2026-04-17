import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
    console.log('--- STARTING DATABASE FIX ---');
    try {
        // 1. Update Template Config
        const templateUpdate = await prisma.whatsAppConfig.updateMany({
            where: { templateName: 'summer_camp_followup_01' },
            data: { requiredVariablesCount: 4 }
        });
        console.log(`Updated WhatsAppConfig: ${templateUpdate.count} record(s)`);

        // 2. Update Campaign 34 Mapping
        const campaignUpdate = await prisma.campaign.update({
            where: { id: 34 },
            data: {
                waVariableMapping: {
                    "1": "{Name}",
                    "2": "{source}",
                    "3": "{source}",
                    "4": "{ProgramLink:wow-summer-camp}"
                }
            }
        });
        console.log(`Updated Campaign 34 mapping successfully: ${campaignUpdate.name}`);

    } catch (e: any) {
        console.error('FIX FAILED:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
