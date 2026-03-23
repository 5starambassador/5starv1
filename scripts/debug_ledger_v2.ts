import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    console.log("--- DEBUG LEDGER (2026-2027) ---")
    
    const yearFilter = '2026-2027'
    const referralYearFilter = { academicYear: yearFilter }
    
    // Exact Replicated Query Obj
    const queryObj = {
        AND: [
            {}, // Super Admin (No scope)
            {
                OR: [
                    {
                        referrals: {
                            some: {
                                leadStatus: { in: ['Confirmed', 'Admitted'] },
                                ...referralYearFilter
                            }
                        }
                    },
                    { childInAchariya: true }
                ]
            }
        ]
    }

    const count = await prisma.user.count({ where: queryObj as any })
    console.log(`Matching Users Found for ${yearFilter}: ${count}`)
    
    if (count > 0) {
        const samples = await prisma.user.findMany({ 
            where: queryObj as any, 
            take: 3,
            select: { userId: true, fullName: true, referrals: { where: { academicYear: yearFilter }, take: 1 } }
        })
        console.log("Samples:", JSON.stringify(samples, null, 2))
    }
    
    // Check if there are any referrals in this year for ANYONE
    const refCount = await prisma.referralLead.count({
        where: { academicYear: yearFilter, leadStatus: { in: ['Confirmed', 'Admitted'] } }
    })
    console.log(`Global Confirmed Referrals in ${yearFilter}: ${refCount}`)
}

debug().catch(console.error).finally(() => prisma.$disconnect())
