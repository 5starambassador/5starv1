
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Searching for Saivik C ---')

        // 1. Search by Name
        const students = await prisma.student.findMany({
            where: { fullName: { contains: 'SAIVIK', mode: 'insensitive' } },
            include: { parent: true, campus: true }
        })

        students.forEach(s => {
            console.log(`Student: ${s.fullName} | ERP: ${s.admissionNumber} | Academic Year: ${s.academicYear}`)
            console.log(`  - Parent: ${s.parent?.fullName} (${s.parent?.mobileNumber})`)
            console.log(`  - Relation in DB: ${s.parentId}`)
        })

        // 2. Search by ERP 
        const byEpr = await prisma.student.findFirst({
            where: { admissionNumber: '25ASMALP022' },
            include: { parent: true }
        })
        if (byEpr) {
            console.log(`\nFound by ERP 25ASMALP022:`)
            console.log(`  - FullName: ${byEpr.fullName}`)
            console.log(`  - Parent: ${byEpr.parent?.fullName} (${byEpr.parent?.mobileNumber})`)
        }

        // 3. Search Users for Aswini
        const aswinis = await prisma.user.findMany({
            where: { fullName: { contains: 'Aswini', mode: 'insensitive' } }
        })
        aswinis.forEach(u => {
            console.log(`\nAswini User: ${u.fullName} | ID: ${u.userId} | Mob: ${u.mobileNumber} | ChildName: ${u.childName}`)
        })

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
