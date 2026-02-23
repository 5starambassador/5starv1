
import { PrismaClient } from '@prisma/client'
import { generateSmartReferralCode } from '../src/lib/referral-service'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting data fix for missing referral codes...')

    // Find active users with null referral codes
    const users = await prisma.user.findMany({
        where: {
            status: 'Active',
            referralCode: null
        }
    })

    console.log(`Found ${users.length} users requiring fix.`)

    for (const user of users) {
        console.log(`Fixing user: ${user.fullName} (${user.mobileNumber})...`)
        const referralCode = await generateSmartReferralCode(user.role)

        await prisma.user.update({
            where: { userId: user.userId },
            data: { referralCode }
        })

        console.log(`Generated code: ${referralCode}`)
    }

    console.log('Fix completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
