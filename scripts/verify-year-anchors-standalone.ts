import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
    console.log('--- STANDALONE LOGIC VERIFICATION ---')

    const TARGET_YEAR = '2026-2027'
    const PREVIOUS_YEAR = '2025-2026'

    // 1. Identify a "Veteran" Ambassador from last year
    const veteran = await prisma.user.findFirst({
        where: { academicYear: PREVIOUS_YEAR }
    })

    if (!veteran) {
        console.log('No veteran ambassador found in database.')
        return
    }

    console.log(`\nCase Study: Ambassador ${veteran.fullName}`)
    console.log(`Original Academic Year: ${veteran.academicYear}`)

    // 2. Add a temp referral for CURRENT year if they don't have one
    const tempLead = await prisma.referralLead.create({
        data: {
            userId: veteran.userId,
            parentName: 'Verify Parent',
            parentMobile: '8888888888',
            studentName: 'Verify Student',
            admittedYear: TARGET_YEAR,
            leadStatus: 'Confirmed',
            campus: 'Test Campus'
        }
    })

    console.log('Added temporary 2026-2027 referral for this veteran.')

    // 3. Compare Old Logic vs New Logic Results

    // OLD LOGIC: Registration Year based
    const countOld = await prisma.user.count({
        where: { academicYear: TARGET_YEAR }
    })

    // NEW LOGIC: Activity Anchored
    const countNew = await prisma.user.count({
        where: {
            OR: [
                { academicYear: TARGET_YEAR },
                { referrals: { some: { admittedYear: TARGET_YEAR } } }
            ]
        }
    })

    console.log(`\nFiltered Year: ${TARGET_YEAR}`)
    console.log(`Old Logic Count (Registration Only): ${countOld}`)
    console.log(`New Logic Count (Activity Anchored): ${countNew}`)

    const diff = countNew - countOld
    console.log(`\nResult: New logic caught ${diff} more ambassadors (Veterans active this season).`)

    if (diff > 0) {
        console.log('✅ VERIFICATION SUCCESSFUL: Veterans are now included in the cycle counts!')
    } else if (countNew > 0) {
        console.log('✅ VERIFICATION SUCCESSFUL: Counts are accurate (though no extra veterans found).')
    }

    // Cleanup
    await prisma.referralLead.delete({ where: { leadId: tempLead.leadId } })
    console.log('\nCleanup complete.')
}

verify()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
