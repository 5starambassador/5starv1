import prisma from '../src/lib/prisma'
import { updateUser, addUser } from '../src/app/superadmin-actions'
import { UserRole } from '@prisma/client'

async function verify() {
    console.log('--- Verification Started ---')

    // 1. Find a valid campus
    const campus = await prisma.campus.findFirst()
    if (!campus) {
        console.error('No campuses found in database. Cannot proceed with test.')
        return
    }
    console.log(`Using campus: ${campus.campusName} (ID: ${campus.id})`)

    const testMobile = '9999999999'
    
    // Cleanup any previous test user
    await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })

    try {
        // 2. Test addUser
        console.log('Testing addUser...')
        const addResult = await addUser({
            fullName: 'Test User',
            mobileNumber: testMobile,
            role: UserRole.Parent,
            assignedCampus: campus.campusName
        })

        if (!addResult.success) {
            console.error('addUser failed:', addResult.error)
            return
        }

        const createdUser = await prisma.user.findUnique({ where: { userId: addResult.user.userId } })
        console.log('Created User Campus ID:', createdUser?.campusId)
        
        if (createdUser?.campusId !== campus.id) {
            console.error('FAIL: campusId not synchronized on addUser')
        } else {
            console.log('SUCCESS: campusId synchronized on addUser')
        }

        // 3. Test updateUser
        console.log('Testing updateUser...')
        const anotherCampus = await prisma.campus.findFirst({ where: { id: { not: campus.id } } })
        if (!anotherCampus) {
            console.log('Only one campus exists, skipping update to different campus test.')
        } else {
            const updateResult = await updateUser(createdUser!.userId, {
                assignedCampus: anotherCampus.campusName
            })

            if (!updateResult.success) {
                console.error('updateUser failed:', updateResult.error)
                return
            }

            const updatedUser = await prisma.user.findUnique({ where: { userId: createdUser!.userId } })
            console.log(`Updated User: assignedCampus=${updatedUser?.assignedCampus}, campusId=${updatedUser?.campusId}`)
            
            if (updatedUser?.campusId !== anotherCampus.id) {
                console.error('FAIL: campusId not synchronized on updateUser')
            } else {
                console.log('SUCCESS: campusId synchronized on updateUser')
            }
        }

        // 4. Test clearing campus
        console.log('Testing clearing campus...')
        const clearResult = await updateUser(createdUser!.userId, {
            assignedCampus: ''
        })
        
        const clearedUser = await prisma.user.findUnique({ where: { userId: createdUser!.userId } })
        if (clearedUser?.campusId !== null || clearedUser?.assignedCampus !== '') {
             console.error('FAIL: campusId not cleared on empty assignedCampus')
        } else {
            console.log('SUCCESS: campusId cleared on empty assignedCampus')
        }

    } finally {
        // Cleanup
        await prisma.user.deleteMany({ where: { mobileNumber: testMobile } })
        console.log('--- Verification Finished ---')
    }
}

verify().catch(console.error)
