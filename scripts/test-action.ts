
import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Testing getAccruedPayoutLiabilities for ${year} ---`)

        const res = await getAccruedPayoutLiabilities(year)

        if (!res.success) {
            console.error('Action failed:', res.error)
            return
        }

        const liabilities = res.data || []
        console.log(`Total liabilities returned: ${liabilities.length}`)

        const targetNames = ["Lochana", "Kavya Devi M", "Ramya", "Abinaya Bhasker", "Krithika"]

        for (const name of targetNames) {
            const found = liabilities.filter((l: any) => l.fullName.includes(name))
            if (found.length > 0) {
                console.log(`\nFound ${name} (${found.length} entries):`)
                found.forEach((f: any) => {
                    console.log(`- LedgerID: ${f.ledgerId} | Group: ${f.group} | Earned: ${f.totalEarned} | Rem: ${f.remainingAmount} | Refs: ${f.confirmedReferralCount}`)
                    if (f.breakdown) console.log(`  Breakdown: ${f.breakdown.join(', ')}`)
                })
            } else {
                console.log(`\nMISSING: ${name}`)
            }
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
