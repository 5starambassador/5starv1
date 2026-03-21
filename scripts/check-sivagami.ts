import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { referralCode: 'ACI125-S00021' }, // Based on the screenshot ACI125 or ACH25? It looks like ACI125-S00021
        { mobileNumber: '7402180557' },
      ]
    },
    include: {
      students: true
    }
  })

  console.log(JSON.stringify(user, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
