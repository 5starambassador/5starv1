const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.whatsAppLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
