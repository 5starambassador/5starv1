import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const EXCLUDED_FROM_SLAB = ['ACET', 'AASC', 'ACCHM']

    const users = await prisma.user.findMany({
        where: {
            status: { not: 'Deleted' }
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            confirmedReferralCount: true
        }
    })

    console.log(`Checking discrepancy for ${users.length} users...`)

    let countDiscrepancies = 0
    for (const user of users) {
        const actualCount = await prisma.referralLead.count({
            where: {
                userId: user.userId,
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                campus: { notIn: EXCLUDED_FROM_SLAB }
            }
        })

        if (actualCount !== user.confirmedReferralCount) {
            console.log(`Discrepancy: ${user.fullName} (${user.mobileNumber}) - Field: ${user.confirmedReferralCount}, Actual: ${actualCount}`)
            countDiscrepancies++
        }
    }

    console.log(`\nTotal discrepancies found: ${countDiscrepancies}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
