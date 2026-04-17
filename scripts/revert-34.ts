import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function revert() {
    console.log('--- REVERTING TO 3 VARIABLES ---');
    try {
        // 1. Update Template Config
        await prisma.whatsAppConfig.updateMany({
            where: { templateName: 'summer_camp_followup_01' },
            data: { requiredVariablesCount: 3 }
        });
        console.log('WhatsAppConfig updated to 3 variables');

        // 2. Update Campaign 34 Mapping
        await prisma.campaign.update({
            where: { id: 34 },
            data: {
                waVariableMapping: {
                    "1": "{Name}",
                    "2": "{source}",
                    "3": "{ProgramLink:wow-summer-camp}"
                }
            }
        });
        console.log('Campaign 34 mapping reverted to 3 variables');

    } catch (e: any) {
        console.error('REVERT FAILED:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

revert();
