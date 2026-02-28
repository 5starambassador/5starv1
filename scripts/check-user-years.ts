
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const mobiles = ["7598326022", "7708838990", "8248764961", "9003977098", "9047585092", "9597150068"]

        console.log('--- User Academic Year Details ---')
        const users = await prisma.user.findMany({
            where: {
                OR: mobiles.map(m => ({ mobileNumber: { contains: m.slice(-10) } }))
            }
        })

        for (const u of users) {
            console.log(`User: ${u.fullName} | Role: ${u.role} | AcademicYear: ${u.academicYear}`)
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
