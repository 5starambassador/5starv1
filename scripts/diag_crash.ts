import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'

async function check() {
    console.log("--- RUNTIME TEST ---")
    try {
        const res = await getAccruedPayoutLiabilities('2026-2027')
        console.log("Success:", res.success)
        if (res.success) {
            console.log("Count:", res.data?.length)
        } else {
            console.log("Error:", res.error)
        }
    } catch (e: any) {
        console.error("FATAL CRASH:", e.message)
    }
}

check()
