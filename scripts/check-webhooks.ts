import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const deliveredCount = await prisma.whatsAppLog.count({
        where: { status: { in: ['DELIVERED', 'READ'] } }
    });
    console.log(`Delivered/Read logs in DB: ${deliveredCount}`);

    const recentLogs = await prisma.whatsAppLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log("Most recent logs:", recentLogs.map(l => ({ id: l.id, status: l.status })));
}

main().finally(() => prisma.$disconnect());
