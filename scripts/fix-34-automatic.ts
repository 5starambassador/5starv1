import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
    console.log('--- ENABLING AUTOMATIC LINKS ---');
    try {
        const update = await prisma.campaign.update({
            where: { id: 34 },
            data: {
                waVariableMapping: {
                    "1": "{Name}",
                    "2": "{source}",
                    "3": "{programLink}"
                }
            }
        });
        console.log(`Updated Campaign 34 to use automatic {programLink}: ${update.name}`);
    } catch (e: any) {
        console.error('FIX FAILED:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
