import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.whatsAppLog.findMany({
        where: { 
            mobile: '9442266704',
            status: 'FAILED'
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('--- Failed Logs ---');
    console.log(JSON.stringify(logs, null, 2));
    
    const sentLogs = await prisma.whatsAppLog.findMany({
        where: { 
            mobile: '9442266704',
            status: 'SENT'
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('--- Sent Logs ---');
    console.log(JSON.stringify(sentLogs, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
