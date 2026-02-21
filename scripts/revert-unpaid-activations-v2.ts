import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING CLEANUP: REVERTING UNPAID ACTIVATIONS (V2) ---')

    // Find discrepant users
    const discrepantUsers = await prisma.user.findMany({
        where: {
            status: 'Active' as any,
            paymentStatus: { in: ['Pending', 'Failed'] }
        },
        include: {
            payments: true
        }
    })

    const toRevert = discrepantUsers.filter(u => {
        const hasSuccessPayment = u.payments.some(p => p.paymentStatus === 'Success' || p.paymentStatus === 'Completed')
        return !hasSuccessPayment
    })

    console.log(`FOUND ${toRevert.length} USERS TO REVERT TO PENDING.`)

    for (const u of toRevert) {
        await prisma.user.update({
            where: { userId: u.userId },
            data: { status: 'Pending' as any }
        })
    }

    console.log('--- CLEANUP COMPLETE ---')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
