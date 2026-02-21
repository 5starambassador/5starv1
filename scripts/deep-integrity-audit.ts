import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING REFINED DATA INTEGRITY AUDIT (JSON OUTPUT) ---')

    const allUsers = await prisma.user.findMany({
        include: { payments: true, students: true }
    })

    console.log(`SCANNED TOTAL USERS: ${allUsers.length}`)

    // Discrepant Users: Active but no Payment Record
    const mismatch = allUsers.filter(u =>
        u.status === 'Active' as any &&
        !u.payments.some(p => p.paymentStatus === 'Success' || p.paymentStatus === 'Completed')
    )

    console.log(`TOTAL DISCREPANCIES FOUND: ${mismatch.length}`)

    // Analyze by Academic Year
    const byAcademicYear = mismatch.reduce((acc: any, u) => {
        const ay = u.academicYear || 'None'
        acc[ay] = (acc[ay] || 0) + 1
        return acc
    }, {})

    // Analyze by Recently Created
    const threshold = new Date('2025-04-01')
    const byAge = mismatch.reduce((acc: any, u) => {
        const isLegacy = u.createdAt < threshold
        const key = isLegacy ? 'Legacy (Before April 2025)' : 'New (Since April 2025)'
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    // Role Distribution
    const byRole = mismatch.reduce((acc: any, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1
        return acc
    }, {})

    // Parent Breakdown
    const parentMismatches = mismatch.filter(u => u.role === 'Parent' as any)
    const parentAYBreakdown = parentMismatches.reduce((acc: any, u) => {
        const ay = u.academicYear || 'None'
        acc[ay] = (acc[ay] || 0) + 1
        return acc
    }, {})

    const results = {
        byAcademicYear,
        byAge,
        byRole,
        parentAYBreakdown,
        sampleParentMismatches: parentMismatches.slice(0, 5).map(u => ({ id: u.userId, ay: u.academicYear, created: u.createdAt }))
    }

    console.log('--- AUDIT RESULTS ---')
    console.log(JSON.stringify(results, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
