import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const u = await prisma.user.findUnique({
    where: { mobileNumber: '6369400364' },
    include: { payments: true }
  })
  
  if (!u) {
    console.log("User not found")
    return
  }

  console.log('User Role:', u.role)
  console.log('User CreatedAt:', u.createdAt)
  console.log('User Payments:', u.payments.map(p => ({
    paidAt: p.paidAt,
    transactionId: p.transactionId,
    amount: p.amount
  })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
