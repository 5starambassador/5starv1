
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking benefitStatus distribution for Parents...')

    const results = await prisma.user.groupBy({
        by: ['benefitStatus'],
        where: {
            role: 'Parent'
        },
        _count: {
            userId: true
        }
    })

    console.log('\nResults:')
    console.table(results.map(r => ({
        Status: r.benefitStatus,
        Count: r._count.userId
    })))
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
