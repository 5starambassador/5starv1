const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- ACADEMIC YEARS ---')
    const years = await prisma.academicYear.findMany()
    console.table(years)

    console.log('\n--- SAMPLE REFERRALS ---')
    const referrals = await prisma.referralLead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { leadId: true, admittedYear: true, createdAt: true }
    })
    console.table(referrals)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
