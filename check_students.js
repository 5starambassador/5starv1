const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const students = await prisma.student.findMany({
        where: { studentId: 322 },
        include: {
            referralLead: true
        }
    })
    console.log(JSON.stringify(students, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
