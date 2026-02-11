
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const fees = await prisma.gradeFee.findMany({
        take: 5
    })
    console.log('GradeFee Sample:', fees)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
