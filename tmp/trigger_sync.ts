import { syncUserStats } from '../src/app/sync-actions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const mobile = '9865643980'
    const user = await prisma.user.findFirst({ where: { mobileNumber: { contains: mobile } } })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log(`Before Sync: ${user.fullName}, Count: ${user.confirmedReferralCount}`)

    const result = await syncUserStats(user.userId)

    if (result.success) {
        // @ts-ignore
        console.log(`After Sync: ${result.user.fullName}, Count: ${result.user.confirmedReferralCount}`)
    } else {
        console.log(`Sync Failed: ${result.error}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
