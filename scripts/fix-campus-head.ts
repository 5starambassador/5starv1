import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🛠️ Assigning Campus to Campus Head...')

    const adminMobile = '8888888888'
    const targetCampus = 'ASM-VILLUPURAM'

    // Verify campus exists
    const campus = await prisma.campus.findUnique({
        where: { campusName: targetCampus }
    })

    if (!campus) {
        console.error(`❌ Campus '${targetCampus}' not found!`)
        return
    }

    const updated = await prisma.admin.update({
        where: { adminMobile: adminMobile },
        data: {
            assignedCampus: targetCampus
        }
    })

    console.log(`✅ Assigned '${updated.assignedCampus}' to Admin ${updated.adminName}`)
}

main()
    .finally(() => prisma.$disconnect())
