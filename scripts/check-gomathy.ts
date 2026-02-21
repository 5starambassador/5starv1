
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGomathy() {
    console.log('--- CHECKING GOMATHY REFERRALS ---')
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: 'Gomathy', mode: 'insensitive' } },
        include: { referrals: { where: { leadStatus: { in: ['Confirmed', 'Admitted'] } } } }
    })
    console.log(JSON.stringify(user, null, 2))
    console.log('--- CHECK COMPLETE ---')
}

checkGomathy().catch(console.error).finally(() => prisma.$disconnect())
