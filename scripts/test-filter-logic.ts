
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { mobileNumber: '9551031245' },
            include: {
                students: { select: { studentId: true } },
                referrals: {
                    where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
                    include: { student: { select: { studentId: true } } }
                }
            }
        })

        if (!user) {
            console.log('User not found')
            return
        }

        const ownStudentIds = user.students.map((s: any) => s.studentId)
        const normalizedOwnChild = user.childName?.trim().toUpperCase()

        console.log(`Ambassador: ${user.fullName}`)
        console.log(`Mobile: ${user.mobileNumber}`)
        console.log(`Own Child Name (DB): ${user.childName}`)
        console.log(`Own Student IDs:`, ownStudentIds)
        console.log(`Total Referrals (DB): ${user.referrals.length}`)

        const filtered = user.referrals.filter((r: any) => {
            // 🚨 SENIOR AUDIT GUARD: Exclude Self-Referrals (Own Children)
            // 1. Check if parent mobile in referral matches ambassador's mobile
            if (r.parentMobile === user.mobileNumber) return false

            // 2. Check if the referred student is already linked to the ambassador
            if (r.student?.studentId && ownStudentIds.includes(r.student.studentId)) return false

            // 3. Check if referred student name matches one of ambassador's children (Fuzzy)
            if (normalizedOwnChild && r.studentName?.trim().toUpperCase() === normalizedOwnChild) return false

            return true
        })

        console.log(`Filtered Referrals (after excluding self): ${filtered.length}`)

        if (filtered.length === 0) {
            console.log('SUCCESS: All self-referrals filtered out.')
        } else {
            console.log('FAIL: Some referrals remains - check if they are external.')
            filtered.forEach(f => console.log(`  - Student: ${f.studentName} | ParentMobile: ${f.parentMobile}`))
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
