import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      referralCode: {
        not: null
      },
      OR: [
        { assignedCampus: null },
        { campusId: null }
      ]
    },
    select: {
      userId: true,
      fullName: true,
      mobileNumber: true,
      role: true,
      assignedCampus: true,
      campusId: true,
      status: true,
      createdAt: true
    }
  })

  console.log('Found ' + users.length + ' ambassadors with missing campus info')
  
  users.forEach(user => {
    console.log('-------------------')
    console.log('User: ' + user.fullName + ' (ID: ' + user.userId + ')')
    console.log('Mobile: ' + user.mobileNumber)
    console.log('Role: ' + user.role)
    console.log('Status: ' + user.status)
    console.log('CreatedAt: ' + user.createdAt.toISOString())
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
