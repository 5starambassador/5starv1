
import prisma from '@/lib/prisma'

async function main() {
    const year = '2025-2026'

    const existing = await prisma.academicYear.findUnique({
        where: { year }
    })

    if (!existing) {
        console.log(`Seeding ${year}...`)
        await prisma.academicYear.create({
            data: {
                year,
                startDate: new Date('2025-06-01'),
                endDate: new Date('2026-05-31'),
                isActive: true,
                isCurrent: true
            }
        })
        console.log('Seeded.')
    } else {
        console.log('Year already exists.')
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
