import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Admitted Year Distribution for Confirmed/Admitted Leads ---')
    const leads = await prisma.referralLead.findMany({
        where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
        select: { admittedYear: true }
    })

    const stats: Record<string, number> = {}
    leads.forEach(l => {
        const year = l.admittedYear || 'NULL'
        stats[year] = (stats[year] || 0) + 1
    })

    console.log(JSON.stringify(stats, null, 2))

    console.log('\n--- Group B Confirmed/Admitted Leads details ---')
    const bLeads = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] },
            user: { childInAchariya: false }
        },
        include: {
            user: { select: { fullName: true } }
        }
    })

    bLeads.forEach(l => {
        console.log(`User: ${l.user.fullName}, Status: ${l.leadStatus}, Year: ${l.admittedYear}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
