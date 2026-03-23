import prisma from '../src/lib/prisma'

async function benchmark() {
    console.log('--- STARTING OPTIMIZED BENCHMARK (Targeted Logic) ---')
    const start = Date.now()
    
    try {
        const academicYear = '2026-2027'

        // 1. Fetch initial data
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
                    referrals: {
                        where: {
                            leadStatus: { in: ['Confirmed', 'Admitted'] },
                            academicYear: academicYear
                        }
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
        
        // 2. TARGETED STUDENT FETCH (The Fix)
        console.log('Running TARGETED student fetch...')
        const userMobiles = users.map(u => u.mobileNumber).filter(Boolean) as string[]
        const childEprs = users.map(u => u.childEprNo?.trim()?.toUpperCase()).filter(Boolean) as string[]
        const userIds = users.map(u => u.userId)
        const referralStudentIds = (users as any[]).flatMap(u => (u.referrals || []).map((r: any) => r.studentId)).filter(Boolean)
        const childNames = users.map(u => u.childName?.trim()?.toUpperCase()).filter(Boolean) as string[]

        const allStudents = await prisma.student.findMany({
            where: {
                OR: [
                    { admissionNumber: { in: childEprs } },
                    { parent: { mobileNumber: { in: userMobiles } } },
                    { parentId: { in: userIds } },
                    { studentId: { in: referralStudentIds } },
                    { fullName: { in: childNames } } 
                ],
                status: { in: ['Active', 'ACTIVE'] } as any
            },
            include: { 
                campus: { select: { id: true, campusName: true } }, 
                parent: { select: { mobileNumber: true } } 
            }
        })
        console.log(`Fetched only ${allStudents.length} relevant students (compared to 4668 in baseline).`)

        const eprMap = new Map()
        const mobileMap = new Map()

        allStudents.forEach(s => {
            if (s.admissionNumber) eprMap.set(s.admissionNumber.toUpperCase(), s)
            if (s.parent?.mobileNumber) {
                if (!mobileMap.has(s.parent.mobileNumber)) mobileMap.set(s.parent.mobileNumber, [])
                mobileMap.get(s.parent.mobileNumber).push(s)
            }
        })

        // Simulated processing
        let count = 0
        for (const u of (users as any[])) {
            let linkedStudent = undefined
            if (u.childInAchariya) {
                if (u.childEprNo) linkedStudent = eprMap.get(u.childEprNo.trim().toUpperCase())
            }
            count++
        }

        const end = Date.now()
        const duration = (end - start) / 1000
        console.log(`\nOPTIMIZED EXECUTION COMPLETE`)
        console.log(`Total Time: ${duration.toFixed(2)} seconds`)
        
    } catch (err: any) {
        console.error('CRITICAL ERROR:', err.message)
    }
}

benchmark()
    .then(() => process.exit(0))
    .catch(console.error)
