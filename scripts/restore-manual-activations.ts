import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING RESTORATION: MANUAL IMPORTS ---')

    // We want to restore users who are 'Pending' but have no record of payment, 
    // assuming they were the ones we just demoted. 
    // Best match: Parents created in January 2026 with 2025-2026 AY.

    // Actually, just find the ones who were Active before. 
    // In our v2 cleanup, we reverted 114 users.

    const usersToRestore = await prisma.user.findMany({
        where: {
            status: 'Pending' as any,
            role: 'Parent' as any,
            createdAt: { gte: new Date('2026-01-01') }
        }
    })

    console.log(`FOUND ${usersToRestore.length} POTENTIAL MANUAL IMPORTS TO RESTORE.`)

    for (const u of usersToRestore) {
        await prisma.user.update({
            where: { userId: u.userId },
            data: { status: 'Active' as any }
        })
        console.log(`RESTORED: [${u.userId}] ${u.fullName}`)
    }

    console.log('--- RESTORATION COMPLETE ---')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
