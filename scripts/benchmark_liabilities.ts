import prisma from '../src/lib/prisma'
import { calculateTotalBenefit } from '../src/lib/benefit-calculator'
import { getSpecialBonusRate } from '../src/lib/reward-constants'

async function benchmark() {
    console.log('--- STARTING BASELINE BENCHMARK (Standalone Logic) ---')
    const start = Date.now()
    
    try {
        const academicYear = '2026-2027'
        const query = undefined

        // 1. Fetch data
        console.log('Fetching initial data (users, slabs, etc.)...')
        const [users, slabs, gradeFees, allCampuses] = await Promise.all([
            prisma.user.findMany({
                where: {
                    OR: [
                        {
                            referrals: {
                                some: {
                                    leadStatus: { in: ['Confirmed', 'Admitted'] } as any,
                                    academicYear: academicYear
                                }
                            }
                        },
                        { childInAchariya: true }
                    ]
                },
                include: {
                    settlements: true,
                    students: {
                        where: { status: { in: ['Active', 'ACTIVE'] } as any },
                    },
                    referrals: {
                        where: {
                            leadStatus: { in: ['Confirmed', 'Admitted'] },
                            academicYear: academicYear
                        },
                        include: { student: true }
                    }
                }
            }),
            prisma.benefitSlab.findMany({
                orderBy: { referralCount: 'asc' }
            }),
            prisma.gradeFee.findMany({
                where: { academicYear: academicYear }
            }),
            prisma.campus.findMany({ select: { id: true, campusName: true } })
        ])

        console.log(`Fetched ${users.length} users.`)
        
        // HUGE BOTTLENECK: Fetching all active students
        console.log('Fetching ALL active students (the bottleneck)...')
        const allStudents = await prisma.student.findMany({
            where: { status: { in: ['Active', 'ACTIVE'] } as any },
            include: { campus: { select: { campusName: true } }, parent: { select: { mobileNumber: true } } }
        })
        console.log(`Fetched ${allStudents.length} students.`)

        const campusMap = new Map<number, string>(allCampuses.map(c => [c.id, c.campusName]))
        const eprMap = new Map()
        const mobileMap = new Map()
        const gradeFeeMap = new Map()

        allStudents.forEach(s => {
            if (s.admissionNumber) eprMap.set(s.admissionNumber.toUpperCase(), s)
            if (s.parent?.mobileNumber) {
                if (!mobileMap.has(s.parent.mobileNumber)) mobileMap.set(s.parent.mobileNumber, [])
                mobileMap.get(s.parent.mobileNumber).push(s)
            }
        })

        const normalizeGrade = (g: string) => {
            if (!g) return 'GRADE1'
            let n = g.toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
            return n
        }

        gradeFees.forEach(gf => {
            const fee = gf.annualFee_otp || gf.annualFee_wotp || 0
            if (fee > 0) {
                const key = gf.campusId + '-' + normalizeGrade(gf.grade)
                gradeFeeMap.set(key, fee)
            }
        })

        // Just run through the users to simulate the load
        console.log('Processing users and calculating benefits...')
        let count = 0
        for (const u of (users as any[])) {
            // Minimal simulation of lookups
            let linkedStudent = undefined
            if (u.childInAchariya) {
                if (u.childEprNo) linkedStudent = eprMap.get(u.childEprNo.trim().toUpperCase())
                if (!linkedStudent && u.students?.[0]) linkedStudent = u.students[0]
            }
            count++
        }

        const end = Date.now()
        const duration = (end - start) / 1000
        console.log(`\nBASELINE EXECUTION COMPLETE`)
        console.log(`Total Time: ${duration.toFixed(2)} seconds`)
        
    } catch (err: any) {
        console.error('CRITICAL ERROR:', err.message)
    }
}

benchmark()
    .then(() => process.exit(0))
    .catch(console.error)
