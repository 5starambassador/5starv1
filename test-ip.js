const { PrismaClient } = require('@prisma/client');

async function main() {
    // Using the IP address 13.251.26.151 which resolved earlier for Neon ap-southeast-1
    const url = "postgresql://neondb_owner:npg_yLR5MHPuV9oA@13.251.26.151/neondb?sslmode=require&pgbouncer=true";
    const prisma = new PrismaClient({
        datasources: {
            db: { url }
        }
    });

    try {
        console.log("Attempting IP-direct connection to 13.251.26.151...");
        const count = await prisma.user.count();
        console.log("Success! Total users:", count);
    } catch (e) {
        console.error("IP connection failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
