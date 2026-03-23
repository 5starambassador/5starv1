import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: PROCESSED SETTLEMENTS AUDIT ---')
    
    // 1. Check for settlements missing userId
    const missingUser = await prisma.settlement.count({
        where: { status: 'Processed', userId: null }
    })
    console.log('Processed without userId:', missingUser)

    // 2. Check for settlements with invalid status strings
    const allStatuses = await prisma.settlement.groupBy({
        by: ['status'],
        _count: { _all: true }
    })
    console.log('All Statuses in DB:', allStatuses)

    // 3. Count matching 2026-2027 specifically using the logic from our action
    const yearRecord = await prisma.academicYear.findUnique({
        where: { year: '2026-2027' }
    })
    
    if (yearRecord) {
        const countManual = await prisma.settlement.count({
            where: {
                status: { in: ['Processed', 'SUCCESS', 'Confirmed', 'paid', 'PAID'] as any },
                userId: { not: null },
                OR: [
                    { referralLead: { academicYear: '2026-2027' } },
                    { createdAt: { gte: yearRecord.startDate, lte: yearRecord.endDate }, referralLeadId: null }
                ]
            }
        })
        console.log('Expected History Count for 2026-2027:', countManual)
        
        if (countManual > 0) {
            const sampleMatch = await prisma.settlement.findFirst({
                where: {
                    status: { in: ['Processed', 'SUCCESS', 'Confirmed', 'paid', 'PAID'] as any },
                    userId: { not: null },
                    OR: [
                        { referralLead: { academicYear: '2026-2027' } },
                        { createdAt: { gte: yearRecord.startDate, lte: yearRecord.endDate }, referralLeadId: null }
                    ]
                },
                include: { user: true }
            })
            console.log('Sample Match:', JSON.stringify(sampleMatch, null, 2))
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
