import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    console.log("--- DIRECT DB AUDIT (2026-2027) ---")
    const year = '2026-2027'
    
    const count = await prisma.referralLead.count({
        where: {
            academicYear: year,
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        }
    })
    console.log(`REFERRAL COUNT (${year}):`, count)
    
    if (count > 0) {
        const samples = await prisma.referralLead.findMany({
            where: {
                academicYear: year,
                leadStatus: { in: ['Confirmed', 'Admitted'] }
            },
            take: 5,
            select: { leadId: true, userId: true, parentName: true, academicYear: true }
        })
        console.log("SAMPLE RECORDS:", samples)
        
        const sampleUserIds = samples.map(s => s.userId)
        const users = await prisma.user.findMany({
            where: { userId: { in: sampleUserIds } },
            select: { userId: true, fullName: true, childInAchariya: true }
        })
        console.log("MATCHING USERS:", users)
    }
}

check()
