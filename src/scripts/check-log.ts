import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const lastLog = await prisma.whatsAppLog.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log(JSON.stringify(lastLog, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
