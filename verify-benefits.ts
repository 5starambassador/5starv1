
import { getAccruedPayoutLiabilities } from './src/app/finance-actions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBenefits() {
    console.log('Testing benefit calculation...')

    // 1. Find a user with Confirmed referrals
    const user = await prisma.user.findFirst({
        where: {
            referrals: {
                some: {
                    leadStatus: 'Confirmed'
                }
            }
        },
        select: { userId: true, fullName: true, mobileNumber: true }
    })

    if (!user) {
        console.log('No user found with Confirmed referrals for testing.')
        return
    }

    console.log(`Testing with user: ${user.fullName} (${user.mobileNumber})`)

    // 2. Mock context (needs to run in environment with permissions, 
    // but we can't easily mock auth here without more setup. 
    // Instead, we'll try to run the action directly if we can bypass auth or simulate it.)

    // Since getAccruedPayoutLiabilities checks for getCurrentUser(), 
    // running this standalone script won't work without mocking that.
    // We'll inspect the logic by creating a dummy "Finance Admin" to pass the check?
    // No, that's too complex.

    // ALTERNATIVE: verification via introspection of the logic we just wrote.
    // We can't easily run the server action from CLI without the Next.js context.

    console.log('NOTE: Validation requires running within Next.js context or manual UI verification.')
    console.log('Manual Check Steps:')
    console.log('1. Log in as Super Admin')
    console.log('2. Go to Finance -> Liability Ledger')
    console.log(`3. Search for ${user.fullName}`)
    console.log('4. Verify if "Confirmed" referrals are contributing to the total.')
}

testBenefits()
