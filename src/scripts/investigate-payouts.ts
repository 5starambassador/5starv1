import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const mobileNumbers = ['9940912775', '9994324920', '7339075724', '8220219638']
    console.log(`Checking users by mobile: ${mobileNumbers.join(', ')}`)

    const users = await prisma.user.findMany({
        where: {
            mobileNumber: { in: mobileNumbers }
        },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            settlements: {
                select: { id: true, status: true }
            }
        }
    })

    console.log('User Results:')
    console.log(JSON.stringify(users, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
