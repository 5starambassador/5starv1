import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkUserData() {
    const mobiles = ['9962038560', '8489135515']
    const users = await prisma.user.findMany({
        where: { mobileNumber: { in: mobiles } },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            childName: true,
            childEprNo: true,
            childInAchariya: true,
            benefitStatus: true
        }
    })

    console.log('User Records:')
    console.table(users)

    for (const user of users) {
        if (user.childEprNo) {
            const student = await prisma.student.findUnique({
                where: { admissionNumber: user.childEprNo }
            })
            console.log(`Student for ERP ${user.childEprNo}:`, student ? student.fullName : 'NOT FOUND')
        }
    }
}

checkUserData()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
