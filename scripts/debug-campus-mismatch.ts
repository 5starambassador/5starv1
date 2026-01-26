import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🕵️ Debugging Campus Mismatch for "ASM HSC- VILLIANUR"...')

    const SEARCH_TERM = 'VILLIANUR'

    // 1. Check Campus Definitions
    const campuses = await prisma.campus.findMany({
        where: { campusName: { contains: SEARCH_TERM } }
    })
    console.log('\n--- Campus Table Entries ---')
    console.table(campuses.map(c => ({ id: c.id, name: c.campusName, code: c.campusCode })))

    // 2. Check Admin Assignments (Campus Heads)
    const admins = await prisma.admin.findMany({
        where: { assignedCampus: { contains: SEARCH_TERM }, role: 'Campus_Head' }
    })
    console.log('\n--- Admin (Campus Head) Assignments ---')
    console.table(admins.map(a => ({ id: a.adminId, name: a.adminName, assigned: a.assignedCampus })))

    // 3. Check User Assignments
    const users = await prisma.user.groupBy({
        by: ['assignedCampus'],
        where: { assignedCampus: { contains: SEARCH_TERM } },
        _count: { userId: true }
    })
    console.log('\n--- User Assignments (Grouped) ---')
    // users.forEach(u => console.log(`"${u.assignedCampus}": ${u._count.userId}`))
    console.table(users.map(u => ({ assignedString: `"${u.assignedCampus}"`, count: u._count.userId })))

    console.log('\n--- Admin Assignments ---')
    // admins.forEach(a => console.log(`"${a.assignedCampus}": ${a.adminName}`))
    console.table(admins.map(a => ({ assignedString: `"${a.assignedCampus}"`, name: a.adminName })))

    // 4. Exact Check for the problematic campus
    // User mentioned "ASM HSC- VILLIANUR"
    // Let's see if we can find mismatched whitespace or hyphens
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
