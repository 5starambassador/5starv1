const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserData() {
    const mobiles = ['9962038560', '8489135515', '7904422421']
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
    console.log(JSON.stringify(users, null, 2))

    for (const user of users) {
        console.log(`\n--- Checking User: ${user.fullName} ---`)
        if (user.childEprNo) {
            const student = await prisma.student.findUnique({
                where: { admissionNumber: user.childEprNo }
            })
            console.log(`Student for ERP ${user.childEprNo}:`, student ? student.fullName : 'NOT FOUND BY ERP')
        }
        
        const studentsByMobile = await prisma.student.findMany({
            where: { parent: { mobileNumber: user.mobileNumber } }
        })
        console.log(`Students found by Parent Mobile:`, studentsByMobile.map(s => s.fullName).join(', ') || 'NONE')
    }
}

checkUserData()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
