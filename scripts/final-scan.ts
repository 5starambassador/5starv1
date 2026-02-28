
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Final Year Scan ---')
        const leads = await prisma.referralLead.findMany({
            where: { admittedYear: { not: null } },
            select: { admittedYear: true, leadId: true }
        })

        const suspect = leads.filter(l => l.admittedYear && (l.admittedYear.length < 9 || !l.admittedYear.includes('-')))
        console.log(`Leads with suspect admittedYear: ${suspect.length}`)
        suspect.forEach(s => console.log(`LeadID: ${s.leadId} | Year: ${s.admittedYear}`))

        const students = await prisma.student.findMany({
            where: { academicYear: { not: null } },
            select: { academicYear: true, studentId: true }
        })

        const suspectStudents = students.filter(s => s.academicYear && (s.academicYear.length < 9 || !s.academicYear.includes('-')))
        console.log(`Students with suspect academicYear: ${suspectStudents.length}`)
        suspectStudents.forEach(s => console.log(`StudentID: ${s.studentId} | Year: ${s.academicYear}`))

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
