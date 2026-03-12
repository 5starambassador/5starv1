
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
  try {
    const recentLogs = await prisma.whatsAppLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log('Recent WhatsApp Logs:');
    recentLogs.forEach(l => {
      console.log(`ID: ${l.id} | Mobile: ${l.mobile} | Status: ${l.status} | RefId: ${l.refId} | CreatedAt: ${l.createdAt}`);
      console.log(`Metadata: ${JSON.stringify(l.metadata)}`);
      console.log('-------------------');
    });

    const statusCounts = await prisma.whatsAppLog.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    console.log('Status Counts:', JSON.stringify(statusCounts, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogs();
