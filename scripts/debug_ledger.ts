import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    console.log("--- DEBUG LEDGER ---")
    
    // Attempting to replicate the query logic in getAccruedPayoutLiabilities
    const yearFilter = 'All'
    const search = undefined
    
    // Simulate typical Super Admin (no campus restriction)
    const queryObj = {
        AND: [
            {}, // No scope filter
            {
                OR: [
                    {
                        referrals: {
                            some: {
                                leadStatus: { in: ['Confirmed', 'Admitted'] }
                            }
                        }
                    },
                    { childInAchariya: true }
                ]
            }
        ]
    }

    const count = await prisma.user.count({ where: queryObj as any })
    console.log(`Matching Users Found: ${count}`)
    
    if (count > 0) {
        const samples = await prisma.user.findMany({ 
            where: queryObj as any, 
            take: 5,
            select: { userId: true, fullName: true, mobileNumber: true }
        })
        console.log("Samples:", JSON.stringify(samples, null, 2))
    }
}

debug().catch(console.error).finally(() => prisma.$disconnect())
