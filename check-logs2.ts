import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

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
        take: 2
    });
    fs.writeFileSync('tmp-logs.json', JSON.stringify(logs, null, 2));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
