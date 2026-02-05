const { PrismaClient } = require('@prisma/client');

async function main() {
    const url = "postgresql://neondb_owner:npg_yLR5MHPuV9oA@ep-patient-art-a1v3932a.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    const prisma = new PrismaClient({
        datasources: {
            db: { url }
        }
    });

    try {
        console.log("Attempting direct connection...");
        const count = await prisma.user.count();
        console.log("Success! Total users:", count);
    } catch (e) {
        console.error("Direct connection failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
