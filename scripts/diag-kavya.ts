
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Diagnostic for Kavya: ${year} ---`)

        const user = await prisma.user.findFirst({
            where: { fullName: { contains: 'Kavya' } },
            include: {
                students: { where: { status: 'Active' }, include: { campus: true } },
                referrals: {
                    where: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        OR: [
                            { admittedYear: year },
                            { academicYear: year }
                        ]
                    }
                },
                settlements: true
            }
        })

        if (!user) {
            console.log('Kavya not found')
            return
        }

        console.log(`User: ${user.fullName} | Role: ${user.role} | AcademicYear: ${user.academicYear} | ChildInAchariya: ${user.childInAchariya} | childName: ${user.childName}`)
        console.log(`Referrals Count (Filtered): ${user.referrals.length}`)
        user.referrals.forEach(r => console.log(`  - LeadID: ${r.leadId} | Status: ${r.leadStatus} | Year: ${r.admittedYear}`))

        console.log(`Students Count (Direct Link): ${user.students.length}`)
        user.students.forEach(s => console.log(`  - Student: ${s.fullName} | Year: ${s.academicYear} | Fee: ${s.annualFee}`))

        // Check if student exists under different parent
        const fuzzyStudents = await prisma.student.findMany({
            where: { fullName: { contains: user.childName || 'MISSING', mode: 'insensitive' } }
        })
        console.log(`Fuzzy Student Matches Count: ${fuzzyStudents.length}`)
        fuzzyStudents.forEach(s => console.log(`  - Student: ${s.fullName} | parentId: ${s.parentId}`))

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
