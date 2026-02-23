/**
 * REVERT SCRIPT: Deletes Pending ₹25 refund settlements
 * created by the "initiateBulkRefunds" action.
 * 
 * Run with: npx ts-node --project tsconfig.json scripts/revert-bulk-refunds.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Safety: only target Pending settlements of exactly ₹25
    // with the specific remarks set by initiateBulkRefunds
    const toDelete = await prisma.settlement.findMany({
        where: {
            amount: 25,
            status: 'Pending',
            remarks: 'Registration Fee Refund Request (Auto-Initiated)'
        },
        select: { id: true, userId: true, createdAt: true }
    })

    console.log(`Found ${toDelete.length} pending refund settlement(s) to revert.`)

    if (toDelete.length === 0) {
        console.log('Nothing to delete. Exiting.')
        return
    }

    // Show preview
    console.log('Sample records (first 5):')
    toDelete.slice(0, 5).forEach(s => {
        console.log(`  Settlement ID ${s.id} | User ${s.userId} | Created: ${s.createdAt.toISOString()}`)
    })

    // Delete them all
    const result = await prisma.settlement.deleteMany({
        where: {
            id: { in: toDelete.map(s => s.id) }
        }
    })

    console.log(`\n✅ Successfully deleted ${result.count} pending refund settlement(s).`)
    console.log('Users are now back in the "Ready for Refund" list.')
}

main()
    .catch(e => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
