import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const academicYear = '2026-2027'

    const leads = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            admittedYear: academicYear
        },
        include: {
            student: true
        }
    })

    console.log(`Checking ${leads.length} leads for year mismatches...`)

    leads.forEach(l => {
        if (!l.student) {
            console.log(`Lead ${l.leadId} (${l.studentName}) has NO student record.`)
        } else if (l.student.academicYear !== academicYear) {
            console.log(`MISMATCH: Lead ${l.leadId} (${l.studentName})`)
            console.log(`  Lead admittedYear: ${l.admittedYear}`)
            console.log(`  Student academicYear: ${l.student.academicYear}`)
        }
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
