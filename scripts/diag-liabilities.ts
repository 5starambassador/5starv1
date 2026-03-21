import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'

async function run() {
    console.log('--- Testing Liabilities for 2026-2027 ---')
    const res = await getAccruedPayoutLiabilities('2026-2027')
    if (res.success) {
        console.log(`Success: Found ${res.data?.length} records`)
        if (res.data && res.data.length > 0) {
            console.log('Sample Record:', JSON.stringify(res.data[0], null, 2))
        }
    } else {
        console.log('Error:', res.error)
    }
}

run().catch(console.error)
