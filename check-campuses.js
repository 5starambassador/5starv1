
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCampuses() {
    try {
        const campuses = await prisma.campus.findMany({
            select: { id: true, campusName: true }
        })
        console.log('Total Campuses:', campuses.length)
        console.log(JSON.stringify(campuses, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkCampuses()
