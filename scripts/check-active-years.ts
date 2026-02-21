import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const activeYears = await prisma.academicYear.findMany({
        where: { isActive: true },
        orderBy: { startDate: 'desc' }
    })

    console.log('Active Years:', JSON.stringify(activeYears, null, 2))

    const currentYear = activeYears.find(y => y.isCurrent) || activeYears[0]
    console.log('Detected Current Year:', currentYear?.year)

    // Check Grade-1 Fees for these years
    const yearStrings = activeYears.map(y => y.year)
    const feeCounts = await prisma.gradeFee.groupBy({
        by: ['academicYear'],
        where: {
            academicYear: { in: yearStrings },
            grade: { in: ['Grade 1', 'Grade - 1', '1', 'I'] }
        },
        _count: true
    })

    console.log('Grade 1 Fee Counts by Year:', feeCounts)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
