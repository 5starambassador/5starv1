
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const mobiles = ["7598326022", "7708838990", "8248764961", "9003977098", "9047585092", "9597150068"]
        const academicYear = "2026-2027"

        console.log('--- Referrers Detailed Check ---')
        for (const mobile of mobiles) {
            const user = await prisma.user.findFirst({
                where: { mobileNumber: { contains: mobile.slice(-10) } },
                include: {
                    students: true,
                    referrals: {
                        where: { leadStatus: { in: ['Confirmed', 'Admitted'] }, admittedYear: academicYear }
                    }
                }
            })
            if (user) {
                console.log(`User: ${user.fullName} | Role: ${user.role} | ChildInAchariya: ${user.childInAchariya} | Students: ${user.students.length} | Confirmed Referrals: ${user.referrals.length}`)
            } else {
                console.log(`Mobile ${mobile} not found`)
            }
        }

        console.log('\n--- GradeFee Check for TRICHY (ID: 120) ---')
        const fees = await prisma.gradeFee.findMany({
            where: { campusId: 120, academicYear: academicYear }
        })
        console.log(JSON.stringify(fees, null, 2))

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
