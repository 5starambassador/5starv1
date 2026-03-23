import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: PROCESSED SETTLEMENTS BY YEAR ---')
    
    // 1. Check referralLead based years
    const byLead = await prisma.settlement.groupBy({
        by: ['status'],
        where: { referralLeadId: { not: null }, status: 'Processed' },
        _count: { _all: true }
    })
    console.log('Total Processed with Leads:', byLead)

    // 2. Sample some processed records to see their dates
    const samples = await prisma.settlement.findMany({
        where: { status: 'Processed' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, referralLead: { select: { academicYear: true } } }
    })
    console.log('Recent Processed Samples:', JSON.stringify(samples, null, 2))

    // 3. Check Academic Year definitions
    const years = await prisma.academicYear.findMany()
    console.log('Academic Year Ranges:', JSON.stringify(years, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
