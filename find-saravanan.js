const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findSaravanan() {
    const user = await prisma.user.findUnique({
        where: { mobileNumber: '9944535946' }
    })
    console.log('SARAVANAN_START')
    console.log(JSON.stringify(user, null, 2))
    console.log('SARAVANAN_END')
}

findSaravanan().catch(console.error).finally(() => prisma.$disconnect())
