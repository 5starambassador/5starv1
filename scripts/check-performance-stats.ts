import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Database Stats ---')
    const [users, settlements, students, referrals, payments] = await Promise.all([
        prisma.user.count(),
        prisma.settlement.count(),
        prisma.student.count(),
        prisma.referralLead.count(),
        prisma.payment.count()
    ])

    console.log(`Users: ${users}`)
    console.log(`Settlements: ${settlements}`)
    console.log(`Students: ${students}`)
    console.log(`ReferralLeads: ${referrals}`)
    console.log(`Payments: ${payments}`)
    
    // Check for "Global" or "Unknown" issues
    const globalAmbassadors = await prisma.user.count({
        where: { assignedCampus: { equals: 'Global', mode: 'insensitive' } }
    })
    console.log(`Ambassadors with 'Global' Campus: ${globalAmbassadors}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
