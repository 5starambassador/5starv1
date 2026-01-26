
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("--- CHECKING STUDENTS ---")

    // 1. Count Students linked to an Ambassador
    const referredStudents = await prisma.student.count({
        where: { ambassadorId: { not: null } }
    })
    console.log(`Students with an Ambassador (ambassadorId set): ${referredStudents}`)

    // 2. Total Students
    const totalStudents = await prisma.student.count()
    console.log(`Total Students in DB: ${totalStudents}`)

    // 3. Do we have users with HIGH referral counts but NO Student records?
    // Let's check M. Ashokumar (ID 1205) who has 7 credits.
    const ashokStudents = await prisma.student.count({
        where: { ambassadorId: 1205 }
    })
    console.log(`M. Ashokumar (ID 1205) - Credits: 7, Students Linked: ${ashokStudents}`)

    console.log("--- DONE ---")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
