import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🕵️ Checking User Roles Distribution...')

    // 1. Total counts by role
    const globalRoleCounts = await prisma.user.groupBy({
        by: ['role'],
        _count: { userId: true }
    })
    console.log('\n--- Global Role Counts ---')
    console.table(globalRoleCounts.map(g => ({ role: g.role, count: g._count.userId })))

    // 2. Top 50 Users (Default Fetch) Analysis
    const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { role: true, assignedCampus: true }
    })

    const recentRoleCounts: Record<string, number> = {}
    recentUsers.forEach(u => {
        recentRoleCounts[u.role] = (recentRoleCounts[u.role] || 0) + 1
    })

    console.log('\n--- Top 50 Recent Users Roles (Global) ---')
    console.table(Object.entries(recentRoleCounts).map(([role, count]) => ({ role, count })))

    // 3. Check for specific campus if possible (ASM-VILLIANUR(9-12))
    // Approximate check finding a campus
    const campus = await prisma.campus.findFirst({
        where: { campusName: { contains: 'VILLIANUR' } } // Guessing from screenshot
    })

    if (campus) {
        console.log(`\n--- Top 50 Recent Users for Campus: ${campus.campusName} ---`)
        const campusUsers = await prisma.user.findMany({
            where: { assignedCampus: campus.campusName },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { role: true }
        })
        const campusRoleCounts: Record<string, number> = {}
        campusUsers.forEach(u => {
            campusRoleCounts[u.role] = (campusRoleCounts[u.role] || 0) + 1
        })
        console.table(Object.entries(campusRoleCounts).map(([role, count]) => ({ role, count })))
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
