
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- VERIFYING LIVE CAMPUSES ---')
    const campuses = await prisma.campus.findMany({
        orderBy: { id: 'asc' }
    })

    if (campuses.length === 0) {
        console.log('No campuses found!')
    } else {
        console.table(campuses.map(c => ({
            ID: c.id,
            Name: c.campusName,
            Code: c.campusCode,
            Location: c.location
        })))
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
