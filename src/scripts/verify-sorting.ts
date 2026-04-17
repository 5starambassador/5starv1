import { getAccruedPayoutLiabilities } from '../app/finance-actions'

async function main() {
    console.log('--- Verifying Liability Ledger Sorting & NEW flag ---')
    
    // Test Group B
    console.log('\nFetching Group B Liabilities...')
    const resB = await getAccruedPayoutLiabilities('All', undefined, undefined, 1, 10, 'B')
    
    if (resB.success && resB.data) {
        console.log(`Success! Fetched ${resB.data.length} records.`)
        
        // Print top 5 with activity date and isNew flag
        console.log('\nTop 5 Records (Sorted by Latest Activity):')
        resB.data.slice(0, 5).forEach((item: any, idx: number) => {
            console.log(`${idx + 1}. ${item.fullName} | Last Activity: ${new Date(item.latestActivityDate).toLocaleString()} | isNew: ${item.isNew}`)
        })
        
        // Verify sorting
        let sortedMatch = true
        for (let i = 0; i < resB.data.length - 1; i++) {
            if (resB.data[i].latestActivityDate < resB.data[i+1].latestActivityDate) {
                sortedMatch = false
                break
            }
        }
        console.log(`\nSorted correctly (descending): ${sortedMatch ? '✅' : '❌'}`)
    } else {
        console.error('Failed to fetch Group B:', resB.error)
    }
}

main().catch(console.error)
