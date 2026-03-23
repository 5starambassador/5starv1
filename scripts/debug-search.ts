import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function debug() {
    const transactions = await prisma.user.findMany({
        where: { fullName: { in: ['Dr Karthikeyan R', 'NANDAKUMAR', 'Karthikeyan.b'] } },
        select: { fullName: true, mobileNumber: true, childName: true, assignedCampus: true, campusId: true, transactionId: true, referralCode: true, createdAt: true }
    })
    console.log(transactions)
}
debug().catch(console.error).finally(() => prisma.$disconnect())
