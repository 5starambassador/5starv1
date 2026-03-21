import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '7358902679' },
        include: { settlements: true }
    })
    
    if (!user) {
        console.log('User not found')
        return
    }
    
    console.log(`User: ${user.fullName} (${user.userId})`)
    console.table(user.settlements.map(s => ({
        id: s.id,
        amount: s.amount,
        status: s.status,
        remarks: s.remarks,
        payoutDate: s.payoutDate,
        createdAt: s.createdAt
    })))
    
    await prisma.$disconnect()
}

main()
