import { PrismaClient } from '@prisma/client'
import { calculateTotalBenefit } from '../lib/benefit-calculator'
const prisma = new PrismaClient()

async function main() {
    // Find Razia by name (Staff)
    const razia = await prisma.user.findFirst({
        where: { fullName: { contains: 'Razia' }, role: 'Staff' },
        include: {
            settlements: true,
            referrals: {
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    admittedYear: '2026-2027' // Check this year first
                }
            },
            students: true,
            referredStudents: true
        }
    })

    if (!razia) {
        console.log('Razia not found')
        return
    }

    console.log(`--- Ambassador: ${razia.fullName} (${razia.mobileNumber}) ---`)
    console.log(`Role: ${razia.role}, Child In Achariya: ${razia.childInAchariya}`)

    const slabs = await prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } })

    console.log(`\n--- Referrals Found in DB (Confirmed/Admitted for 2026-2027) ---`)
    razia.referrals.forEach(r => {
        console.log(`Parent: ${r.parentName}, Student: ${r.studentName}, Campus: ${r.campus}, Fee: ${r.annualFee}, Adm Collected: ${r.admissionFeeCollected}, Don Collected: ${r.donationFeeCollected}, Admitted Year: ${r.admittedYear}`)
    })

    // Also check other years just in case
    const allReferrals = await prisma.referralLead.findMany({
        where: { userId: razia.userId }
    })
    console.log(`\n--- All Referrals for Razia ---`)
    allReferrals.forEach(r => {
        console.log(`Parent: ${r.parentName}, Status: ${r.leadStatus}, Year: ${r.admittedYear}, Fee: ${r.annualFee}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
