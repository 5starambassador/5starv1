import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const campuses = await prisma.campus.findMany()
  console.log(JSON.stringify(campuses, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
