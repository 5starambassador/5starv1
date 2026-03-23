import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const years = await prisma.academicYear.findMany({
        orderBy: { year: 'desc' }
    })
    console.log(JSON.stringify(years, null, 2))
    await prisma.$disconnect()
}

main()
