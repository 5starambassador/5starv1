
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const campuses = await prisma.campus.findMany({
            select: { id: true, campusName: true, campusCode: true }
        })
        console.log('--- CAMPUS LIST ---')
        campuses.forEach(c => {
            console.log(`${c.id}: "${c.campusName}" (${c.campusCode})`)
        })
        console.log('-------------------')
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
