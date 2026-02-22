import { getSystemAnalytics } from '../src/app/superadmin-actions'
import { getFinanceStats } from '../src/app/finance-actions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
    console.log('--- VERIFYING ACTIVITY-ANCHORED FILTERS ---')

    const TARGET_YEAR = '2026-2027'
    const PREVIOUS_YEAR = '2025-2026'

    // 1. Identify a "Veteran" Ambassador who registered in 2025-2026
    const veteran = await prisma.user.findFirst({
        where: { academicYear: PREVIOUS_YEAR },
        include: { referrals: true }
    })

    if (!veteran) {
        console.log('No veteran ambassador found to test with.')
        return
    }

    console.log(`Veteran Found: ${veteran.fullName} (Joined: ${veteran.academicYear})`)

    // 2. Give them a referral for 2026-2027 if they don't have one
    const has26Ref = veteran.referrals.some(r => r.admittedYear === TARGET_YEAR)

    if (!has26Ref) {
        console.log('Adding a test referral for 2026-2027 to veteran...')
        await prisma.referralLead.create({
            data: {
                userId: veteran.userId,
                fullName: 'Test Student 2026',
                mobileNumber: '9999999999',
                leadStatus: 'Confirmed',
                admittedYear: TARGET_YEAR,
                academicYear: TARGET_YEAR, // Mismatch for testing
                campus: 'Main Campus'
            }
        })
    }

    // 3. Test getSystemAnalytics
    console.log('\nTesting getSystemAnalytics...')
    const analytics = await getSystemAnalytics('all', TARGET_YEAR)
    console.log(`Total Ambassadors (2026-2027): ${analytics.totalAmbassadors}`)

    // Check if veteran is included
    const veteranIncluded = await prisma.user.count({
        where: {
            OR: [
                { academicYear: TARGET_YEAR },
                { referrals: { some: { admittedYear: TARGET_YEAR } } }
            ]
        }
    })
    console.log(`Expected Count (Matching Activity): ${veteranIncluded}`)

    // 4. Test getFinanceStats
    console.log('\nTesting getFinanceStats...')
    const finance = await getFinanceStats(TARGET_YEAR)
    if (finance.success) {
        console.log(`Finance Stats for ${TARGET_YEAR}:`, finance.stats)
    }

    // Cleanup test data
    await prisma.referralLead.deleteMany({
        where: { fullName: 'Test Student 2026', userId: veteran.userId }
    })

    console.log('\nVerification Complete.')
}

verify()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
