const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')

async function main() {
    const users = await prisma.user.findMany({
        where: { referralCode: null },
        select: {
            userId: true,
            fullName: true,
            mobileNumber: true,
            role: true,
            status: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    const header = 'User ID,Full Name,Mobile Number,Role,Status,Created At\n'
    const rows = users.map(u =>
        `${u.userId},"${u.fullName}",${u.mobileNumber},${u.role},${u.status},${u.createdAt.toISOString()}`
    ).join('\n')

    const csvContent = header + rows
    const filePath = path.join(__dirname, 'missing_code_users.csv')
    fs.writeFileSync(filePath, csvContent)

    console.log(`Successfully exported ${users.length} users to ${filePath}`)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
