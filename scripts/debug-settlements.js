const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Academic Years ---')
    const years = await prisma.academicYear.findMany()
    console.table(years)

    const targetMobiles = ['9790900990', '8248764961', '9894224631', '8870246220']
    
    console.log('\n--- Target Users ---')
    const users = await prisma.user.findMany({
        where: { mobileNumber: { in: targetMobiles } },
        select: { userId: true, fullName: true, mobileNumber: true }
    })
    console.table(users)

    if (users.length === 0) {
        console.log('No users found.')
        return
    }

    const userIds = users.map(u => u.userId)
    
    console.log('\n--- Settlements for Target Users ---')
    const settlements = await prisma.settlement.findMany({
        where: { userId: { in: userIds } },
        include: { user: { select: { mobileNumber: true, fullName: true } } },
        orderBy: { createdAt: 'desc' }
    })
    
    const displaySettlements = settlements.map(s => ({
        id: s.id,
        mobile: s.user.mobileNumber,
        name: s.user.fullName,
        amount: s.amount,
        status: s.status,
        benefitType: s.benefitType,
        referralLeadId: s.referralLeadId, // Added for granular check
        payoutDate: s.payoutDate,
        createdAt: s.createdAt,
        bankRef: s.bankReference
    }))
    console.table(displaySettlements)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
