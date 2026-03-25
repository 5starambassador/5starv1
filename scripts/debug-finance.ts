import { getFinanceStats, getSettlements, getAccruedPayoutLiabilities, getRegistrationTransactions } from '../src/app/finance-actions'

async function debug() {
    console.log('--- Debugging Finance Actions ---')
    
    console.log('Testing getFinanceStats("2026-2027"):')
    const stats = await getFinanceStats('2026-2027')
    console.log(JSON.stringify(stats, null, 2))
    
    console.log('\nTesting getSettlements("Pending", "2026-2027"):')
    const settlements = await getSettlements('Pending', '2026-2027')
    console.log(`Count: ${settlements.success ? (settlements as any).data.length : 'Error'}`)

    console.log('\nTesting getAccruedPayoutLiabilities("2026-2027"):')
    const liabilities = await getAccruedPayoutLiabilities('2026-2027')
    console.log(`Count: ${liabilities.success ? (liabilities as any).data.length : 'Error'}`)

    console.log('\nTesting getRegistrationTransactions("All", "2026-2027"):')
    const regs = await getRegistrationTransactions('All', '2026-2027')
    console.log(`Count: ${regs.success ? (regs as any).data.length : 'Error'}`)
    
    // Test with "All" cycle
    console.log('\n--- Testing with "All" Cycle ---')
    const statsAll = await getFinanceStats('All')
    console.log(`Stats All Success: ${statsAll.success}`)
    console.log(JSON.stringify(statsAll, null, 2))
}

debug().catch(console.error).finally(() => process.exit(0))
