import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.whatsAppLog.findMany({
        where: {
            mobile: {
                contains: '8015000009'
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 3
    });
    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
