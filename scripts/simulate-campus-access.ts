import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const ADMIN_NAME = 'ASM VL (9-12)' // From the debug list
    console.log(`🕵️ Simulating Access for Admin: "${ADMIN_NAME}"...`)

    // 1. Find Admin
    const admin = await prisma.admin.findFirst({
        where: { adminName: ADMIN_NAME }
    })

    if (!admin) {
        console.error('❌ Admin not found!')
        return
    }

    console.log(`✅ Found Admin: ${admin.adminName}`)
    console.log(`   Assigned Campus: "${admin.assignedCampus}"`)

    // 2. Simulate verifyCampusAccess logic
    if (!admin.assignedCampus) {
        console.error('❌ No assigned campus')
        return
    }

    const campus = await prisma.campus.findUnique({
        where: { campusName: admin.assignedCampus }
    })

    if (!campus) {
        console.error(`❌ Campus lookup failed for "${admin.assignedCampus}"`)
        // Try fuzzy search?
        const fuzzy = await prisma.campus.findFirst({
            where: { campusName: { contains: admin.assignedCampus.trim() } }
        })
        if (fuzzy) console.log(`   Did you mean: "${fuzzy.campusName}"?`)
        return
    }

    console.log(`✅ Campus Resolved: "${campus.campusName}" (ID: ${campus.id})`)

    // 3. Simulate getCampusUsers
    const count = await prisma.user.count({
        where: { assignedCampus: campus.campusName }
    })

    console.log(`📊 User Count for "${campus.campusName}": ${count}`)

    if (count > 0) {
        const sample = await prisma.user.findFirst({
            where: { assignedCampus: campus.campusName },
            select: { fullName: true, role: true }
        })
        console.log(`   Sample User: ${sample?.fullName} (${sample?.role})`)
    } else {
        console.warn('⚠️ No users found! Checking for whitespace mismatches...')
        // Check for users with similar names
        const allUserCampuses = await prisma.user.groupBy({ by: ['assignedCampus'] })
        const similar = allUserCampuses.filter(u => u.assignedCampus?.includes('VILLIANUR'))
        console.table(similar)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
