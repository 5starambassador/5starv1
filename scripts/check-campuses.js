
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const campuses = await prisma.campus.findMany()
        console.log('Campuses found:', campuses.length)
        console.log(JSON.stringify(campuses, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
