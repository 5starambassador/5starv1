import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const EXCLUDED_FROM_SLAB = ['ACET', 'AASC', 'ACCHM']

    console.log('Calculating actual counts via grouping...')
    const groupResults = await prisma.referralLead.groupBy({
        by: ['userId'],
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            campus: { notIn: EXCLUDED_FROM_SLAB }
        },
        _count: {
            _all: true
        }
    })

    const actualMap = new Map<number, number>()
    groupResults.forEach(r => {
        actualMap.set(r.userId, r._count._all)
    })

    console.log(`Found ${actualMap.size} users with eligible leads. Matching with User table...`)

    const usersWithCount = await prisma.user.findMany({
        where: {
            OR: [
                { userId: { in: Array.from(actualMap.keys()) } },
                { confirmedReferralCount: { gt: 0 } }
            ],
            status: { not: 'Deleted' }
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            confirmedReferralCount: true
        }
    })

    let countDiscrepancies = 0
    usersWithCount.forEach(user => {
        const actual = actualMap.get(user.userId) || 0
        if (actual !== user.confirmedReferralCount) {
            console.log(`Discrepancy: ${user.fullName} (${user.mobileNumber}) - Field: ${user.confirmedReferralCount}, Actual: ${actual}`)
            countDiscrepancies++
        }
    })

    console.log(`\nTotal discrepancies found: ${countDiscrepancies}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
