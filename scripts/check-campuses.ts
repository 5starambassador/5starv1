import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const campuses = await prisma.campus.findMany()
  console.log("All campuses:", campuses.map(c => c.campusName))
}

main().catch(console.error).finally(() => prisma.$disconnect())
