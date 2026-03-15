const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMetadata() {
  const mobile = '8015000009';
  const log = await prisma.whatsAppLog.findFirst({
    where: { mobile },
    orderBy: { createdAt: 'desc' }
  });
  
  if (log) {
    console.log('--- Full Metadata for Last Test ---');
    console.log(JSON.stringify(log.metadata, null, 2));
  } else {
    console.log('No log found for ' + mobile);
  }

  await prisma.$disconnect();
}

checkMetadata();
