const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const recipients = await prisma.campaignRecipient.findMany({
    take: 10,
    orderBy: { sentAt: 'desc' }
  })
  console.log('Recent Recipients:', JSON.stringify(recipients, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
