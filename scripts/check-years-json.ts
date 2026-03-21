import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- ACADEMIC YEAR BOUNDARIES JSON ---')
    const years = await prisma.academicYear.findMany({
        orderBy: { year: 'asc' }
    })
    
    console.log(JSON.stringify(years, null, 2))
    
    await prisma.$disconnect()
}

main()
