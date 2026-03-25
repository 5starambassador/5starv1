import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    console.log('--- Raw Prisma Counts ---')
    const userCount = await prisma.user.count()
    const settlementCount = await prisma.settlement.count()
    const paymentCount = await prisma.payment.count()
    const referralCount = await prisma.referralLead.count()
    
    console.log(`Users: ${userCount}`)
    console.log(`Settlements: ${settlementCount}`)
    console.log(`Payments: ${paymentCount}`)
    console.log(`Referrals: ${referralCount}`)

    console.log('\n--- Testing Settlement Query ---')
    const s1 = await prisma.settlement.findMany({
        where: { status: 'Pending' },
        take: 10
    })
    console.log(`Pending Settlements (take 10): ${s1.length}`)

    console.log('\n--- Testing Liability Query ---')
    const l1 = await prisma.user.findMany({
        where: {
            OR: [
                { referrals: { some: { leadStatus: 'Confirmed' } } },
                { childInAchariya: true }
            ]
        },
        take: 10
    })
    console.log(`Users with liability potential: ${l1.length}`)
}

debug().catch(console.error).finally(() => prisma.$disconnect())
