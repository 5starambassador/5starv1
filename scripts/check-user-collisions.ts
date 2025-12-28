import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking for Account Collisions...')

    const mobiles = ['9999999999', '8888888888', '7777777777', '6666666666']

    for (const mobile of mobiles) {
        const user = await prisma.user.findUnique({ where: { mobileNumber: mobile } })
        const admin = await prisma.admin.findUnique({ where: { adminMobile: mobile } })

        console.log(`\n📱 Mobile: ${mobile}`)
        if (user) console.log(`   👤 User Table: Found (ID: ${user.userId}, Role: ${user.role})`)
        else console.log(`   👤 User Table: Not Found`)

        if (admin) console.log(`   👑 Admin Table: Found (ID: ${admin.adminId}, Role: ${admin.role})`)
        else console.log(`   👑 Admin Table: Not Found`)

        if (user && admin) {
            console.error(`   ⚠️ COLLISION DETECTED! Login will prioritize User account.`)
        }
    }
}

main()
    .finally(() => prisma.$disconnect())
