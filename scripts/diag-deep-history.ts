import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: 2026-2027 HISTORY AUDIT ---')
    
    // 1. Get the year record
    const year = await prisma.academicYear.findFirst({ where: { year: '2026-2027' } })
    console.log('Year Record:', year)
    
    if (!year) return

    // 2. Count ALL settlements in this date range regardless of status
    const allInRange = await prisma.settlement.count({
        where: { createdAt: { gte: year.startDate, lte: year.endDate } }
    })
    console.log('Total Settlements in 2026-2027 Date Range:', allInRange)

    // 3. Status breakdown in this range
    const rangeStats = await prisma.settlement.groupBy({
        by: ['status'],
        where: { createdAt: { gte: year.startDate, lte: year.endDate } },
        _count: { _all: true }
    })
    console.log('Status Breakdown in Date Range:', rangeStats)

    // 4. Sample some processed records in this range
    const samples = await prisma.settlement.findMany({
        where: { 
            createdAt: { gte: year.startDate, lte: year.endDate },
            status: 'Processed'
        },
        take: 5,
        include: { user: true }
    })
    console.log('Processed Samples for 2026-2027:', JSON.stringify(samples, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
