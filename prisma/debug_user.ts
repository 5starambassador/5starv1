
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Listing users...')
    const users = await prisma.user.findMany({ take: 3 })
    console.log('USERS:', JSON.stringify(users.map(u => ({ mobile: u.mobileNumber, name: u.fullName })), null, 2))

}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
