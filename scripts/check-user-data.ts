import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { mobileNumber: '+916374285445' }
  })
  console.log('--- USERS ---')
  console.log(JSON.stringify(users, null, 2))

  const students = await prisma.student.findMany({
    where: { parent: { mobileNumber: '+916374285445' } }
  })
  console.log('\n--- STUDENTS ---')
  console.log(JSON.stringify(students, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
