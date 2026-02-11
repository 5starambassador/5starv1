
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== PARENT BENEFIT STATUS REPORT ===\n')

    // Group by benefitStatus ONLY (ignoring account status)
    const results = await prisma.user.groupBy({
        by: ['benefitStatus'],
        where: {
            role: 'Parent'
        },
        _count: {
            userId: true
        }
    })

    console.log('Benefit Status Breakdown:')
    console.table(results.map(r => ({
        'Benefit Status': r.benefitStatus,
        'Count': r._count.userId
    })))

    const total = results.reduce((acc, curr) => acc + curr._count.userId, 0)
    console.log(`\nTotal Parents: ${total}`)
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
