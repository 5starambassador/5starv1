import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.whatsAppLog.findMany({
        where: { mobile: '9442266704' },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(logs, null, 2));
    
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'referral_followup01' }
    });
    console.log('--- Template Config ---');
    console.log(JSON.stringify(config, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
