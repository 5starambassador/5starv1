import { getRegistrationTransactions } from '../src/app/finance-actions'

async function test() {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres" // Dummy URL if needed, but tsx should pick up .env
    const res = await getRegistrationTransactions('All', '2026-2027')
    console.log('Result success:', res.success)
    if (res.success) {
        console.log('Data length:', res.data.length)
        if (res.data.length > 0) {
            console.log('First record snippet:', {
                userId: res.data[0].userId,
                fullName: res.data[0].fullName,
                referralsCount: res.data[0].referrals?.length
            })
        }
    } else {
        console.log('Error:', res.error)
    }
}

test()
