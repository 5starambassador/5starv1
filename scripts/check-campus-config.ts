import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking Campus Head Configuration...')

    // Check Campus Head Admin
    const adminMobile = '8888888888'
    const admin = await prisma.admin.findUnique({
        where: { adminMobile: adminMobile }
    })

    console.log(`\n👤 Admin (${adminMobile}):`)
    if (admin) {
        console.log(`   - ID: ${admin.adminId}`)
        console.log(`   - Name: ${admin.adminName}`)
        console.log(`   - Role: '${admin.role}'`)
        console.log(`   - Assigned Campus: '${admin.assignedCampus}'`) // Critical check
    } else {
        console.log('   - Not Found!')
    }

    // List Valid Campuses
    console.log('\n🏫 Valid Campuses in DB:')
    const campuses = await prisma.campus.findMany()
    campuses.forEach(c => {
        console.log(`   - [${c.id}] ${c.campusName} (Code: ${c.campusCode})`)
    })
}

main()
    .finally(() => prisma.$disconnect())
