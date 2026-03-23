import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    console.log("--- SYSTEM YEAR CHECK ---")
    const years = await prisma.academicYear.findMany()
    console.log("Registered Years:", years.map(y => y.year))
    
    const sampleReferral = await prisma.referralLead.findFirst({
        where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
        select: { academicYear: true, leadStatus: true }
    })
    console.log("Sample Referral Year Format:", sampleReferral?.academicYear)
    
    const count2627 = await prisma.referralLead.count({
        where: { academicYear: '2026-2027', leadStatus: { in: ['Confirmed', 'Admitted'] } }
    })
    console.log(`Count for '2026-2027': ${count2627}`)
}

check().catch(console.error).finally(() => prisma.$disconnect())
