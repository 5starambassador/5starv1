
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const student = await prisma.student.findFirst()
        console.log('Sample Student:', JSON.stringify(student, null, 2))
    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
