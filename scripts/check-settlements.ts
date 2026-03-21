import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- SETTLEMENT CHECK ---')
    const settlements = await prisma.settlement.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            status: true,
            remarks: true,
            amount: true,
            payoutDate: true,
            createdAt: true
        }
    })
    
    console.table(settlements)
    
    const waiverCount = settlements.filter(s => s.remarks?.toLowerCase().includes('waiver')).length
    console.log(`Waivers in last 20: ${waiverCount}`)
    
    await prisma.$disconnect()
}

main()
