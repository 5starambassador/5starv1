
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const admin = await prisma.user.findUnique({
            where: { userId: 157 }
        })
        console.log(`User 157: ${admin?.fullName} | Mobile: ${admin?.mobileNumber} | Code: ${admin?.referralCode}`)

        const krithika = await prisma.user.findFirst({
            where: { referralCode: 'ACH26-P00056' }
        })
        console.log(`Krithika (ACH26-P00056): UserID: ${krithika?.userId} | Mobile: ${krithika?.mobileNumber}`)

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
