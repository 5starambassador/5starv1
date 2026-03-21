import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- ACADEMIC YEAR BOUNDARIES ---')
    const years = await prisma.academicYear.findMany({
        orderBy: { year: 'asc' }
    })
    
    console.table(years.map(y => ({
        year: y.year,
        startDate: y.startDate,
        endDate: y.endDate,
        isCurrent: y.isCurrent
    })))
    
    await prisma.$disconnect()
}

main()
