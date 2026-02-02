import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const campuses = await prisma.campus.findMany({
        select: {
            id: true,
            campusName: true,
            campusCode: true
        }
    })

    console.log('--- Total Campuses ---')
    console.log('Count:', campuses.length)
    console.log(JSON.stringify(campuses, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
