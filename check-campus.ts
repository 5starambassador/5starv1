import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const campus = await prisma.campus.findUnique({
        where: { campusName: 'AASC' },
        include: {
            gradeFees: true
        }
    })

    console.log('--- Campus AASC ---')
    console.log('ID:', campus?.id)
    console.log('Grades:', campus?.grades)
    console.log('GradeFees Count:', campus?.gradeFees.length)
    if (campus?.gradeFees.length) {
        console.log('Academic Years found:', [...new Set(campus.gradeFees.map(f => f.academicYear))])
        console.log('First 5 GradeFees:', campus.gradeFees.slice(0, 5))
    }

    const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true }
    })
    console.log('--- Current Academic Year ---')
    console.log(currentYear)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
