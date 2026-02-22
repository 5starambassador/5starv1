
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const mobileNumber = '8015000009'
    const user = await prisma.user.findFirst({
        where: { mobileNumber }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log('User found:', {
        userId: user.userId,
        fullName: user.fullName,
        role: user.role,
        accountNumber: user.accountNumber,
        ifscCode: user.ifscCode
    })

    const referrals = await prisma.referralLead.findMany({
        where: { userId: user.userId }
    })

    console.log('Referral count:', referrals.length)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
