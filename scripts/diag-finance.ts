import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    console.log('--- Academic Years ---')
    const years = await prisma.academicYear.findMany()
    console.log(JSON.stringify(years, null, 2))

    console.log('\n--- Settlement Samples ---')
    const settlements = await prisma.settlement.findMany({
        take: 5,
        include: { referralLead: true }
    })
    console.log(JSON.stringify(settlements.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        payoutDate: s.payoutDate,
        benefitType: s.benefitType,
        referralYear: s.referralLead?.academicYear || s.referralLead?.admittedYear || 'N/A'
    })), null, 2))

    console.log('\n--- Totals ---')
    console.log(`User Count: ${await prisma.user.count()}`)
    console.log(`Settlement Count: ${await prisma.settlement.count()}`)
}

debug().catch(console.error).finally(() => prisma.$disconnect())
