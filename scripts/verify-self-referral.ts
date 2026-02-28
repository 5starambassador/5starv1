
import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'

async function verify() {
    console.log('--- Verifying Self-Referral Exclusion ---')
    try {
        const res = await getAccruedPayoutLiabilities('2025-2026', 'Aswini')
        if (res.success && res.data) {
            const aswini = res.data.find((l: any) => l.fullName.includes('Aswini'))
            if (aswini) {
                console.log('FAIL: Aswini J still appears in liabilities!')
                console.log(`Referral Count: ${aswini.confirmedReferralCount}`)
                console.log(`Total Earned: ${aswini.totalEarned}`)
            } else {
                console.log('SUCCESS: Aswini J is excluded from liabilities (assuming she had 0 external referrals).')
            }
        } else {
            console.log('Error fetching liabilities:', res.error)
        }
    } catch (err) {
        console.error('Test error:', err)
    }
}

verify()
