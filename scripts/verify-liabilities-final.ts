
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Final Liability Verification: ${year} ---`)

        // This mimics the NEW logic in finance-actions.ts
        const users = await prisma.user.findMany({
            where: {
                referrals: {
                    some: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        OR: [
                            { admittedYear: year },
                            { academicYear: year }
                        ]
                    }
                }
            },
            include: {
                students: { where: { status: 'Active' }, include: { campus: true } },
                referrals: {
                    where: {
                        leadStatus: { in: ['Confirmed', 'Admitted'] },
                        OR: [
                            { admittedYear: year },
                            { academicYear: year }
                        ]
                    }
                },
                settlements: true
            }
        })

        const allStudents = await prisma.student.findMany({
            where: { status: 'Active' },
            include: { campus: true }
        })
        const gradeFees = await prisma.gradeFee.findMany({
            where: {
                grade: { in: ['Grade - 1', 'Grade-1', 'Grade 1', 'Mont - 1', 'Mont-1', 'Mont 1', 'Montessori - 1'] },
                academicYear: year
            }
        })

        const grade1FeeMap = new Map()
        gradeFees.forEach(gf => {
            const fee = gf.annualFee_wotp || gf.annualFee_otp || 0
            if (!grade1FeeMap.has(gf.campusId) || fee > 0) grade1FeeMap.set(gf.campusId, fee)
        })

        const targets = ["Lochana", "Kavya Devi M"]

        for (const name of targets) {
            const u = users.find(u => u.fullName.includes(name))
            if (!u) {
                console.log(`[FAIL] ${name} not found in query`)
                continue
            }

            // Logic Simulation
            let linkedStudent: any = u.students[0]
            if (!linkedStudent && u.childName) {
                linkedStudent = allStudents.find(s => s.fullName.toUpperCase() === u.childName?.toUpperCase())
            }

            const isGroupA = u.role === 'Parent' || (u.role === 'Staff' && u.childInAchariya)
            const fee = isGroupA ? (linkedStudent?.annualFee || 60000) : grade1FeeMap.get(u.campusId || 120)

            console.log(`[PASS] ${name} found. Group: ${isGroupA ? 'A' : 'B'} | Linked Student: ${linkedStudent?.fullName || 'NONE'} | Fee Base: ${fee}`)

            if (isGroupA && !linkedStudent) {
                console.log(`  - [ALERT] ${name} still has no linked student (Group A requires this for non-zero)`)
            } else if (!isGroupA && !fee) {
                console.log(`  - [ALERT] ${name} still has no campus fee base (Group B requires this for non-zero)`)
            } else {
                console.log(`  - [SUCCESS] ${name} will now have non-zero earnings!`)
            }
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
