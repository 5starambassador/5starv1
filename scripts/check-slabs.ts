
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSlabs() {
    console.log('--- CHECKING BENEFIT SLABS ---')
    const slabs = await prisma.benefitSlab.findMany({
        orderBy: { referralCount: 'asc' }
    })
    console.log(JSON.stringify(slabs, null, 2))
    console.log('--- CHECK COMPLETE ---')
}

checkSlabs().catch(console.error).finally(() => prisma.$disconnect())
