import { getRegistrationTransactions } from './src/app/finance-actions'

async function debug() {
    // Search for something broad like a space or 'parent' 
    // Wait, role is not in the search Filter. We can search "asm " for campus.
    const res = await getRegistrationTransactions('All', 'All', 'asm', 1, 20, 'registrations')
    if (res.success && res.data) {
        console.log(`Returned data length: ${res.data.length}`)
        console.log(`Total count reported by server: ${res.totalCount}`)
    }
}

debug().catch(console.error).finally(() => process.exit(0))
