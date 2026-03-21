import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '7358902679' },
        include: { settlements: true }
    })
    
    if (user) {
        console.log(`User: ${user.fullName}`)
        user.settlements.forEach(s => {
            console.log(`Ref: ${s.bankReference} | Amt: ${s.amount} | Status: ${s.status} | Remarks: ${s.remarks} | Date: ${s.payoutDate || s.createdAt}`)
        })
    }
    
    await prisma.$disconnect()
}

main()
