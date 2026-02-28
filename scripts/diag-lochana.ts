
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Diagnostic for Lochana: ${year} ---`)

        const user = await prisma.user.findFirst({
            where: { fullName: { contains: 'Lochana' } },
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
            console.log('Lochana not found')
            return
        }

        console.log(`User: ${user.fullName} | Role: ${user.role} | AcademicYear: ${user.academicYear} | ChildInAchariya: ${user.childInAchariya}`)
        console.log(`Referrals Count (Filtered): ${user.referrals.length}`)
        user.referrals.forEach(r => console.log(`  - LeadID: ${r.leadId} | Status: ${r.leadStatus} | Year: ${r.admittedYear}`))

        console.log(`Students Count: ${user.students.length}`)
        user.students.forEach(s => console.log(`  - Student: ${s.fullName} | Year: ${s.academicYear} | Fee: ${s.annualFee}`))

        // Mocking the Group A/B logic
        const isGroupAEligible = user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)
        console.log(`Group A Eligible: ${isGroupAEligible}`)

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
