import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const campusName = 'AASC'
    console.log(`Checking grades for campus: ${campusName}`)

    const campus = await prisma.campus.findFirst({
        where: { campusName: { contains: campusName, mode: 'insensitive' } }
    })

    if (!campus) {
        console.log('Campus not found')
        return
    }

    console.log(`Found Campus: ${campus.campusName} (ID: ${campus.id})`)

    const gradeFees = await prisma.gradeFee.findMany({
        where: { campusId: campus.id },
        select: { grade: true },
        distinct: ['grade']
    })

    console.log('Grades in GradeFee:', gradeFees.map(gf => gf.grade).join(', '))

    if (campus.grades) {
        console.log('Grades in Campus.grades field:', campus.grades)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
