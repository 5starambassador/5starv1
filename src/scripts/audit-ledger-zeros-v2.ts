import { PrismaClient } from '@prisma/client'
import { calculateTotalBenefit } from '../lib/benefit-calculator'
const prisma = new PrismaClient()

async function main() {
    const mobiles = ['7708838990', '9500395309', '9176188910', '8058126862']
    const users = await prisma.user.findMany({
        where: { mobileNumber: { in: mobiles } },
        include: {
            settlements: true,
            referrals: {
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] },
                    admittedYear: '2026-2027'
                }
            }
        }
    })

    const slabs = await prisma.benefitSlab.findMany({
        orderBy: { referralCount: 'asc' }
    })

    for (const u of users) {
        console.log(`\n--- Auditing User: ${u.fullName} (${u.mobileNumber}) ---`)
        console.log(`Role: ${u.role}, childInAchariya: ${u.childInAchariya}, studentFee: ${u.studentFee}`)
        console.log(`Referrals (2026-2027 Confirmed/Admitted): ${u.referrals.length}`)

        u.referrals.forEach(r => {
            console.log(`  * Lead: ${r.parentName}, Status: ${r.leadStatus}, Admission Fee: ${r.admissionFeeCollected}, Donation Fee: ${r.donationFeeCollected}, Campus: ${r.campus}`)
        })

        const currentReferrals = u.referrals.map(r => ({
            id: r.leadId,
            campusId: r.campusId || 0,
            campusName: r.campus || undefined,
            grade: r.gradeInterested || 'Grade-1',
            actualFee: r.annualFee || 60000,
            campusGrade1Fee: 60000,
            admissionFeeCollected: r.admissionFeeCollected || 0,
            donationFeeCollected: r.donationFeeCollected || 0
        }))

        const calcResult = calculateTotalBenefit(currentReferrals, {
            role: u.role as any,
            childInAchariya: u.childInAchariya,
            studentFee: u.studentFee || 60000,
            isFiveStarLastYear: u.isFiveStarMember
        }, slabs as any)

        console.log('Calculation Breakdown:', calcResult.breakdown)
        console.log('Slab Share:', calcResult.slabShare)
        console.log('Total Yield:', calcResult.totalAmount)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
