import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const year = '2026-2027'
    const totalByAcademicYear = await prisma.referralLead.count({ where: { academicYear: year } })
    const totalByAdmittedYear = await prisma.referralLead.count({ where: { admittedYear: year } })
    console.log(`2026-2027 Leads (academicYear): ${totalByAcademicYear}`)
    console.log(`2026-2027 Leads (admittedYear): ${totalByAdmittedYear}`)
    await prisma.$disconnect()
}

main()
