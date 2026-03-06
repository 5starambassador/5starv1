import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
    // Check academic years
    const years = await p.academicYear.findMany({ orderBy: { year: 'desc' }, take: 3 })
    console.log('Academic Years:', JSON.stringify(years, null, 2))

    // Check recent processed settlements
    const s = await (p.settlement as any).findMany({
        where: { status: 'Processed' },
        orderBy: { id: 'desc' },
        take: 5,
        select: { id: true, amount: true, status: true, benefitType: true, createdAt: true, remarks: true }
    })
    console.log('Recent Processed Settlements:', JSON.stringify(s, null, 2))
}

main().catch(console.error).finally(() => p.$disconnect())
