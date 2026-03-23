import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: SETTLEMENT STATUS DISTRIBUTION ---')
    const stats = await prisma.settlement.groupBy({
        by: ['status'],
        _count: { _all: true }
    })
    console.log(JSON.stringify(stats, null, 2))

    console.log('\n--- DIAGNOSTIC: TARGET DATA CHECK (Pending) ---')
    const pending = await prisma.settlement.findMany({
        where: { status: { in: ['Pending', 'PENDING'] } },
        take: 3,
        select: { id: true, status: true, benefitType: true, createdAt: true }
    })
    console.log('Pending Samples:', JSON.stringify(pending, null, 2))

    console.log('\n--- DIAGNOSTIC: TARGET DATA CHECK (Processed) ---')
    const processed = await prisma.settlement.findMany({
        where: { status: { in: ['Processed', 'SUCCESS', 'Confirmed', 'paid', 'PAID'] } },
        take: 3,
        select: { id: true, status: true, benefitType: true, createdAt: true }
    })
    console.log('Processed Samples:', JSON.stringify(processed, null, 2))

    console.log('\n--- DIAGNOSTIC: GROUP A/B USER COUNTS ---')
    const groupA = await prisma.user.count({
        where: { role: { in: ['Parent', 'Staff'] as any }, childInAchariya: true }
    })
    const groupB = await prisma.user.count({
        where: { NOT: { role: { in: ['Parent', 'Staff'] as any }, childInAchariya: true } }
    })
    console.log('Group A Count:', groupA)
    console.log('Group B Count:', groupB)

    // Check if any users are getting misidentified
    const sampleA = await prisma.user.findFirst({
        where: { role: { in: ['Parent', 'Staff'] as any }, childInAchariya: true },
        select: { fullName: true, role: true, childInAchariya: true }
    })
    console.log('Sample Group A User:', sampleA)
}

main().catch(console.error).finally(() => prisma.$disconnect())
