
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGomathyT() {
    console.log('--- CHECKING GOMATHY T REFERRALS ---')
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '8870246220' },
        include: { referrals: { where: { leadStatus: { in: ['Confirmed', 'Admitted'] } } } }
    })
    console.log(JSON.stringify(user, null, 2))
    console.log('--- CHECK COMPLETE ---')
}

checkGomathyT().catch(console.error).finally(() => prisma.$disconnect())
