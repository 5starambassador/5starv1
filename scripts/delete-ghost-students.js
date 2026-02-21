const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ✅ SET TO false TO ACTUALLY DELETE
const DRY_RUN = false

async function main() {
    console.log('\n========================================')
    console.log('GHOST STUDENT DELETION SCRIPT')
    console.log(DRY_RUN ? '⚠️  DRY RUN — no changes will be made' : '🚨 LIVE MODE — DELETING FROM DATABASE')
    console.log('========================================\n')

    // Safety criteria — ONLY match records that are truly ghost:
    // 1. Fake name (ends with "'s Child")
    // 2. No ERP/admission number
    // 3. Not linked to any referral lead
    // 4. No ambassador (organic)
    const whereClause = {
        fullName: { endsWith: "'s Child" },
        admissionNumber: null,
        referralLeadId: null,
        ambassadorId: null
    }

    const count = await prisma.student.count({ where: whereClause })
    console.log(`Records matching ghost criteria : ${count}`)

    if (count === 0) {
        console.log('\n✅ Nothing to delete. Database is already clean.')
        return
    }

    if (DRY_RUN) {
        console.log('\n✅ DRY RUN: Would delete ' + count + ' ghost student records.')
        console.log('   To apply: set DRY_RUN = false at the top and run again.\n')
        return
    }

    // LIVE DELETE — batch in chunks to avoid timeout
    console.log('\nDeleting in batches...')
    let totalDeleted = 0
    const BATCH_SIZE = 500

    while (true) {
        // Find a batch of IDs
        const batch = await prisma.student.findMany({
            where: whereClause,
            select: { studentId: true },
            take: BATCH_SIZE
        })

        if (batch.length === 0) break

        const ids = batch.map(s => s.studentId)
        const result = await prisma.student.deleteMany({
            where: { studentId: { in: ids } }
        })

        totalDeleted += result.count
        console.log(`  Deleted batch: ${result.count} | Total so far: ${totalDeleted}`)
    }

    console.log('\n========================================')
    console.log(`✅ DONE — Deleted ${totalDeleted} ghost student records`)
    console.log('========================================\n')
}

main()
    .catch(e => {
        console.error('❌ Error:', e.message)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
