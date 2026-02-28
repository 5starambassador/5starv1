
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { fullName: { contains: 'Lochana' } }
        })

        if (!user) {
            console.log('User Lochana not found')
            return
        }

        console.log(`Lochana userId: ${user.userId} | Mobile: ${user.mobileNumber} | ChildName: ${user.childName}`)

        const studentByParentId = await prisma.student.findMany({
            where: { parentId: user.userId }
        })
        console.log(`Students found by parentId(${user.userId}): ${studentByParentId.length}`)
        studentByParentId.forEach(s => console.log(`  - StudentID: ${s.studentId} | Name: ${s.fullName} | parentId: ${s.parentId}`))

        const studentByMobile = await prisma.student.findMany({
            where: { parent: { mobileNumber: user.mobileNumber } }
        })
        console.log(`Students found by parent mobile(${user.mobileNumber}): ${studentByMobile.length}`)
        studentByMobile.forEach(s => console.log(`  - StudentID: ${s.studentId} | Name: ${s.fullName} | parentId: ${s.parentId}`))

        const studentByName = await prisma.student.findMany({
            where: { fullName: { contains: user.childName || 'MISSING_NAME', mode: 'insensitive' } }
        })
        console.log(`Students found by childName(${user.childName}): ${studentByName.length}`)
        studentByName.forEach(s => console.log(`  - StudentID: ${s.studentId} | Name: ${s.fullName} | parentId: ${s.parentId}`))

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
