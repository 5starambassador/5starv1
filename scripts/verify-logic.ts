
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Simulating Revised Finance Query for ${year} ---`)

        // This mimics the new logic in finance-actions.ts
        const queryLogic = {
            AND: [
                {
                    OR: [
                        { paymentStatus: 'Completed' },
                        { paymentStatus: 'Success' },
                        { transactionId: { not: null } }
                    ]
                },
                {
                    OR: [
                        { academicYear: year },
                        { referrals: { some: { admittedYear: year } } }
                    ]
                }
            ]
        }

        const users = await prisma.user.findMany({
            where: queryLogic,
            select: { fullName: true, academicYear: true, role: true }
        })

        console.log(`Total users found with new logic: ${users.length}`)

        const targetNames = ["Lochana", "Kavya Devi M", "Ramya", "Abinaya Bhasker"]
        for (const name of targetNames) {
            const found = users.filter(u => u.fullName.includes(name))
            if (found.length > 0) {
                console.log(`[PASS] ${name} is now VISIBLE. (Account Year: ${found[0].academicYear})`)
            } else {
                console.log(`[FAIL] ${name} is still MISSING.`)
            }
        }

    } catch (err) {
        console.error('Simulation failed:', err)
    }
}

main().finally(() => prisma.$disconnect())
