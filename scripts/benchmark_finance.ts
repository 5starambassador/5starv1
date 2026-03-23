import { getAccruedPayoutLiabilities } from '../src/app/finance-actions'

async function benchmark() {
    console.log('--- STARTING PERFORMANCE BENCHMARK (getAccruedPayoutLiabilities) ---')
    const start = Date.now()
    
    try {
        // Measure with 'All' year filter to trigger maximum load
        const result = await getAccruedPayoutLiabilities('All')
        
        const end = Date.now()
        const duration = (end - start) / 1000
        
        if (result.success && result.data) {
            console.log(`\nSUCCESS!`)
            console.log(`Found: ${result.data.length} liabilities`)
            console.log(`Execution Time: ${duration.toFixed(2)} seconds`)
            
            // Check specific student (Darshni) if present
            const darshni = (result.data as any[]).find(u => u.mobileNumber === '8675762030')
            if (darshni) {
                console.log(`\n--- DARSHNI RECORD ---`)
                console.log(`Name: ${darshni.fullName}`)
                console.log(`Child: ${darshni.childName || 'NOT LINKED'}`)
                console.log(`Earnings: ${darshni.totalEarnings || 0}`)
            } else {
                console.log('\nDarshni (8675762030) not found in the list.')
            }
        } else {
            console.error(`FAILED: ${result.error || 'Unknown error'}`)
        }
    } catch (err: any) {
        console.error('CRITICAL ERROR:', err.message)
    }
}

benchmark()
    .then(() => process.exit(0))
    .catch(console.error)
