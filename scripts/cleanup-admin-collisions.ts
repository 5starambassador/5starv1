import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning up Shadow User Accounts (with Cascade)...')

    const adminMobiles = ['9999999999', '8888888888', '7777777777', '6666666666']

    for (const mobile of adminMobiles) {
        const admin = await prisma.admin.findUnique({ where: { adminMobile: mobile } })

        if (admin) {
            const user = await prisma.user.findUnique({ where: { mobileNumber: mobile } })

            if (user) {
                console.log(`⚠️ Found shadow user for ${mobile}. Deleting dependencies...`)

                // 1. Delete Referral Leads where this user is the referrer
                const referrals = await prisma.referralLead.deleteMany({ where: { userId: user.userId } })
                console.log(`   - Deleted ${referrals.count} referrals`)

                // 2. Delete Student records where this user is the parent
                const students = await prisma.student.deleteMany({ where: { parentId: user.userId } })
                console.log(`   - Deleted ${students.count} students`)

                // 4. Finally Delete User
                await prisma.user.delete({ where: { userId: user.userId } })
                console.log(`✅ Deleted shadow User account for ${mobile}`)
            }
        }
    }
}

main()
    .finally(() => prisma.$disconnect())
