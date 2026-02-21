import { PrismaClient } from '@prisma/client'
import { calculateTotalBenefit } from '../lib/benefit-calculator'
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({
        where: { fullName: { contains: 'Mathivannan M' } },
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

    if (!u) {
        console.log('User not found')
        return
    }

    const slabs = await prisma.benefitSlab.findMany({
        orderBy: { referralCount: 'asc' }
    })

    console.log(`Analyzing User: ${u.fullName} (Group ${u.childInAchariya ? 'A' : 'B'})`)
    console.log(`Referrals count (2026-2027 Confirmed/Admitted): ${u.referrals.length}`)

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

    const totalSettled = u.settlements.reduce((acc, s) => acc + (s.amount || 0), 0)
    const remaining = Math.max(0, calcResult.totalAmount - totalSettled)

    console.log('Calculation Result:', JSON.stringify(calcResult, null, 2))
    console.log(`Total Settled: ${totalSettled}`)
    console.log(`Remaining: ${remaining}`)
    console.log(`Should show: ${remaining > 0}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
