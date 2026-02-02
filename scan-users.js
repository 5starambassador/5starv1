const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function scanUsers() {
    console.log('Scanning users for potential crashes...')
    const users = await prisma.user.findMany()

    let issues = 0
    users.forEach(u => {
        // Check for nulls in required display fields
        if (!u.fullName) {
            console.log(`User ${u.userId}: Missing fullName`)
            issues++
        }
        if (!u.mobileNumber) {
            console.log(`User ${u.userId}: Missing mobileNumber`)
            issues++
        }
        if (u.confirmedReferralCount === null || u.confirmedReferralCount === undefined) {
            console.log(`User ${u.userId}: null confirmedReferralCount`)
            issues++
        }
        if (!u.createdAt) {
            console.log(`User ${u.userId}: Missing createdAt`)
            issues++
        }

        // Check for invalid dates
        try {
            new Date(u.createdAt).toISOString()
        } catch (e) {
            console.log(`User ${u.userId}: Invalid createdAt date`)
            issues++
        }
    })

    console.log(`Scan complete. Found ${issues} potential issues in ${users.length} users.`)
    await prisma.$disconnect()
}

scanUsers()
