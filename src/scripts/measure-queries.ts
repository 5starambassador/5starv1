import prisma from '../lib/prisma'

async function runDiagnostic() {
    console.log('--- Query Profiler Diagnostic ---')

    try {
        // Step A: ReferralLead userId findMany
        let start = Date.now()
        const refUsers = await prisma.referralLead.findMany({
            where: {
                leadStatus: { in: ['Confirmed', 'Admitted'] },
            },
            select: { userId: true },
            distinct: ['userId']
        })
        console.log(`1. Step A (ReferralLead.findMany): ${Date.now() - start}ms (found ${refUsers.length} users)`)

        const eligibleUserIds = Array.from(new Set(refUsers.map(r => r.userId)))

        // Step B: allLeads count/findMany
        start = Date.now()
        const allLeads = await prisma.referralLead.findMany({
            where: { 
                leadStatus: { in: ['Confirmed', 'Admitted'] },
                userId: { in: eligibleUserIds }
            },
            select: { userId: true },
            take: 50000,
            orderBy: { createdAt: 'desc' }
        })
        console.log(`2. Step B (ReferralLead.findMany with IN): ${Date.now() - start}ms (found ${allLeads.length} leads)`)

        // Slice to uniqueUserIds
        const uniqueUserIds = Array.from(new Set(allLeads.map(l => l.userId)))
        console.log(`Number of unique user IDs: ${uniqueUserIds.length}`)

        // Step C: Bulk Fetch User, Slabs, GradeFees, Campuses
        start = Date.now()
        const [users, slabs, gradeFees, allCampuses] = await Promise.all([
            prisma.user.findMany({ where: { userId: { in: uniqueUserIds } } }),
            prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } }),
            prisma.gradeFee.findMany({ where: { academicYear: '2026-2027' } }),
            prisma.campus.findMany({ select: { id: true, campusName: true } })
        ])
        console.log(`3. Step C (Bulk Fetch User, Slabs, Fees, Campuses): ${Date.now() - start}ms (fetched ${users.length} users)`)

        const userIds = users.map(u => u.userId)

        // Step D: Settlements and Referrals fetch
        start = Date.now()
        const [allSettlements, allReferrals] = await Promise.all([
            prisma.settlement.findMany({
                where: { userId: { in: userIds } }
            }),
            prisma.referralLead.findMany({
                where: {
                    userId: { in: userIds },
                    leadStatus: { in: ['Confirmed', 'Admitted'] }
                },
                include: {
                    student: {
                        select: { studentId: true, fullName: true, grade: true, campusId: true, annualFee: true, baseFee: true, createdAt: true, campus: { select: { campusName: true } } }
                    }
                }
            })
        ])
        console.log(`4. Step D (Settlements & Referrals findMany): ${Date.now() - start}ms (fetched ${allSettlements.length} settlements, ${allReferrals.length} referrals)`)

        // Surgical Student Fetch pool
        const studentIdsToFetch = new Set<number>()
        allReferrals.forEach((r: any) => { 
            if (r.student?.studentId) studentIdsToFetch.add(r.student.studentId) 
        })
        const childEprs = users.map(u => u.childEprNo?.trim()?.toUpperCase()).filter(Boolean) as string[]

        // Step E: Student fetch
        start = Date.now()
        const allStudents = await prisma.student.findMany({
            where: { 
                OR: [
                    { parentId: { in: userIds } },
                    { admissionNumber: { in: childEprs } },
                    { studentId: { in: Array.from(studentIdsToFetch) } }
                ],
                status: { in: ['Active', 'ACTIVE'] } as any 
            },
            include: { campus: { select: { id: true, campusName: true } }, parent: { select: { mobileNumber: true } } }
        })
        console.log(`5. Step E (Student.findMany with OR conditions): ${Date.now() - start}ms (fetched ${allStudents.length} students)`)

    } catch (error: any) {
        console.error('Error during query profiling:', error)
    } finally {
        await prisma.$disconnect()
        console.log('--- Profiler Finished ---')
    }
}

runDiagnostic()
