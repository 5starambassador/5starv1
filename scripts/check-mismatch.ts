import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const totalConfirmedLeads = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        }
    })

    const confirmedLeadsWithStudent = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            student: { isNot: null }
        }
    })

    const confirmedLeadsWithoutStudent = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            student: { is: null }
        }
    })

    const totalStudents = await prisma.student.count()
    const referralStudents = await prisma.student.count({
        where: { referralLeadId: { not: null } }
    })
    const organicStudents = await prisma.student.count({
        where: { referralLeadId: null }
    })

    console.log('--- Referral Leads ---')
    console.log('Total Confirmed/Admitted Leads:', totalConfirmedLeads)
    console.log('Confirmed Leads with Student record:', confirmedLeadsWithStudent)
    console.log('Confirmed Leads missing Student record:', confirmedLeadsWithoutStudent)

    console.log('\n--- Students ---')
    console.log('Total Students in Student table:', totalStudents)
    console.log('Referral Students (linked to lead):', referralStudents)
    console.log('Organic Students (no lead):', organicStudents)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
