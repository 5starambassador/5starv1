
import { exportLiabilities } from '../src/app/export-actions'

async function main() {
    try {
        console.log('--- Verifying Export with Referral Details ---')

        // Call exportLiabilities (using a wide date range to catch data)
        const start = new Date('2024-01-01')
        const end = new Date('2026-12-31')

        const res = await exportLiabilities(start, end, ['fullName', 'referrals', 'referralDetails'], '2025-2026')

        if (res.success && res.csv) {
            console.log('Export Success!')
            console.log('CSV Sample (First 5 lines):')
            const lines = res.csv.split('\n')
            lines.slice(0, 5).forEach(l => console.log(l))

            // Check if any line has multiple students
            const linesWithDetails = lines.filter(l => l.includes('(') && l.includes(')'))
            if (linesWithDetails.length > 0) {
                console.log(`\nFound ${linesWithDetails.length} rows with referral details.`)
                console.log('Referral Detail Example:', linesWithDetails[0])
            } else {
                console.log('\nNo rows with detailed referrals found. Check if test data has confirmed referrals.')
            }
        } else {
            console.log('Export failed:', res.error)
        }

    } catch (err) {
        console.error(err)
    }
}

main()
