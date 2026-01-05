
import prisma from '@/lib/prisma'

async function main() {
    const years = [
        {
            year: '2024-2025',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2025-05-31'),
            isActive: true,
            isCurrent: false
        },
        {
            year: '2025-2026',
            startDate: new Date('2025-06-01'),
            endDate: new Date('2026-05-31'),
            isActive: true,
            isCurrent: true
        }
    ]

    for (const y of years) {
        const upserted = await prisma.academicYear.upsert({
            where: { year: y.year },
            update: {
                isCurrent: y.isCurrent,
                startDate: y.startDate,
                endDate: y.endDate
            },
            create: y
        })
        console.log(`Upserted: ${upserted.year} (Current: ${upserted.isCurrent})`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
