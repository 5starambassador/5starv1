import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'

async function test() {
    console.log("--- TESTING LIVE ACTION ---")
    const res = await getAccruedPayoutLiabilities('2026-2027')
    if (res.success) {
        console.log(`Total Records Returned: ${res.data.length}`)
        if (res.data.length > 0) {
            console.log("Sample Groups:", Array.from(new Set(res.data.map((d: any) => d.group))))
            console.log("Sample Items:", JSON.stringify(res.data.slice(0, 2), null, 2))
        }
    } else {
        console.log("Error:", res.error)
    }
}

test().catch(console.error)
