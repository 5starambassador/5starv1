import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const year = '2026-2027'
    const leads = await prisma.referralLead.findMany({
        where: { academicYear: year },
        take: 10
    })
    console.log(`First 10 leads for ${year}:`)
    leads.forEach(l => {
        console.log(`ID: ${l.leadId}, academicYear: ${l.academicYear}, admittedYear: ${l.admittedYear || 'NULL'}`)
    })
    await prisma.$disconnect()
}

main()
