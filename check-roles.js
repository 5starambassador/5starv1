import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const adminRoles = await prisma.admin.findMany({
        select: { role: true },
        distinct: ['role']
    })
    console.log('Admin Roles in DB:', adminRoles)

    const userRoles = await prisma.user.findMany({
        select: { role: true },
        distinct: ['role']
    })
    console.log('User Roles in DB:', userRoles)
}

main().catch(console.error).finally(() => prisma.$disconnect())
