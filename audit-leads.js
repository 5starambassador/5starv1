
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function audit() {
    console.log("--- STARTING AUDIT ---")

    // 1. Get Sum of User Counts (The 213 source)
    const userAgg = await prisma.user.aggregate({
        _sum: { confirmedReferralCount: true }
    })
    console.log(`Total 'confirmedReferralCount' stored on Users: ${userAgg._sum.confirmedReferralCount}`)

    // 2. Get Actual Lead Rows Count
    const leadCount = await prisma.referralLead.count()
    console.log(`Total 'ReferralLead' rows in DB: ${leadCount}`)

    // 3. Find Users with Mismatch
    const usersWithCounts = await prisma.user.findMany({
        where: { confirmedReferralCount: { gt: 0 } },
        select: { userId: true, fullName: true, confirmedReferralCount: true }
    })

    console.log(`\nAnalyzing ${usersWithCounts.length} users with referral counts...`)
    let discrepancyFound = false

    for (const u of usersWithCounts) {
        const actualLeads = await prisma.referralLead.count({
            where: { userId: u.userId, leadStatus: 'Confirmed' }
        })

        if (actualLeads !== u.confirmedReferralCount) {
            console.log(`[MISMATCH] User: ${u.fullName} (ID: ${u.userId}) -> Profile Says: ${u.confirmedReferralCount}, Actual Rows: ${actualLeads}`)
            discrepancyFound = true
        }
    }

    if (!discrepancyFound) console.log("No specific user-level mismatches found for Confirmed status.")

    // 4. Check Audit Logs for Deletions
    console.log("\n--- CHECKING ACTIVITY LOGS FOR DELETIONS ---")
    const logs = await prisma.activityLog.findMany({
        where: {
            action: { contains: 'DELETE', mode: 'insensitive' }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    })

    if (logs.length === 0) {
        console.log("No DELETE actions found in ActivityLog.")
    } else {
        logs.forEach(l => {
            console.log(`[LOG] ${l.createdAt.toISOString()} - ${l.action} - ${l.description}`)
        })
    }

    console.log("\n--- AUDIT COMPLETE ---")
}

audit()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
