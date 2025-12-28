import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const passwordRaw = '123456'
    const hashedPassword = await bcrypt.hash(passwordRaw, 10)

    console.log(`🔒 Resetting all test account passwords to: ${passwordRaw}`)

    // 1. Administrators
    const admins = [
        { mobile: '9999999999', role: 'Super Admin' },
        { mobile: '8888888888', role: 'Campus Head' },
        { mobile: '7777777777', role: 'Admission Admin' },
        { mobile: '6666666666', role: 'Finance Admin' }
    ]

    for (const a of admins) {
        // Try Admin Table
        const admin = await prisma.admin.findUnique({ where: { adminMobile: a.mobile } })
        if (admin) {
            await prisma.admin.update({
                where: { adminId: admin.adminId },
                data: { password: hashedPassword }
            })
            console.log(`✅ Admin updated: ${admin.adminName} (${a.role})`)
        } else {
            console.log(`⚠️ Admin not found: ${a.mobile}`)
        }
    }

    // 2. Staff & Parents (User Table)
    const users = [
        // Staff
        '9000000001', '9000000002', '9000000003', '9000000004', '9000000005',
        // Parents
        '9100000001', '9100000002', '9100000003', '9100000004', '9100000005'
    ]

    for (const mobile of users) {
        const user = await prisma.user.findUnique({ where: { mobileNumber: mobile } })
        if (user) {
            await prisma.user.update({
                where: { userId: user.userId },
                data: { password: hashedPassword }
            })
            console.log(`✅ User updated: ${user.fullName} (${user.role})`)
        } else {
            console.log(`⚠️ User not found: ${mobile}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
