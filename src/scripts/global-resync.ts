import prisma from '../lib/prisma'
import { syncUserStats } from '../app/sync-actions'

async function globalReSync() {
    console.log('🚀 Starting Global Re-Sync of Ambassador Stats...')

    try {
        // 1. Fetch all users who have at least one referral record or a non-zero count
        const usersToSync = await prisma.user.findMany({
            where: {
                OR: [
                    { confirmedReferralCount: { gt: 0 } },
                    { referrals: { some: {} } },
                    { students: { some: {} } }
                ]
            },
            select: { userId: true, fullName: true, confirmedReferralCount: true }
        })

        console.log(`🔍 Found ${usersToSync.length} users requiring potential sync.`)

        let updatedCount = 0
        for (const user of usersToSync) {
            const beforeCount = user.confirmedReferralCount
            const result = await syncUserStats(user.userId)

            if (result.success) {
                const afterCount = result.user.confirmedReferralCount
                if (beforeCount !== afterCount) {
                    console.log(`✅ Updated ${user.fullName} (ID: ${user.userId}): ${beforeCount} -> ${afterCount}`)
                    updatedCount++
                }
            } else {
                console.error(`❌ Failed to sync ${user.fullName} (ID: ${user.userId}):`, result.error)
            }
        }

        console.log(`\n✨ Global Re-Sync Complete! Updated ${updatedCount} users.`)

    } catch (error) {
        console.error('❌ Global Re-Sync failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

globalReSync()
