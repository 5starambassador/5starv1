import prisma from '../lib/prisma'

async function runDiagnostic() {
    console.log('--- Step C Query with SELECT Profiler ---')

    try {
        const refUsers = await prisma.referralLead.findMany({
            where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
            select: { userId: true },
            distinct: ['userId']
        })
        const eligibleUserIds = Array.from(new Set(refUsers.map(r => r.userId)))
        const allLeads = await prisma.referralLead.findMany({
            where: { 
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                userId: { in: eligibleUserIds }
            },
            select: { userId: true },
            take: 50000
        })
        const uniqueUserIds = Array.from(new Set(allLeads.map(l => l.userId)))
        console.log(`Number of unique user IDs: ${uniqueUserIds.length}`)

        // 1. prisma.user.findMany with SELECT (excluding profileImage)
        let start = Date.now()
        const users = await prisma.user.findMany({
            where: { userId: { in: uniqueUserIds } },
            select: {
                userId: true,
                fullName: true,
                mobileNumber: true,
                childInAchariya: true,
                childName: true,
                grade: true,
                campusId: true,
                bankAccountDetails: true,
                referralCode: true,
                confirmedReferralCount: true,
                yearFeeBenefitPercent: true,
                longTermBenefitPercent: true,
                lastActiveYear: true,
                isFiveStarMember: true,
                assignedCampus: true,
                studentFee: true,
                academicYear: true,
                createdAt: true,
                email: true,
                address: true,
                paymentAmount: true,
                paymentStatus: true,
                transactionId: true,
                aadharNo: true,
                childEprNo: true,
                empId: true,
                role: true,
                status: true,
                benefitStatus: true
            }
        })
        console.log(`1. Optimized prisma.user.findMany: ${Date.now() - start}ms (fetched ${users.length} users)`)

    } catch (error: any) {
        console.error('Error in selective profiling:', error)
    } finally {
        await prisma.$disconnect()
        console.log('--- Profiler Finished ---')
    }
}

runDiagnostic()
