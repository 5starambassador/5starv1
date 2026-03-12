import { PrismaClient } from '@prisma/client'
import { getAllUsers } from '../src/app/superadmin-actions'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Testing User Filters ---')

    // 1. Test Role Filter
    console.log('\n1. Testing Role Filter (Staff)...')
    const staffResponse = await getAllUsers({ role: 'Staff' })
    const staff = 'users' in staffResponse ? staffResponse.users : staffResponse
    console.log(`Found ${staff.length} staff members.`)
    if (staff.length > 0) {
        const roles = [...new Set(staff.map(u => u.role))]
        console.log(`Roles found: ${roles.join(', ')}`)
    }

    // 2. Test Campus Filter
    console.log('\n2. Testing Campus Filter (ACET)...')
    const campusResponse = await getAllUsers({ campusFilter: 'ACET' })
    const campusUsers = 'users' in campusResponse ? campusResponse.users : campusResponse
    console.log(`Found ${campusUsers.length} users in ACET.`)
    if (campusUsers.length > 0) {
        const campuses = [...new Set(campusUsers.map(u => u.assignedCampus))]
        console.log(`Campuses found: ${campuses.join(', ')}`)
    }

    // 3. Test Source Filter (Manual)
    console.log('\n3. Testing Source Filter (manual)...')
    const manualResponse = await getAllUsers({ source: 'manual' })
    const manualUsers = 'users' in manualResponse ? manualResponse.users : manualResponse
    console.log(`Found ${manualUsers.length} manual users.`)

    // 4. Test Source Filter (System)
    console.log('\n4. Testing Source Filter (system)...')
    const systemResponse = await getAllUsers({ source: 'system' })
    const systemUsers = 'users' in systemResponse ? systemResponse.users : systemResponse
    console.log(`Found ${systemUsers.length} system users.`)

    console.log('\n--- Verification Complete ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
