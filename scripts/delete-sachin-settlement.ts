import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '9345450240' },
        include: {
            settlements: {
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!user) { console.log('Not found'); return }
    console.log(`Found: ${user.fullName} | userId=${user.userId}\n`)
    console.log('--- All settlements ---')
    user.settlements.forEach(s => {
        console.log(`  ID: ${s.id} | ₹${s.amount} | ${s.status} | ${s.benefitType || 'OTHER'} | LeadId: ${s.referralLeadId} | UTR: ${s.bankReference} | ${s.createdAt.toISOString().split('T')[0]}`)
    })

    // Delete ALL recent floating records (no referralLeadId, created today or yesterday via CSV)
    // Keep only the old legacy records (pre-March 2026)
    const cutoff = new Date('2026-03-22T00:00:00Z')
    const toDelete = user.settlements.filter(s =>
        s.createdAt >= cutoff &&       // created recently (from CSV uploads)
        s.referralLeadId === null &&   // not linked to a specific referral
        s.amount !== 25                // NOT the ₹25 registration refund
    )

    console.log(`\nWill delete ${toDelete.length} floating record(s) from recent CSV uploads:`)
    for (const s of toDelete) {
        console.log(`  Deleting ID: ${s.id} | ₹${s.amount} | ${s.status} | ${s.benefitType}`)
        await prisma.settlement.delete({ where: { id: s.id } })
    }

    console.log('\nDone! Sachin account cleaned.')
}
main().finally(() => prisma.$disconnect())
