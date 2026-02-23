import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    console.log('Nothing to delete. All clear.')
} else {
    console.log('Sample (first 5):')
    toDelete.slice(0, 5).forEach(s =>
        console.log(`  Settlement #${s.id} | User ${s.userId} | Created: ${s.createdAt.toISOString()}`)
    )

    const result = await prisma.settlement.deleteMany({
        where: { id: { in: toDelete.map(s => s.id) } }
    })

    console.log(`\n✅ Deleted ${result.count} pending refund settlement(s). Users are back in Ready for Refund.`)
}

await prisma.$disconnect()
