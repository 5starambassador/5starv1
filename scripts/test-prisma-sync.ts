import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testSyncLogic() {
    console.log('--- Prisma Sync Logic Test ---')
    
    // 1. Get a campus
    const campus = await prisma.campus.findFirst()
    if (!campus) {
        console.error('No campuses found.')
        return
    }
    console.log(`Testing with campus: ${campus.campusName} (ID: ${campus.id})`)

    const testMobile = '8888888888'
    await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })

    try {
        // 2. Simulate addUser logic
        console.log('Simulating addUser logic...')
        const assignedCampus = campus.campusName
        let campusIdResolved: number | null = null
        
        const foundCampus = await prisma.campus.findUnique({
            where: { campusName: assignedCampus },
            select: { id: true }
        })
        if (foundCampus) campusIdResolved = foundCampus.id

        console.log('Resolved Campus ID:', campusIdResolved)

        const user = await prisma.user.create({
            data: {
                fullName: 'Test Sync User',
                mobileNumber: testMobile,
                role: 'Parent',
                assignedCampus: assignedCampus,
                campusId: campusIdResolved,
                childInAchariya: false
            }
        })

        if (user.campusId === campus.id) {
            console.log('SUCCESS: Create logic works.')
        } else {
            console.error('FAIL: Create logic failed.')
        }

        // 3. Simulate updateUser logic
        console.log('Simulating updateUser logic...')
        const newCampusName = 'Non-existent Campus'
        let updatedCampusId: number | null = -1 // intentional dummy

        const foundNewCampus = await prisma.campus.findUnique({
            where: { campusName: newCampusName },
            select: { id: true }
        })
        if (foundNewCampus) {
            updatedCampusId = foundNewCampus.id
        } else {
            updatedCampusId = null
        }

        const updatedUser = await prisma.user.update({
            where: { userId: user.userId },
            data: {
                assignedCampus: newCampusName,
                campusId: updatedCampusId
            }
        })

        if (updatedUser.campusId === null && updatedUser.assignedCampus === newCampusName) {
            console.log('SUCCESS: Update logic (null case) works.')
        } else {
            console.error('FAIL: Update logic (null case) failed.')
        }

    } finally {
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })
        await prisma.$disconnect()
        console.log('--- Test Finished ---')
    }
}

testSyncLogic().catch(console.error)
