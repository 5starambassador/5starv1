const { PrismaClient } = require('@prisma/client')
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
            OR: [
                { childEprNo: { not: null } },
                { empId: { not: null } }
            ]
        }
    })
    console.log(JSON.stringify(users, null, 2))
    await prisma.$disconnect()
}

check()
