import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFail() {
    const log = await prisma.whatsAppLog.findFirst({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' }
    });
    console.log('--- Last Failed WhatsApp Log ---');
    console.log(JSON.stringify(log, null, 2));
    await prisma.$disconnect();
}

checkFail();
