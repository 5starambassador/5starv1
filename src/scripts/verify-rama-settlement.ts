import prisma from '../lib/prisma'
import { deduplicateSettlements } from '../lib/settlement-utils'
import { getAccruedPayoutLiabilitiesInternal } from '../app/finance-actions'

async function run() {
    console.log('=== VERIFYING G. RAMA (9790900990) FULL RECONCILIATION ===')
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '9790900990' },
        include: {
            settlements: true,
            referrals: {
                where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
                include: { student: true }
            }
        }
    })

    if (!user) return

    console.log(`Original Settlement Count: ${user.settlements.length} (Sum: ₹${user.settlements.reduce((sum, s) => sum + s.amount, 0)})`)
    const deduped = deduplicateSettlements(user.settlements)
    console.log(`Deduplicated Settlement Count: ${deduped.length} (Sum: ₹${deduped.reduce((sum, s) => sum + s.amount, 0)})`)
    deduped.forEach(s => {
        console.log(` -> ID: ${s.id} | Amount: ₹${s.amount} | UTR: ${s.bankReference} | Date: ${s.payoutDate}`)
    })

    const liabilitiesRes = await getAccruedPayoutLiabilitiesInternal(
        null,
        '2026-2027',
        '9790900990',
        undefined,
        1,
        10,
        'B'
    )

    if (liabilitiesRes.success && liabilitiesRes.data.length > 0) {
        const rama = liabilitiesRes.data[0]
        console.log('\n=== LIABILITIES RESULT ===')
        console.log(`Total Earned: ₹${rama.totalEarned}`)
        console.log(`Total Settled: ₹${rama.totalSettled}`)
        console.log(`Outstanding: ₹${rama.outstanding}`)
        console.log(`Slab Share: ₹${rama.slabShare}`)
        console.log(`Admission Share: ₹${rama.admissionShare}`)
        console.log(`Donation Share: ₹${rama.donationShare}`)
        console.log(`Confirmed Referrals: ${rama.confirmedReferralCount}`)
        console.log('Granular Referrals Count:', rama.referrals?.length)
        rama.referrals?.forEach((r: any) => {
            console.log(` -> Ref: ${r.studentName} | Slab%: ${r.slabPercent}% (₹${r.referralSlabValue}) | Adm: ₹${r.admShareValue} (Settled: ${r.isAdmissionSettled}) | Slab Settled: ${r.isSlabSettled} | PayoutStatus: ${r.payoutStatus}`)
        })
    } else {
        console.log('Liabilities result empty or failed:', liabilitiesRes)
    }
}

run().finally(() => prisma.$disconnect())
