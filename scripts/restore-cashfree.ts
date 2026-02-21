
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Restoring Live Site to CASHFREE...");

    // Find the settings record
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) {
        console.error("No system settings found in database.");
        return;
    }

    // Update to CASHFREE
    await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
            // @ts-ignore
            activeOnlineGateway: 'CASHFREE'
        }
    });

    console.log("Successfully restored live site to CASHFREE.");
}

main()
    .catch((e) => {
        console.error("Error restoring settings:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
