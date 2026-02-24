import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const usersWithConfirmed = await prisma.user.aggregate({
        _sum: { confirmedReferralCount: true }
    })

    const totalConfirmedLeads = await prisma.referralLead.count({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        }
    })

    const totalStudentsWithLead = await prisma.student.count({
        where: { referralLeadId: { not: null } }
    })

    console.log('Legacy Confirmed Count (User.confirmedReferralCount sum):', usersWithConfirmed._sum.confirmedReferralCount)
    console.log('Actual ReferralLead Records (Confirmed/Admitted):', totalConfirmedLeads)
    console.log('Actual Student Records linked to Leads:', totalStudentsWithLead)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
