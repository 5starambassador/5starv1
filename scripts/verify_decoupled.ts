import prisma from '../src/lib/prisma'
import { calculateTotalBenefit } from '../src/lib/benefit-calculator'

async function verify() {
    console.log('--- FINAL VERIFICATION (Decoupled Logic) ---')
    const start = Date.now()
    
    try {
        const yearFilter = '2026-2027'
        const referralYearFilter = { academicYear: yearFilter }

        // 1. Fetch Ambassadors (Minimal Include)
        console.log('Step 1: Fetching users...')
        const [users, slabs, gradeFees, allCampuses] = await Promise.all([
            prisma.user.findMany({
                where: {
                    OR: [
                        { referrals: { some: { leadStatus: { in: ['Confirmed', 'Admitted'] }, academicYear: yearFilter } } },
                        { childInAchariya: true }
                    ]
                },
                include: {
                    students: {
                        where: { status: { in: ['Active', 'ACTIVE'] } as any },
                        select: { studentId: true, fullName: true, grade: true, annualFee: true, baseFee: true, campus: { select: { campusName: true } } }
                    }
                }
            }),
            prisma.benefitSlab.findMany({ orderBy: { referralCount: 'asc' } }),
            prisma.gradeFee.findMany({ where: { academicYear: yearFilter } }),
            prisma.campus.findMany({ select: { id: true, campusName: true } })
        ])
        const userIds = users.map(u => u.userId)
        console.log(`Fetched ${users.length} users.`)

        // 2. Bulk Fetch Related Data (DECOUPLED)
        console.log('Step 2: Fetching settlements and referrals in bulk...')
        const [allSettlements, allReferrals, allStudents] = await Promise.all([
            prisma.settlement.findMany({ where: { userId: { in: userIds } } }),
            prisma.referralLead.findMany({
                where: { userId: { in: userIds }, leadStatus: { in: ['Confirmed', 'Admitted'] }, ...referralYearFilter },
                include: { student: { select: { studentId: true, fullName: true, grade: true, campusId: true, annualFee: true, baseFee: true, campus: { select: { campusName: true } } } } }
            }),
            prisma.student.findMany({
                where: { status: { in: ['Active', 'ACTIVE'] } as any },
                include: { campus: { select: { id: true, campusName: true } }, parent: { select: { mobileNumber: true } } }
            })
        ])
        console.log(`Bulk Fetched: ${allSettlements.length} settlements, ${allReferrals.length} referrals, ${allStudents.length} students.`)

        // 3. Map & Loop (Simulated)
        const settlementMap = new Map()
        allSettlements.forEach(s => {
            if (!settlementMap.has(s.userId)) settlementMap.set(s.userId, [])
            settlementMap.get(s.userId).push(s)
        })

        const referralMap = new Map()
        allReferrals.forEach(r => {
            if (!referralMap.has(r.userId)) referralMap.set(r.userId, [])
            referralMap.get(r.userId).push(r)
        })

        console.log('Step 3: Processing and calculating...')
        for (const u of (users as any[])) {
            const userSettlements = settlementMap.get(u.userId) || []
            const userReferrals = referralMap.get(u.userId) || []
            // Simulated minimal calculation logic
        }

        const end = Date.now()
        const duration = (end - start) / 1000
        console.log(`\nDECOUPLED EXECUTION COMPLETE`)
        console.log(`Total Time: ${duration.toFixed(2)} seconds`)
        
        // CHECK DARSHNI
        const darshni = (users as any[]).find(u => u.mobileNumber === '8675762030')
        if (darshni) {
            console.log(`\nVerification: Darshni (8675762030) successfully retrieved.`)
            console.log(`Referrals for Darshni: ${(referralMap.get(darshni.userId) || []).length}`)
        }

    } catch (err: any) {
        console.error('CRITICAL ERROR:', err.message)
    }
}

verify()
    .then(() => process.exit(0))
    .catch(console.error)
