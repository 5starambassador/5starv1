
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        // Mocking the context for Aswini J
        const u = await prisma.user.findFirst({
            where: { mobileNumber: '9551031245' },
            include: {
                students: { select: { studentId: true } },
                referrals: {
                    where: { leadStatus: { in: ['Confirmed', 'Admitted'] } },
                    include: { student: { select: { studentId: true } } }
                }
            }
        })

        if (!u) {
            console.log('User not found')
            return
        }

        // --- Logic from finance-actions.ts ---
        const allStudents = await prisma.student.findMany({
            where: { status: 'Active' },
            include: { campus: { select: { campusName: true } }, parent: { select: { mobileNumber: true } } }
        })
        const mobileMap = new Map()
        allStudents.forEach(s => {
            if (s.parent?.mobileNumber) {
                if (!mobileMap.has(s.parent.mobileNumber)) mobileMap.set(s.parent.mobileNumber, [])
                mobileMap.get(s.parent.mobileNumber).push(s)
            }
        })

        let linkedStudent = undefined
        if (u.mobileNumber) {
            const mobileMatches = mobileMap.get(u.mobileNumber)
            if (mobileMatches && mobileMatches.length > 0) {
                linkedStudent = mobileMatches[0]
            }
        }

        let childName = linkedStudent?.fullName

        const ownStudentIds = (u.students || []).map((s: any) => s.studentId)
        if (linkedStudent) ownStudentIds.push(linkedStudent.studentId)

        const normalizedOwnChild = childName?.trim().toUpperCase() || u.childName?.trim().toUpperCase()

        console.log(`Ambassador: ${u.fullName}`)
        console.log(`Identified Child: ${childName}`)
        console.log(`Own Student IDs:`, ownStudentIds)
        console.log(`Total Referrals: ${u.referrals.length}`)

        const filtered = u.referrals.filter((r: any) => {
            // 🚨 SENIOR AUDIT GUARD: Exclude Self-Referrals (Own Children)
            // 1. Mobile Match
            if (r.parentMobile === u.mobileNumber) return false

            // 2. Student ID Match
            if (r.student?.studentId && ownStudentIds.includes(r.student.studentId)) return false

            // 3. Name Match (Fuzzy)
            if (normalizedOwnChild && r.studentName?.trim().toUpperCase() === normalizedOwnChild) return false

            // 4. ERP Match
            if (r.admissionNumber && u.childEprNo && r.admissionNumber.trim().toUpperCase() === u.childEprNo.trim().toUpperCase()) return false

            return true
        })

        console.log(`Filtered Referrals: ${filtered.length}`)

        if (filtered.length === 0) {
            console.log('SUCCESS: Self-referral for Saivik C was correctly excluded.')
        } else {
            console.log('FAIL: Self-referral still remains!')
            filtered.forEach(f => console.log(`  - Student: ${f.studentName}`))
        }

    } catch (err) {
        console.error(err)
    }
}

main().finally(() => prisma.$disconnect())
