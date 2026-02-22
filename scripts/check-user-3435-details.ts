
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const userId = 3435
    const user = await prisma.user.findUnique({
        where: { userId }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    const transactions = await prisma.transaction.findMany({
        where: { userId }
    })

    console.log('Transactions:', transactions)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
