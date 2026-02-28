
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Starting Data Correction: 2026-202 -> 2026-2027 ---')

        // 1. Fix ReferralLeads
        const malformedLeads = await prisma.referralLead.findMany({
            where: { admittedYear: '2026-202' }
        })
        console.log(`Found ${malformedLeads.length} leads with malformed admittedYear.`)

        for (const lead of malformedLeads) {
            await prisma.referralLead.update({
                where: { leadId: lead.leadId },
                data: { admittedYear: '2026-2027' }
            })
            console.log(`  - Updated LeadID: ${lead.leadId}`)
        }

        // 2. Fix Students
        const malformedStudents = await prisma.student.findMany({
            where: { academicYear: '2026-202' }
        })
        console.log(`Found ${malformedStudents.length} students with malformed academicYear.`)

        for (const student of malformedStudents) {
            await prisma.student.update({
                where: { studentId: student.studentId },
                data: { academicYear: '2026-2027' }
            })
            console.log(`  - Updated StudentID: ${student.studentId}`)
        }

        console.log('--- Correction Finished ---')

    } catch (err) {
        console.error('Correction failed:', err)
    }
}

main().finally(() => prisma.$disconnect())
