import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkData(year: string) {
    const counts = {
        settlements: await prisma.settlement.count({ 
            where: { 
                referralLead: { academicYear: year }
            } 
        }),
        registrations: await prisma.referralLead.count({ 
            where: { academicYear: year } 
        }),
        liabilities: await prisma.user.count({ 
            where: { 
                referrals: { some: { academicYear: year, leadStatus: 'Confirmed' } } 
            } 
        })

    }
    console.log(`Data counts for ${year}:`, JSON.stringify(counts, null, 2))
}

async function main() {
    await checkData('2025-2026')
    await checkData('2026-2027')
    await prisma.$disconnect()
}

main()
