const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
    try {
        const perms = await prisma.rolePermissions.findUnique({
            where: { role: 'Super Admin' }
        })

        if (perms) {
            console.log('--- Super Admin Permissions ---')
            Object.entries(perms).forEach(([key, value]) => {
                console.log(`${key}: ${value}`)
            })
        } else {
            console.log('Super Admin record not found in DB.')
        }
    } catch (err) {
        console.error('DB Error:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

debug()
