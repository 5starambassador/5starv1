import { getFinanceStats, getSettlements } from '../src/app/finance-actions'

// Mock getCurrentUser for the script
import * as auth from '../src/lib/auth-service'
(auth as any).getCurrentUser = async () => ({
    userId: 1,
    role: 'Super Admin',
    fullName: 'Debug Admin'
})

async function test() {
    console.log('Testing 2026-2027...')
    const res = await getFinanceStats('2026-2027')
    console.log(JSON.stringify(res, null, 2))
    
    console.log('\nTesting All...')
    const resAll = await getFinanceStats('All')
    console.log(`Transactions for All: ${resAll.success ? (resAll as any).stats.totalCount : 'Error'}`)
    
    console.log('\nTesting Settlements (Pending, 2026-2027)...')
    const s = await getSettlements('Pending', '2026-2027')
    console.log(`Count: ${s.success ? (s as any).data.length : 'Error'}`)
}

test().catch(console.error)
