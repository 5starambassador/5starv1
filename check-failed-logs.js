const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFailedLogs() {
  const logs = await prisma.whatsAppLog.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('--- Failed WhatsApp Logs ---');
  console.log(JSON.stringify(logs, null, 2));

  await prisma.$disconnect();
}

checkFailedLogs();
