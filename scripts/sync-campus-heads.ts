import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Starting Campus Head Sync...')

    // 1. Fetch all admins with role 'Campus Head' (using filters to avoid enum issues)
    const allAdmins = await prisma.admin.findMany()
    const campusHeads = allAdmins.filter(a => a.role === 'Campus_Head' || a.role === 'Campus Head')

    console.log(`Found ${campusHeads.length} Campus Head admins.`)

    let updatedCount = 0

    for (const admin of campusHeads) {
        if (!admin.assignedCampus) {
            console.warn(`⚠️ Admin ${admin.adminName} (ID: ${admin.adminId}) has no assigned campus. Skipping.`)
            continue
        }

        // Find the campus
        const campus = await prisma.campus.findUnique({
            where: { campusName: admin.assignedCampus }
        })

        if (!campus) {
            console.error(`❌ Campus '${admin.assignedCampus}' not found for Admin ${admin.adminName}.`)
            continue
        }

        // Check if sync needed
        if (campus.campusHeadId !== admin.adminId) {
            console.log(`🛠️ Syncing: Campus '${campus.campusName}' (ID: ${campus.id}) -> Head ID: ${admin.adminId} (was ${campus.campusHeadId})`)

            await prisma.campus.update({
                where: { id: campus.id },
                data: { campusHeadId: admin.adminId }
            })
            updatedCount++
        }
    }

    console.log(`\n✅ Sync Complete. Updated ${updatedCount} campuses.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
