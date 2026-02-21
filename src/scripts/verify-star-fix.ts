import prisma from '../lib/prisma'
import { syncUserStats } from '../app/sync-actions'

async function verifyStarFix() {
    console.log('🚀 Starting Star Status Fix Verification...')

    const testMobile = '+919999999999'

    try {
        // 1. Setup Test User
        console.log('--- Setting up test user ---')
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })
        const user = await prisma.user.create({
            data: {
                fullName: 'Test Star Verification User',
                mobileNumber: testMobile,
                role: 'Others',
                childInAchariya: false,
                status: 'Active',
                referralCode: 'TESTSTAR',
            }
        })
        console.log(`✅ Created user: ${user.fullName} (${user.userId})`)

        // 2. Add Standard Referral
        console.log('\n--- Adding Standard Referral (Achariya School) ---')
        await prisma.referralLead.create({
            data: {
                userId: user.userId,
                parentName: 'Standard Parent',
                parentMobile: '+918888888888',
                campus: 'Achariya School',
                leadStatus: 'Confirmed'
            }
        })

        console.log('Syncing stats...')
        await syncUserStats(user.userId)

        const userAfterStandard = await prisma.user.findUnique({ where: { userId: user.userId } })
        console.log(`📊 Confirmed Count: ${userAfterStandard?.confirmedReferralCount} (Expected: 1)`)
        if (userAfterStandard?.confirmedReferralCount !== 1) throw new Error('Standard referral count mismatch!')

        // 3. Add Special Campus Referral
        console.log('\n--- Adding Special Campus Referral (AASC) ---')
        await prisma.referralLead.create({
            data: {
                userId: user.userId,
                parentName: 'Special Parent',
                parentMobile: '+917777777777',
                campus: 'AASC', // Special Campus
                leadStatus: 'Confirmed'
            }
        })

        console.log('Syncing stats...')
        await syncUserStats(user.userId)

        const userAfterSpecial = await prisma.user.findUnique({ where: { userId: user.userId } })
        console.log(`📊 Confirmed Count: ${userAfterSpecial?.confirmedReferralCount} (Expected: 1)`)
        if (userAfterSpecial?.confirmedReferralCount !== 1) {
            console.error('❌ BUG DETECTED: Special campus referral was counted!')
            throw new Error('Special referral count mismatch!')
        }
        console.log('✅ SUCCESS: Special campus referral was correctly excluded from the slab count.')

        // 4. Cleanup
        console.log('\n--- Cleaning up ---')
        await prisma.referralLead.deleteMany({ where: { userId: user.userId } })
        await prisma.user.delete({ where: { userId: user.userId } })
        console.log('✅ Cleanup complete.')

    } catch (error) {
        console.error('\n❌ Verification failed:', error)
        // Attempt cleanup anyway
        await prisma.referralLead.deleteMany({ where: { user: { mobileNumber: testMobile } } })
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

verifyStarFix()
