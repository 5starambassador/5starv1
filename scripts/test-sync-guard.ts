import { PrismaClient } from '@prisma/client'
import { syncUserStats } from '../src/app/sync-actions'

const prisma = new PrismaClient()

async function main() {
    const testUserId = 5467 // RAGUNATH N

    console.log('--- TEST: STATUS PERSISTENCE ---')

    // 1. Manually set to Pending
    await prisma.user.update({
        where: { userId: testUserId },
        data: { status: 'Pending' as any }
    })

    let user = await prisma.user.findUnique({ where: { userId: testUserId } })
    console.log(`Initial Status (Manual): ${user?.status}, Payment: ${user?.paymentStatus}`)

    // 2. Trigger Sync
    console.log('Triggering Sync...')
    await syncUserStats(testUserId)

    // 3. Check status again
    user = await prisma.user.findUnique({ where: { userId: testUserId } })
    console.log(`Final Status (After Sync): ${user?.status}`)

    if (user?.status === 'Active' && user?.paymentStatus !== 'Success') {
        console.log('FAIL: User was re-activated without payment!')
    } else {
        console.log('SUCCESS: Logic held.')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
