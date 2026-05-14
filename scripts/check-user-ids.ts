import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    const users = await prisma.user.findMany({
        take: 5,
        select: {
            fullName: true,
            referralCode: true,
            childEprNo: true,
            empId: true,
            role: true
        },
        where: {
            referralCode: { not: null }
        }
    })
    console.log(JSON.stringify(users, null, 2))
}

check()
