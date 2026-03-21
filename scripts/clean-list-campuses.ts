import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const campuses = await prisma.campus.findMany({
    select: { id: true, campusName: true }
  })
  campuses.forEach(c => {
    console.log(`${c.id}: ${c.campusName}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
