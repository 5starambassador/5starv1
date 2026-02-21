import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSING VERONIKA (8525054519) ---')

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { mobileNumber: '8525054519' },
                { fullName: { contains: 'Veronika', mode: 'insensitive' } }
            ]
        },
        include: {
            payments: true,
            students: true
        }
    })

    if (!user) {
        console.log('❌ User not found.')
    } else {
        console.log(JSON.stringify(user, null, 2))
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
