import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find logs where status is not standard
    const weirdLogs = await prisma.whatsAppLog.findMany({
        where: { NOT: { status: { in: ['SENT', 'DELIVERED', 'READ', 'FAILED', 'ERROR'] } } },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${weirdLogs.length} logs with weird statuses.`);
    
    weirdLogs.forEach(l => {
        console.log(`\nLog ID: ${l.id} | Status: "${l.status}"`);
        console.log(`Metadata:`, JSON.stringify(l.metadata, null, 2));
    });
}

main().finally(() => prisma.$disconnect());
