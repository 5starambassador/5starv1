
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findRama() {
    console.log('--- FINDING RAMA AS AMBASSADOR ---')

    const user = await prisma.user.findFirst({
        where: { mobileNumber: '9790900990' },
        include: {
            referrals: {
                where: { leadStatus: { in: ['Confirmed', 'Admitted'] } }
            }
        }
    })

    if (!user) {
        console.log('Ambassador not found with mobile 9790900990')
        // Try searching by name
        const userByName = await prisma.user.findFirst({
            where: { fullName: { contains: 'RAMA', mode: 'insensitive' } },
            include: {
                referrals: {
                    where: { leadStatus: { in: ['Confirmed', 'Admitted'] } }
                }
            }
        })
        if (userByName) {
            console.log('Found by name:', JSON.stringify(userByName, null, 2))
        }
    } else {
        console.log('Found Ambassador:', JSON.stringify(user, null, 2))
    }

    console.log('--- SEARCH COMPLETE ---')
}

findRama().catch(console.error).finally(() => prisma.$disconnect())
