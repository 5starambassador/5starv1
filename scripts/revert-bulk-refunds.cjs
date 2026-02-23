// Plain CJS script - no TypeScript, no imports
// Reverts ALL Rs.25 settlements (Pending + Processed) so users return to "Ready for Refund"
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    // Find ALL Rs.25 settlements regardless of status
    const toDelete = await prisma.settlement.findMany({
        where: {
            amount: 25
        },
        select: { id: true, userId: true, status: true, remarks: true, createdAt: true }
    })

    const pending = toDelete.filter(s => s.status === 'Pending')
    const processed = toDelete.filter(s => s.status === 'Processed')

    console.log(`\nFound ${toDelete.length} total Rs.25 settlement(s):`);
    console.log(`  - Pending  : ${pending.length}`);
    console.log(`  - Processed: ${processed.length}`);

    if (toDelete.length === 0) {
        console.log('Nothing to delete. All clear.')
        return
    }

    console.log('\nSample (first 5):')
    toDelete.slice(0, 5).forEach(s =>
        console.log(`  Settlement #${s.id} | User ${s.userId} | Status: ${s.status} | Remarks: ${s.remarks}`)
    )

    const result = await prisma.settlement.deleteMany({
        where: { id: { in: toDelete.map(s => s.id) } }
    })

    console.log(`\n[OK] Deleted ${result.count} Rs.25 settlement(s).`)
    console.log('All users are now back in "Ready for Refund".')
}

main()
    .catch(e => { console.error('[ERROR]', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
