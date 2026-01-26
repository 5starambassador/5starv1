import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Starting Campus Head Audit...')

    // 1. Fetch all admins and filter in memory to avoid Enum issues
    const allAdmins = await prisma.admin.findMany()
    console.log(`Total Admins found: ${allAdmins.length}`)

    // Log distinct roles found for debugging
    const rolesFound = [...new Set(allAdmins.map(a => a.role))]
    console.log('Roles found in DB:', rolesFound)

    const campusHeads = allAdmins.filter(a => a.role === 'Campus_Head' || a.role === 'Campus Head')


    console.log(`found ${campusHeads.length} Campus Head(s).`)

    const issues: any[] = []

    for (const admin of campusHeads) {
        console.log(`\nChecking Admin: ${admin.adminName} (${admin.adminMobile})`)

        // Check if assignedCampus is set
        if (!admin.assignedCampus) {
            console.error(`❌ Missing assignedCampus for Admin ID ${admin.adminId}`)
            issues.push({ type: 'MissingAssignedCampus', adminId: admin.adminId, name: admin.adminName })
            continue
        }

        // Check if the campus exists
        const campus = await prisma.campus.findUnique({
            where: { campusName: admin.assignedCampus }
        })

        if (!campus) {
            console.error(`❌ Assigned Campus '${admin.assignedCampus}' does not exist!`)
            issues.push({ type: 'InvalidCampus', adminId: admin.adminId, name: admin.adminName, campus: admin.assignedCampus })
        } else {
            console.log(`✅ Assigned Campus '${admin.assignedCampus}' exists (ID: ${campus.id})`)

            // Check reverse link (optional but good to know)
            if (campus.campusHeadId !== admin.adminId) {
                console.warn(`⚠️ Warning: Campus '${campus.campusName}' has campusHeadId ${campus.campusHeadId}, but this admin is ID ${admin.adminId}`)
                issues.push({ type: 'CampusHeadIdMismatch', adminId: admin.adminId, name: admin.adminName, campus: admin.assignedCampus, currentHeadId: campus.campusHeadId })
            }
        }
    }

    // 2. Fetch all Campuses and see if they have a head assigned
    console.log('\n🔍 Check Campuses...')
    const campuses = await prisma.campus.findMany()
    for (const c of campuses) {
        if (!c.campusHeadId) {
            console.warn(`⚠️ Campus '${c.campusName}' has no campusHeadId set in Campus table.`)
            // This might be fine if we rely on Admin.assignedCampus, but noting it.
        }
    }

    console.log('\n📊 Audit Summary:')
    if (issues.length === 0) {
        console.log('✅ No critical issues found.')
    } else {
        console.log(`❌ Found ${issues.length} issues:`)
        console.table(issues)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
