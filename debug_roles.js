
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: { contains: 'Admin' }
            },
            select: {
                userId: true,
                fullName: true,
                role: true
            }
        })

        console.log('--- Admin Users ---')
        users.forEach(u => {
            console.log(`User: ${u.fullName} | Role: "${u.role}"`)
        })

        // Also check Admin table if separate
        const admins = await prisma.admin.findMany({})
        console.log('\n--- Admin Table ---')
        admins.forEach(a => {
            console.log(`Admin: ${a.adminName} | Role: "${a.role}"`)
        })

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
