import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'

async function testAction() {
    console.log("--- CALLING SERVER ACTION DIRECTLY ---")
    // Note: This script will fail if getCurrentUser() returns null in non-request context.
    // I will mock the environment if needed, but first let's try direct call.
    try {
        const result = await getAccruedPayoutLiabilities('All', undefined, undefined)
        if (result.success) {

            console.log("SUCCESS! Total liabilities returned:", (result.data as any[]).length)
            if ((result.data as any[]).length > 0) {
                console.log("Example Record:", (result.data as any[])[0].fullName, "Group:", (result.data as any[])[0].group)
            } else {
                console.log("WARNING: 0 records returned for 'All' year.")
            }
        } else {
            console.error("FAILURE:", result.error)
        }
    } catch (e) {
        console.error("CRASH:", e)
    }
}

testAction().finally(() => process.exit())
