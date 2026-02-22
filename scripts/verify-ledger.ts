import { PrismaClient } from '@prisma/client'
import { getAmbassadorLedger } from '../src/app/financial-actions'

const prisma = new PrismaClient()

async function main() {
    console.log('--- AUDITING AMBASSADOR LEDGER LOGIC ---')

    // Find a user with referrals
    const testUser = await prisma.user.findFirst({
        where: {
            referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] } } }
        },
        include: { referrals: true, settlements: true }
    })

    if (!testUser) {
        console.log('No eligible test user found. Please ensure some referrals are confirmed.')
        return
    }

    console.log(`Auditing User: ${testUser.fullName} (ID: ${testUser.userId})`)
    console.log(`Raw Referral Count: ${testUser.referrals.length}`)
    console.log(`Raw Settlement Count: ${testUser.settlements.length}`)

    // Simulate calling the ledger action (bypassing auth for script)
    // Note: We'll wrap the logic if needed or just use the same logic here
    const res = await getAmbassadorLedger(testUser.userId)

    if (res.success && res.data) {
        const { ledger, summary } = res.data
        console.log('\n--- LEDGER SUMMARY ---')
        console.log(`Total Earned:  ₹${summary.totalEarned}`)
        console.log(`Total Settled: ₹${summary.totalSettled}`)
        console.log(`Outstanding:   ₹${summary.outstanding}`)
        console.log(`Entries:       ${ledger.length}`)

        console.log('\n--- TOP 5 TRANSACTIONS ---')
        ledger.slice(0, 5).forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString()
            const prefix = item.direction === 'IN' ? '[+]' : '[-]'
            console.log(`${prefix} ${dateStr} | ${item.type.padEnd(8)} | ₹${item.amount.toString().padEnd(8)} | ${item.remarks}`)
            if (item.remarks && item.remarks.includes('[BREAKDOWN:')) {
                console.log(`    ↳ Breakdown: ${item.remarks.split('[BREAKDOWN:')[1].split(']')[0]}`)
            }
        })
    } else {
        console.error('Ledger generation failed:', res.error)
    }

    // Secondary check: Find a settlement with a breakdown
    const breakdownSettlement = await prisma.settlement.findFirst({
        where: { remarks: { contains: '[BREAKDOWN:' } }
    })

    if (breakdownSettlement) {
        console.log('\n--- VERIFIED PERSISTED BREAKDOWN ---')
        console.log(`Found Settlement ID: ${breakdownSettlement.id}`)
        console.log(`Remarks: ${breakdownSettlement.remarks}`)
    } else {
        console.log('\n[INFO] No persisted breakdowns found yet (requires UI action trigger).')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
