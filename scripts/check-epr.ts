
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const u = await prisma.user.findFirst({
            where: { mobileNumber: '9551031245' }
        })
        if (u) {
            console.log(`Aswini J:`)
            console.log(`  - mobileNumber: ${u.mobileNumber}`)
            console.log(`  - childEprNo: ${u.childEprNo}`)
            console.log(`  - childName: ${u.childName}`)
        }
    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
