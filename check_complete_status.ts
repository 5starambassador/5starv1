import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== COMPLETE PARENT STATUS BREAKDOWN ===\n')

    // 1. Overall counts by benefitStatus
    const statusBreakdown = await prisma.user.groupBy({
        by: ['benefitStatus', 'role'],
        where: {
            role: 'Parent'
        },
        _count: {
            userId: true
        }
    })

    console.log('1. By Benefit Status:')
    console.table(statusBreakdown.map(r => ({
        Status: r.benefitStatus,
        Role: r.role,
        Count: r._count.userId
    })))

    // 2. Detailed Active (Verified) count
    const verifiedParents = await prisma.user.count({
        where: {
            role: 'Parent',
            benefitStatus: 'Active'
        }
    })

    const verifiedWithKids = await prisma.user.count({
        where: {
            role: 'Parent',
            benefitStatus: 'Active',
            childInAchariya: true
        }
    })

    console.log('\n2. Verified Parents (Active Status):')
    console.log(`   Total Verified: ${verifiedParents}`)
    console.log(`   - With Children in Achariya: ${verifiedWithKids}`)
    console.log(`   - Without Children: ${verifiedParents - verifiedWithKids}`)

    // 3. Sample verified users
    const sampleVerified = await prisma.user.findMany({
        where: {
            role: 'Parent',
            benefitStatus: 'Active'
        },
        select: {
            fullName: true,
            mobileNumber: true,
            childName: true,
            childEprNo: true,
            grade: true,
            assignedCampus: true
        },
        take: 10
    })

    console.log('\n3. Sample Verified Users (First 10):')
    console.table(sampleVerified)

    // 4. Summary
    const total = await prisma.user.count({ where: { role: 'Parent' } })
    console.log('\n=== SUMMARY ===')
    console.log(`Total Parents: ${total}`)
    console.log(`Verified (Active): ${verifiedParents} (${((verifiedParents / total) * 100).toFixed(1)}%)`)
    console.log(`Pending Verification: ${statusBreakdown.find(s => s.benefitStatus === 'PendingVerification')?._count.userId || 0}`)
    console.log(`Pending (Not claimed): ${statusBreakdown.find(s => s.benefitStatus === 'Pending')?._count.userId || 0}`)
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
