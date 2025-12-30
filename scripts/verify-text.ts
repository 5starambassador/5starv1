import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const settings = await prisma.systemSettings.findFirst()
    console.log('PARENT TEXT:', settings?.parentReferralText)
    console.log('STAFF TEXT:', settings?.staffReferralText)
    console.log('ALUMNI TEXT:', settings?.alumniReferralText)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
