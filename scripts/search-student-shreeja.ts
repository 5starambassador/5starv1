
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function searchStudent() {
    console.log('--- SEARCHING FOR STUDENT V.G. SHREEJA ---')

    const students = await prisma.student.findMany({
        where: { fullName: { contains: 'Shreeja', mode: 'insensitive' } },
        include: { parent: true }
    })

    console.log('Students Found:', JSON.stringify(students, null, 2))
    console.log('--- SEARCH COMPLETE ---')
}

searchStudent().catch(console.error).finally(() => prisma.$disconnect())
