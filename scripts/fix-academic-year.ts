
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DATA FIX: ACADEMIC YEAR ---')

    // 1. Fix ReferralLead Mismatches
    const leadsToFix = await prisma.referralLead.findMany({
        where: {
            admittedYear: { not: null }
        }
    })

    let leadFixCount = 0
    for (const lead of leadsToFix) {
        if (lead.admittedYear && lead.admittedYear !== lead.academicYear) {
            await prisma.referralLead.update({
                where: { leadId: lead.leadId },
                data: { academicYear: lead.admittedYear }
            })
            leadFixCount++
        }
    }
    console.log(`Updated ${leadFixCount} ReferralLead records to sync academicYear with admittedYear.`)

    // 2. Fix Anomalous Students
    const anomalousIds = [9722, 9723, 9724, 9725, 9726, 9727]
    const studentResult = await prisma.student.updateMany({
        where: {
            studentId: { in: anomalousIds }
        },
        data: {
            academicYear: '2026-2027'
        }
    })
    console.log(`Updated ${studentResult.count} anomalous student records to '2026-2027'.`)

    console.log('--- FIX COMPLETE ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
