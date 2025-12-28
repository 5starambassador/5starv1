
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Updating passwords for all users and admins...')

    const defaultPassword = '123456'

    // Update Users
    const users = await prisma.user.updateMany({
        where: {
            password: null
        },
        data: {
            password: defaultPassword
        }
    })
    console.log(`Updated ${users.count} users with default password.`)

    // Update Admins
    const admins = await prisma.admin.updateMany({
        where: {
            password: null
        },
        data: {
            password: defaultPassword
        }
    })
    console.log(`Updated ${admins.count} admins with default password.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
