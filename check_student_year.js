
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const students = await prisma.student.findMany({
        take: 5,
        select: {
            fullName: true,
            academicYear: true,
            campusId: true,
            grade: true
        }
    })
    console.log('Student Sample:', students)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
