import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
    // Check recent settlements (last 5)
    const s = await (p.settlement as any).findMany({
        orderBy: { id: 'desc' },
        take: 5,
        select: { id: true, userId: true, amount: true, status: true, benefitType: true, referralLeadId: true, remarks: true }
    })
    console.log('--- Recent Settlements ---')
    console.log(JSON.stringify(s, null, 2))
}

main().catch(console.error).finally(() => p.$disconnect())
