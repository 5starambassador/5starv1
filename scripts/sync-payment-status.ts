import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncAllUserPayments() {
    console.log('--- STARTING GLOBAL PAYMENT STATUS SYNC ---')

    try {
        const users = await prisma.user.findMany({
            where: {
                status: { not: 'Deleted' }
            }
        })

        console.log(`Auditing ${users.length} users...`)
        let corrected = 0
        let verified = 0

        for (const user of users) {
            const paymentStatus = (user.paymentStatus || '').toLowerCase()
            const hasPaid = paymentStatus === 'success' || paymentStatus === 'completed'
            const currentStatus = user.status

            if (!hasPaid && currentStatus === 'Active') {
                // VIOLATION: Active but not paid
                await prisma.user.update({
                    where: { userId: user.userId },
                    data: { status: 'Pending' }
                })
                console.log(`[CORRECTED] User ${user.mobileNumber}: Active -> Pending (No verified payment)`)
                corrected++
            } else if (hasPaid && currentStatus === 'Pending') {
                // SELF-HEALING: Paid but stuck in Pending
                await prisma.user.update({
                    where: { userId: user.userId },
                    data: { status: 'Active' }
                })
                console.log(`[HEALED] User ${user.mobileNumber}: Pending -> Active (Payment verified)`)
                corrected++
            } else {
                verified++
            }
        }

        console.log('--- SYNC COMPLETE ---')
        console.log(`Total Audited: ${users.length}`)
        console.log(`Total Corrected: ${corrected}`)
        console.log(`Total Verified (OK): ${verified}`)

    } catch (error) {
        console.error('CRITICAL SYNC ERROR:', error)
    } finally {
        await prisma.$disconnect()
    }
}

syncAllUserPayments()
