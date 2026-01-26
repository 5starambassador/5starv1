import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('📋 Listing Distinct Campus Strings...')

    const userCampuses = await prisma.user.groupBy({
        by: ['assignedCampus'],
        _count: { userId: true }
    })
    console.log('\n--- User Table Assigned Campuses ---')
    userCampuses.forEach(u => console.log(`"${u.assignedCampus}" (${u._count.userId})`))

    const adminCampuses = await prisma.admin.findMany({
        select: { adminName: true, assignedCampus: true, role: true }
    })
    console.log('\n--- Admin Table Assigned Campuses ---')
    adminCampuses.forEach(a => console.log(`"${a.assignedCampus}" - ${a.adminName} (${a.role})`))

    const campuses = await prisma.campus.findMany({ select: { campusName: true } })
    console.log('\n--- Campus Table Names ---')
    campuses.forEach(c => console.log(`"${c.campusName}"`))
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
