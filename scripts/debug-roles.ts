import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    const roles = ['Parent', 'Staff', 'Alumni', 'Others']

    for (const role of roles) {
        const total = await prisma.user.count({ where: { role: role as any } })
        
        const showingInTable = await prisma.user.count({
            where: {
                role: role as any,
                OR: [
                    { paymentStatus: 'Completed' },
                    { paymentStatus: 'Success' },
                    { paymentStatus: 'SUCCESS' },
                    { transactionId: { not: null } },
                    { settlements: { some: { amount: 25, status: { in: ['Processed', 'SUCCESS', 'Confirmed'] } as any } } },
                    { referrals: { some: {} } }
                ]
            }
        })
        
        console.log(`Role: ${role.padEnd(10)} | Total: ${total.toString().padStart(4)} | Showing: ${showingInTable.toString().padStart(4)} | Hidden: ${(total - showingInTable).toString().padStart(4)}`)
    }
}

debug().catch(console.error).finally(() => prisma.$disconnect())
