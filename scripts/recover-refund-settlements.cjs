// Recovery script: Recreates Rs.25 settlements for all eligible users
// Eligible = paid (Success/Completed) + have bank details + no existing Rs.25 settlement
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('\nFinding eligible users for Rs.25 settlement recovery...')

    // Find all paid users with bank details who don't already have a Rs.25 settlement
    const eligibleUsers = await prisma.user.findMany({
        where: {
            paymentStatus: { in: ['Success', 'Completed'] },
            paymentAmount: { gt: 0 },
            AND: [
                { accountNumber: { not: null } },
                { accountNumber: { not: '' } },
                { ifscCode: { not: null } },
                { ifscCode: { not: '' } }
            ],
            // No existing Rs.25 settlement
            NOT: {
                settlements: {
                    some: { amount: 25, status: { not: 'Rejected' } }
                }
            }
        },
        select: { userId: true, fullName: true, mobileNumber: true }
    })

    console.log(`Found ${eligibleUsers.length} users eligible for recovery.\n`)

    if (eligibleUsers.length === 0) {
        console.log('No eligible users found. Nothing to recover.')
        return
    }

    console.log('Sample (first 5):')
    eligibleUsers.slice(0, 5).forEach(u =>
        console.log(`  User ${u.userId} | ${u.fullName} | ${u.mobileNumber}`)
    )

    // Recreate settlements in batches of 100
    let created = 0
    const batchSize = 100
    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = eligibleUsers.slice(i, i + batchSize)
        await prisma.$transaction(
            batch.map(u => prisma.settlement.create({
                data: {
                    userId: u.userId,
                    amount: 25,
                    status: 'Pending',
                    remarks: 'Registration Fee Refund - Recovered'
                }
            }))
        )
        created += batch.length
        console.log(`  Processed ${Math.min(i + batchSize, eligibleUsers.length)} / ${eligibleUsers.length}...`)
    }

    console.log(`\n[OK] Recovered ${created} Rs.25 settlement(s) as Pending.`)
    console.log('These users will now appear in the Settlements queue (Payout Requests).')
    console.log('Once actual bank transfer is done, mark them as Processed with the real UTR.')
}

main()
    .catch(e => { console.error('[ERROR]', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
