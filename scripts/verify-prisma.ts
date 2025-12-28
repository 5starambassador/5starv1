
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Prisma Client fields...')

    try {
        // 1. Verify SupportTicket escalationLevel (from previous check)
        const count = await prisma.supportTicket.count({
            where: {
                escalationLevel: 1
            }
        })
        console.log(`SupportTicket Check: OK (Count: ${count})`)

        // 2. Verify OtpVerification model
        const mobile = '9999999999'
        const otp = '123456'

        // Upsert test
        const record = await prisma.otpVerification.upsert({
            where: { mobile },
            update: { otp, expiresAt: new Date() },
            create: { mobile, otp, expiresAt: new Date() }
        })

        console.log(`OtpVerification Check: OK (Upserted ID: ${record.id}, OTP: ${record.otp})`)

        // Clean up
        await prisma.otpVerification.delete({ where: { mobile } })
        console.log('Cleanup: OK')

        console.log('Runtime verification passed.')
    } catch (error) {
        console.error('Runtime verification failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
