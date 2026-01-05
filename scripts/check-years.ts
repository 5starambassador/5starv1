
import prisma from '@/lib/prisma'

async function main() {
    const count = await prisma.academicYear.count()
    console.log('Total Academic Years:', count)

    const years = await prisma.academicYear.findMany()
    console.log('Years:', JSON.stringify(years, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
