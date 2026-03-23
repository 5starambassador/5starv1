import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    console.log("--- ROLE AUDIT (2026-2027) ---")
    const year = '2026-2027'
    
    const refs = await prisma.referralLead.findMany({
        where: {
            academicYear: year,
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        },
        include: { user: true }
    })
    
    const roleStats: any = {}
    refs.forEach(r => {
        const role = r.user?.role || 'UNKNOWN'
        roleStats[role] = (roleStats[role] || 0) + 1
    })
    console.log("Referral Counts by Role:", roleStats)
}

check()
