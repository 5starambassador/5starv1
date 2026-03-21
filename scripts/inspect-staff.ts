
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Database Inspection: Staff Users ---')
  const staffUsers = await prisma.user.findMany({
    where: { role: 'Staff' },
    select: {
      userId: true,
      fullName: true,
      empId: true,
      childName: true,
      childEprNo: true,
      childCampusId: true
    },
    take: 5
  })

  console.table(staffUsers)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
