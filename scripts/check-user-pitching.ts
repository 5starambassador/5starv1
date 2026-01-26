import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('📊 Checking User Distribution by Campus...')

    // Group users by assignedCampus
    const userDistribution = await prisma.user.groupBy({
        by: ['assignedCampus'],
        _count: {
            userId: true
        }
    })

    console.log(`Found users in ${userDistribution.length} distinct campuses.`)

    // Get all active campuses to see coverage
    const allCampuses = await prisma.campus.findMany({
        select: { campusName: true, id: true }
    })

    // Create a map for quick lookup
    const campusMap = new Map(allCampuses.map(c => [c.campusName, c.id]))

    const report = userDistribution.map(group => {
        const campusName = group.assignedCampus || 'Unassigned'
        const exists = campusMap.has(campusName)
        return {
            campus: campusName,
            userCount: group._count.userId,
            isValidCampus: exists
        }
    }).sort((a, b) => b.userCount - a.userCount)

    console.table(report)

    // Check for users with assignedCampus but NO matching Campus record
    const invalidCampuses = report.filter(r => !r.isValidCampus && r.campus !== 'Unassigned')
    if (invalidCampuses.length > 0) {
        console.error('❌ Found users assigned to non-existent campuses:')
        console.table(invalidCampuses)
    } else {
        console.log('✅ All assignedCampus values map to valid Campuses.')
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
