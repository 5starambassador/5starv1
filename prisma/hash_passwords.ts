
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting password hashing migration...')

    // Hash for '123456'
    const defaultHash = await bcrypt.hash('123456', 10)
    console.log(`Generated hash for '123456': ${defaultHash}`)

    // Update Users
    const users = await prisma.user.updateMany({
        where: {
            password: '123456' // Only update default insecure ones
        },
        data: {
            password: defaultHash
        }
    })
    console.log(`Updated ${users.count} users to hashed password.`)

    // Update Admins
    const admins = await prisma.admin.updateMany({
        where: {
            password: '123456'
        },
        data: {
            password: defaultHash
        }
    })
    console.log(`Updated ${admins.count} admins to hashed password.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
