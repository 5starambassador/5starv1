const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const EXCLUDED_FROM_SLAB = ['ACET', 'AASC', 'ACCHM']

async function deepAudit() {
    console.log('🚀 Starting 100% Safe Deep Count Audit...')
    console.log(`Excluding campuses from slab counts: ${EXCLUDED_FROM_SLAB.join(', ')}\n`)

    const users = await prisma.user.findMany({
        select: {
            userId: true,
            fullName: true,
            role: true,
            status: true,
            confirmedReferralCount: true,
            referrals: {
                select: {
                    leadStatus: true,
                    campus: true
                }
            }
        }
    })

    let discrepancies = 0
    let totalActiveAmbassadorsWithZero = 0

    const results = []

    for (const user of users) {
        // Calculate actual confirmed count based on leads
        const actualConfirmed = user.referrals.filter(r => 
            (r.leadStatus === 'Confirmed' || r.leadStatus === 'Admitted') &&
            !EXCLUDED_FROM_SLAB.includes(r.campus || '')
        ).length

        if (user.confirmedReferralCount !== actualConfirmed) {
            discrepancies++
            if (discrepancies <= 10) {
                console.log(`⚠️ DISCREPANCY: ${user.fullName} (${user.role}) - DB: ${user.confirmedReferralCount}, Actual: ${actualConfirmed}`)
            }
        }

        // Target: Active Only + 0 Referrals
        if (user.status === 'Active' && actualConfirmed === 0) {
            totalActiveAmbassadorsWithZero++
        }
    }

    console.log(`\n--- Audit Summary ---`)
    console.log(`Total Users Processed: ${users.length}`)
    console.log(`Total Discrepancies Found: ${discrepancies}`)
    console.log(`Total Active Ambassadors with ACTUAL 0 confirmed leads: ${totalActiveAmbassadorsWithZero}`)
    
    if (totalActiveAmbassadorsWithZero === 5901) {
        console.log('\n✅ VERIFIED: The count 5901 is 100% accurate based on live lead records.')
    } else {
        console.log(`\n🔍 REVISED COUNT: The actual count is ${totalActiveAmbassadorsWithZero}. (Discrepancy: ${totalActiveAmbassadorsWithZero - 5901})`)
    }

    await prisma.$disconnect()
}

deepAudit().catch(console.error)
