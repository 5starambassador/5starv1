
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mimic the fuzzy logic and filtering used in the fixed server actions
async function verifyAmbassadors() {
    const year = "2026-2027"
    console.log(`--- Verifying Screenshot Ambassadors for ${year} ---`)

    const targets = [
        { name: "Lochana", code: "ACH26-P00096" },
        { name: "Ramya", code: "ACH26-P00109" },
        { name: "Kavya Devi M", code: "ACH26-S00401" },
        { name: "Krithika", code: "ACH26-P00056" },
        { name: "MS.Ranjani", code: "ACH25-P00053" }, // Matching MS.Ranjani part
        { name: "Abinaya Bhasker", code: "ACH26-P00094" }
    ]

    const allStudents = await prisma.student.findMany({ where: { status: 'Active' }, include: { campus: true } })
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

    for (const target of targets) {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { fullName: { contains: target.name, mode: 'insensitive' } },
                    { referralCode: target.code }
                ]
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
                }
            }
        })

        if (!user) {
            console.log(`[NOT FOUND] ${target.name} (${target.code})`)
            continue
        }

        // Check if visible in query logic
        const hasActiveReferrals = user.referrals.length > 0

        let linkedStudent = user.students[0]
        if (!linkedStudent && user.childName) {
            linkedStudent = allStudents.find(s => s.fullName.toUpperCase() === user.childName?.toUpperCase())
        }

        const isGroupA = user.role === 'Parent' || (user.role === 'Staff' && user.childInAchariya)
        const feeBase = isGroupA ? (linkedStudent?.annualFee || 60000) : grade1FeeMap.get(user.campusId || 0)

        const status = hasActiveReferrals && feeBase > 0 ? "PASS" : "FAIL"
        const group = isGroupA ? "Group A (Waiver)" : "Group B (Payout)"

        console.log(`[${status}] ${user.fullName} | Group: ${group} | Referrals: ${user.referrals.length} | Link: ${linkedStudent?.fullName || 'NONE'} | Fee: ${feeBase}`)
        if (status === "FAIL") {
            if (!hasActiveReferrals) console.log(`   - Reason: No confirmed referrals found for ${year} in DB.`)
            if (feeBase <= 0) console.log(`   - Reason: Fee base is 0 (Missing Grade-1 fee for campus or child link for Group A).`)
        }
    }
}

verifyAmbassadors().finally(() => prisma.$disconnect())
