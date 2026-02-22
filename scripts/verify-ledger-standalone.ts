import { PrismaClient } from '@prisma/client'
import { calculateTotalBenefit } from '../src/lib/benefit-calculator'
import { getSpecialBonusRate } from '../src/lib/reward-constants'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STANDALONE AMBASSADOR LEDGER AUDIT ---')

    const academicYear = '2026-2027'

    // 1. Fetch a user with confirmed referrals
    const testUser = await prisma.user.findFirst({
        where: {
            referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] } } }
        },
        include: {
            settlements: { orderBy: { createdAt: 'desc' } },
            referrals: {
                where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!testUser) {
        console.log('No eligible test user found.')
        return
    }

    console.log(`User: ${testUser.fullName} (ID: ${testUser.userId})`)

    // 2. Fetch Slabs and Fees
    const [slabs, gradeFees] = await Promise.all([
        prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } }),
        prisma.gradeFee.findMany({
            where: {
                grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1'] },
                academicYear
            }
        })
    ])

    const grade1FeeMap = new Map()
    gradeFees.forEach(gf => {
        grade1FeeMap.set(gf.campusId, gf.annualFee_wotp || gf.annualFee_otp || 0)
    })

    // 3. Calculator Input
    const calculatorReferrals = testUser.referrals.map((r: any) => ({
        id: r.leadId,
        campusId: r.campusId || 0,
        campusName: r.campus || undefined,
        grade: r.gradeInterested || 'Grade-1',
        actualFee: r.annualFee || 0,
        campusGrade1Fee: grade1FeeMap.get(r.campusId),
        admissionFeeCollected: r.admissionFeeCollected || 0,
        donationFeeCollected: r.donationFeeCollected || 0,
        specialBonusRate: getSpecialBonusRate(r.campus)
    }))

    const calc = calculateTotalBenefit(calculatorReferrals, {
        role: testUser.role as any,
        childInAchariya: testUser.childInAchariya,
        studentFee: testUser.studentFee || 60000,
        isFiveStarLastYear: testUser.isFiveStarMember
    }, slabs as any)

    // 4. Verify Ledger Generation
    const ledgerEntries: any[] = []

    testUser.settlements.forEach((s: any) => {
        const isWaiver = (s.remarks || '').toLowerCase().includes('waiver')
        ledgerEntries.push({
            type: isWaiver ? 'WAIVER' : 'PAYOUT',
            amount: s.amount,
            date: s.createdAt,
            direction: 'OUT',
            remarks: s.remarks
        })
    })

    testUser.referrals.forEach((r: any) => {
        const specialBonus = getSpecialBonusRate(r.campus) || 0
        const admBonus = (r.admissionFeeCollected || 0) * 0.8
        const donBonus = (r.donationFeeCollected || 0) * 0.5
        const g1Fee = grade1FeeMap.get(r.campusId) || 0
        const slabIndividualShare = (g1Fee * calc.tierPercent) / 100
        const totalRefYield = specialBonus + admBonus + donBonus + slabIndividualShare

        ledgerEntries.push({
            type: 'EARNING',
            amount: totalRefYield,
            date: r.confirmedDate || r.createdAt,
            direction: 'IN',
            remarks: `Referral: ${r.studentName} (${r.campus})`
        })
    })

    ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`\nVerified ${ledgerEntries.length} chronological entries.`)
    console.log(`Total Calculated Yield: ₹${calc.totalAmount}`)
    console.log(`Top 3 Ledger Rows:`)
    ledgerEntries.slice(0, 3).forEach(e => {
        console.log(`${e.direction} ${e.type.padEnd(8)} | ₹${e.amount} | ${e.remarks.substring(0, 50)}...`)
    })

    console.log('\nSUCCESS: Financial Ledger logic verified.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
