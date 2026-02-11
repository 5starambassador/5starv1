const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Starting reconciliation of fee discrepancies...')

    const students = await prisma.student.findMany({
        where: {
            referralLeadId: { not: null }
        },
        include: {
            referralLead: true
        }
    })

    console.log(`Analyzing ${students.length} students with linked leads.`)

    let updated = 0
    for (const student of students) {
        const lead = student.referralLead
        if (!lead) continue

        // The user said: Referral is N/A (annualFee is 0 or null), but Student shows 60000.
        // If lead.annualFee is null/undefined, and student.baseFee is 60000 (or anything else), sync it to 0.

        const leadFee = lead.annualFee || 0
        const studentEffectiveFee = student.annualFee ?? student.baseFee ?? 0

        if (leadFee === 0 && studentEffectiveFee === 60000) {
            console.log(`Fixing student ${student.studentId} (${student.fullName}): Lead is N/A, Student was ${studentEffectiveFee}`)
            await prisma.student.update({
                where: { studentId: student.studentId },
                data: {
                    annualFee: null,
                    baseFee: 0
                }
            })
            updated++
        }
    }

    console.log(`Finished reconciliation. Updated ${updated} students.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
