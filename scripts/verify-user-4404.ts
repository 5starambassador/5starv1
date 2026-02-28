
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { userId: 4404 }
        })

        if (!user) {
            console.log('User 4404 not found')
            return
        }

        console.log(`User 4404: ${user.fullName} | Mobile: ${user.mobileNumber} | Role: ${user.role} | AcademicYear: ${user.academicYear}`)

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
