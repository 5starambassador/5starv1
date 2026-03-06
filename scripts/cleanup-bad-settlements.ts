import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
    // Delete the bad settlement created with null referralLeadId for G. Rama
    const deleted = await (p.settlement as any).deleteMany({
        where: {
            referralLeadId: null,
            benefitType: 'ADMISSION_SHARE',
            status: 'Pending'
        }
    })
    console.log('Deleted bad settlements:', deleted)

    // Verify remaining
    const remaining = await (p.settlement as any).findMany({
        orderBy: { id: 'desc' },
        take: 5,
        select: { id: true, userId: true, amount: true, status: true, benefitType: true, referralLeadId: true }
    })
    console.log('Recent settlements after cleanup:')
    console.log(JSON.stringify(remaining, null, 2))
}

main().catch(console.error).finally(() => p.$disconnect())
