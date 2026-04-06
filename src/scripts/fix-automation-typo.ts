import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Fixing automation rule name typo...')
    const result = await prisma.automationRule.updateMany({
        where: { name: 'Activate you account' },
        data: { name: 'Activate your account' }
    })
    console.log(`✅ Updated ${result.count} rules.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
